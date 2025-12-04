import { defineStore } from 'pinia'
import { convertFileSrc } from '@tauri-apps/api/core'
import { appDataDir, join, resourceDir } from '@tauri-apps/api/path'
import { BaseDirectory, exists, writeFile } from '@tauri-apps/plugin-fs'
import pLimit from 'p-limit'
import { StoresEnum } from '@/enums'
import type { EmojiItem } from '@/services/types'
import { useUserStore } from '@/stores/user'
import * as imRequestUtils from '@/utils/ImRequestUtils'
import { detectRemoteFileType, getUserEmojiDir } from '@/utils/PathUtil'
import { md5FromString } from '@/utils/Md5Util'
import { isMobile } from '@/utils/PlatformConstants'

export const useEmojiStore = defineStore(StoresEnum.EMOJI, () => {
  const isLoading = ref(false) // 是否正在加载
  const isPrefetching = ref(false)
  const userStore = useUserStore()
  const emojiList = ref<EmojiItem[]>([])
  const currentEmojiOwnerUid = ref<string | null>(null)
  let emojiWorker: Worker | null = null

  const resetEmojiState = () => {
    emojiList.value = []
    isLoading.value = false
    isPrefetching.value = false
    if (emojiWorker) {
      emojiWorker.terminate()
      emojiWorker = null
    }
  }

  watch(
    () => userStore.userInfo?.uid ?? null,
    (latestUid) => {
      if (currentEmojiOwnerUid.value === latestUid) return
      currentEmojiOwnerUid.value = latestUid
      resetEmojiState()
    },
    { immediate: true }
  )

  const getEmojiWorker = () => {
    if (typeof Worker === 'undefined') {
      return null
    }
    if (!emojiWorker) {
      emojiWorker = new Worker(new URL('../workers/imageDownloader.ts', import.meta.url), { type: 'module' })
    }
    return emojiWorker
  }

  const downloadEmoji = async (url: string) => {
    const worker = getEmojiWorker()
    if (!worker) {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`下载表情失败: ${response.status} ${response.statusText}`)
      }
      return new Uint8Array(await response.arrayBuffer())
    }

    return await new Promise<Uint8Array>((resolve, reject) => {
      const handleMessage = (event: MessageEvent<any>) => {
        const data = event.data
        if (!data || data.url !== url) return
        cleanup()
        if (data.success && data.buffer) {
          resolve(new Uint8Array(data.buffer))
        } else {
          reject(new Error(data.error || '下载表情失败'))
        }
      }
      const handleError = (event: ErrorEvent) => {
        cleanup()
        reject(new Error(event.message))
      }
      const cleanup = () => {
        worker.removeEventListener('message', handleMessage)
        worker.removeEventListener('error', handleError)
      }
      worker.addEventListener('message', handleMessage)
      worker.addEventListener('error', handleError)
      worker.postMessage({ url })
    })
  }

  const resolveEmojiExt = async (url: string) => {
    try {
      const info = await detectRemoteFileType({ url, fileSize: 1 })
      if (info?.ext) return info.ext
    } catch (error) {
      console.warn('[emoji] 识别表情类型失败:', error)
    }
    const match = url.match(/\\.([a-zA-Z0-9]+)(?:\\?|$)/)
    return match?.[1] || 'png'
  }

  const buildFileName = async (url: string) => {
    const hash = await md5FromString(url)
    const ext = await resolveEmojiExt(url)
    return `${hash}.${ext}`
  }

  const ensureEmojiCached = async (emoji: EmojiItem, emojiDir: string, baseDir: BaseDirectory, baseDirPath: string) => {
    const fileName = await buildFileName(emoji.expressionUrl)
    const relativePath = await join(emojiDir, fileName)
    const absolutePath = await join(baseDirPath, relativePath)
    const hasFile = await exists(relativePath, { baseDir })
    // 如果本地文件不存在，先移除失效的本地链接，后续使用服务器URL渲染
    if (!hasFile && emoji.localUrl) {
      setLocalUrl(emoji.id, null)
    }
    if (!hasFile) {
      const bytes = await downloadEmoji(emoji.expressionUrl)
      await writeFile(relativePath, bytes, { baseDir })
    }
    const localUrl = convertFileSrc(absolutePath)
    setLocalUrl(emoji.id, localUrl)
    return localUrl
  }

  const prefetchEmojiToLocal = async (concurrency = 4) => {
    if (isPrefetching.value) return
    const { uid } = userStore.userInfo || {}
    if (!uid || emojiList.value.length === 0) return
    isPrefetching.value = true
    try {
      const emojiDir = await getUserEmojiDir(uid)
      const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource
      const baseDirPath = isMobile() ? await appDataDir() : await resourceDir()
      const limit = pLimit(concurrency)

      await Promise.allSettled(
        emojiList.value.map((emoji) =>
          limit(() =>
            ensureEmojiCached(emoji, emojiDir, baseDir, baseDirPath).catch((error) => {
              console.error('[emoji] 缓存失败:', emoji.expressionUrl, error)
            })
          )
        )
      )
    } finally {
      isPrefetching.value = false
    }
  }

  const initEmojis = async () => {
    await getEmojiList()
    await prefetchEmojiToLocal()
  }

  /**
   * 获取我的全部表情
   */
  const getEmojiList = async () => {
    isLoading.value = true
    const requestUid = userStore.userInfo?.uid ?? null
    if (!requestUid) {
      emojiList.value = []
      isLoading.value = false
      return
    }
    const localUrlCache = emojiList.value.reduce<Record<string, string>>((acc, item) => {
      if (item.localUrl) {
        acc[item.id] = item.localUrl
      }
      return acc
    }, {})
    const res = await imRequestUtils.getEmoji().catch(() => {
      isLoading.value = false
    })
    if (res && requestUid === currentEmojiOwnerUid.value) {
      emojiList.value = res.map((item: { id: string | number }) => {
        const localUrl = localUrlCache[item.id]
        return localUrl ? { ...item, localUrl } : item
      })
    }
    isLoading.value = false
    if (requestUid !== currentEmojiOwnerUid.value) {
      // 期间用户已切换，丢弃旧账号的表情数据
      return
    }
  }

  /**
   * 添加表情
   */
  const addEmoji = async (emojiUrl: string) => {
    const { uid } = userStore.userInfo!
    if (!uid || !emojiUrl) return
    imRequestUtils.addEmoji({ expressionUrl: emojiUrl }).then((res) => {
      if (res) {
        window.$message.success('添加表情成功')
      }
    })
    await getEmojiList()
  }

  /**
   * 删除表情
   */
  const deleteEmoji = async (id: string) => {
    if (!id) return
    await imRequestUtils.deleteEmoji({ id })
    await getEmojiList()
  }

  /**
   * 记录表情对应的本地缓存地址
   */
  const setLocalUrl = (id: string, localUrl: string | null | undefined) => {
    if (!id) return
    const index = emojiList.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      if (!localUrl) {
        const { localUrl: _omit, ...rest } = emojiList.value[index]
        emojiList.value[index] = rest as EmojiItem
      } else {
        emojiList.value[index] = { ...emojiList.value[index], localUrl }
      }
    }
  }

  return {
    emojiList,
    addEmoji,
    getEmojiList,
    deleteEmoji,
    setLocalUrl,
    isLoading,
    initEmojis,
    prefetchEmojiToLocal
  }
})
