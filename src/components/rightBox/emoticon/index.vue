<template>
  <n-scrollbar
    ref="panelScrollbarRef"
    style="max-height: 290px"
    :class="[isMobile() ? 'h-15rem w-auto' : 'h-290px w-460px']"
    class="p-[14px_14px_0_14px] box-border select-none"
    @scroll="handlePanelScroll">
    <transition name="fade" mode="out-in">
      <div :key="activeIndex" class="emoji-content">
        <!-- 最近使用 -->
        <div v-if="activeIndex === 0">
          <div v-if="emojiRef.historyList?.length > 0">
            <span v-if="!checkIsUrl(emojiRef.historyList[0])" class="text-12px text-[--text-color]">
              {{ t('emoticon.recent.title') }}
            </span>
            <n-flex align="center" :class="isMobile() ? 'emoji-grid-mobile mt-12px mb-12px' : 'mt-12px mb-12px'">
              <n-flex
                align="center"
                justify="center"
                class="emoji-item"
                v-for="(item, index) in [...new Set(emojiRef.historyList)].filter((emoji) => !checkIsUrl(emoji))"
                :key="index"
                @click.stop="chooseEmoji(item)">
                {{ item }}
              </n-flex>
            </n-flex>
          </div>

          <!-- emoji表情 -->
          <div v-for="items in emojiObj" :key="items?.name">
            <template v-if="items?.name && items.value?.length">
              <span class="text-12px text-[--text-color]">{{ items.name }}</span>
              <n-flex align="center" :class="isMobile() ? 'emoji-grid-mobile my-12px' : 'my-12px'">
                <n-flex
                  align="center"
                  justify="center"
                  class="emoji-item"
                  v-for="(item, index) in items.value"
                  :key="index"
                  @click.stop="chooseEmoji(item)">
                  {{ item }}
                </n-flex>
              </n-flex>
            </template>
          </div>
        </div>

        <!-- 表情包系列 -->
        <div v-else-if="currentSeries" class="series-virtual-wrapper">
          <span class="text-12px text-[--text-color]">{{ currentSeries.name }}</span>
          <div class="mt-12px flex flex-col gap-2">
            <div
              class="emoji-pack-row"
              v-for="row in displaySeriesRows"
              :key="row.key"
              :style="{
                gridTemplateColumns: `repeat(${packColumns}, 1fr)`,
                gap: isMobile() ? '8px' : '12px'
              }">
              <div
                class="emoji-item emoji-item--image"
                v-for="(emojiItem, index) in row.emojis"
                :key="index"
                @click.stop="
                  chooseEmoji(
                    {
                      renderUrl: emojiItem.url,
                      serverUrl: emojiItem.url
                    },
                    'url'
                  )
                ">
                <img
                  :alt="emojiItem.name"
                  :title="emojiItem.name"
                  :src="emojiItem.url"
                  loading="lazy"
                  decoding="async"
                  class="emoji-image size-full object-contain rounded-8px transition duration-300 ease-in-out transform-gpu" />
              </div>
            </div>
          </div>
        </div>

        <!-- 我的喜欢页面 -->
        <div v-else>
          <div v-if="emojiStore.emojiList?.length > 0">
            <span class="text-12px text-[--text-color]">{{ t('emoticon.favorites.title') }}</span>
            <n-flex align="center" :class="isMobile() ? 'emoji-pack-grid-mobile mx-6px my-12px' : 'mx-6px my-12px'">
              <n-flex
                align="center"
                justify="center"
                class="emoji-item emoji-item--image py-4px"
                v-for="(item, index) in displayFavoriteEmojis"
                :key="index"
                @click.stop="
                  chooseEmoji(
                    {
                      id: item.id,
                      renderUrl: getEmojiRenderUrl(item),
                      serverUrl: item.expressionUrl
                    },
                    'url'
                  )
                ">
                <n-popover
                  trigger="manual"
                  :show="activeMenuId === item.id"
                  :duration="300"
                  :show-arrow="false"
                  placement="top"
                  @clickoutside="activeMenuId = ''">
                  <template #trigger>
                    <div
                      class="emoji-visibility-wrapper size-full"
                      :ref="(el: any) => registerEmojiVisibilityTarget(el, item)">
                      <n-image
                        width="60"
                        height="60"
                        preview-disabled
                        :src="getEmojiRenderUrl(item)"
                        @contextmenu.prevent="handleContextMenu($event, item)"
                        class="emoji-image size-full object-contain rounded-8px transition duration-300 ease-in-out transform-gpu" />
                    </div>
                  </template>
                  <n-button quaternary size="tiny" @click.stop="deleteMyEmoji(item.id)">
                    {{ t('emoticon.favorites.delete') }}
                    <template #icon>
                      <n-icon>
                        <svg><use href="#delete"></use></svg>
                      </n-icon>
                    </template>
                  </n-button>
                </n-popover>
              </n-flex>
            </n-flex>
          </div>
          <span v-else>{{ t('emoticon.favorites.empty') }}</span>
        </div>
      </div>
    </transition>
  </n-scrollbar>

  <!-- 底部选项 -->
  <n-flex align="center" class="expression-item">
    <n-scrollbar x-scrollable class="scrollbar-container">
      <div class="series-container">
        <template v-for="item in tabList" :key="item.id">
          <!-- 图标类型选项 -->
          <svg
            class="series-icon"
            v-if="item.type === 'icon'"
            :class="{ active: activeIndex === item.id }"
            @click="handleTabChange(item.id)">
            <use :href="item.icon"></use>
          </svg>

          <!-- 系列类型选项 -->
          <div
            v-else
            :class="{ active: activeIndex === item.id }"
            @click="selectSeries(item.id - 1)"
            class="series-icon">
            <img :title="item.name" :src="item.cover" class="w-full h-full object-contain" />
          </div>
        </template>
      </div>
    </n-scrollbar>
  </n-flex>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { convertFileSrc } from '@tauri-apps/api/core'
import { appDataDir, join, resourceDir } from '@tauri-apps/api/path'
import { BaseDirectory, exists, writeFile } from '@tauri-apps/plugin-fs'
import HulaEmojis from 'hula-emojis'
import type { ScrollbarInst } from 'naive-ui'
import pLimit from 'p-limit'
import type { EmojiItem as EmojiListItem } from '@/services/types'
import { useIntersectionTaskQueue } from '@/hooks/useIntersectionTaskQueue'
import { useEmojiStore } from '@/stores/emoji'
import { useHistoryStore } from '@/stores/history.ts'
import { useUserStore } from '@/stores/user'
import { getAllTypeEmojis } from '@/utils/Emoji.ts'
import { md5FromString } from '@/utils/Md5Util'
import { detectRemoteFileType, getUserEmojiDir } from '@/utils/PathUtil'
import { isMobile } from '@/utils/PlatformConstants'
import { useI18n } from 'vue-i18n'

type TabItem = {
  id: number
  type: 'icon' | 'series'
  name: string
  icon?: string
  cover?: string
}

interface EmojiGroupItem {
  name: string
  value: any[]
}

type EmojiType = {
  expressionEmojis: EmojiGroupItem
  animalEmojis: EmojiGroupItem
  gestureEmojis: EmojiGroupItem
}

type EmojiCacheEnvironment = {
  uid: string
  emojiDir: string
  baseDir: BaseDirectory
  baseDirPath: string
}

const emit = defineEmits(['emojiHandle'])
const props = defineProps<{
  all: boolean
}>()
const { emoji, setEmoji, lastEmojiTabIndex, setLastEmojiTabIndex } = useHistoryStore()
const emojiStore = useEmojiStore()
const userStore = useUserStore()
const { t } = useI18n()
/** 获取米游社的表情包 */
const emojisBbs = HulaEmojis.MihoyoBbs
const activeIndex = ref(lastEmojiTabIndex)
const isFavoritesView = computed(() => activeIndex.value === -1)
const panelScrollbarRef = ref<ScrollbarInst | null>(null)
// 设置当前右键点击的表情项ID
const activeMenuId = ref('')
const emojiLocalPathMap = ref<Record<string, string>>({})
// 仅在元素可见时调度本地缓存，阈值随端变化
const {
  observe: observeEmojiVisibility,
  unobserve: unobserveEmojiVisibility,
  disconnect: disconnectEmojiObserver
} = useIntersectionTaskQueue({
  threshold: isMobile() ? 0.2 : 0.35,
  rootMargin: isMobile() ? '24px 0px 24px' : '40px 0px 80px'
})
const emojiVisibilityTargetMap = new Map<string, Element>()
const cachingEmojiIds = new Set<string>()
const emojiCacheEnv = ref<EmojiCacheEnvironment | null>(null)
const emojiWorkerUrl = new URL('../../../workers/imageDownloader.ts', import.meta.url)
let emojiCacheWorker: Worker | null = null
const emojiExtCache = new Map<string, string>()
const localUrlCache = new Map<string, string>() // 仅用于最近使用的表情包快速匹配本地链接
const emojiUrlToLocalMap = new Map<string, string>() // expressionUrl -> localUrl
const downloadLimit = pLimit(3)
const downloadingUrls = new Set<string>()
const clearEmojiLocalPath = (id: string, expressionUrl?: string) => {
  const next = { ...emojiLocalPathMap.value }
  delete next[id]
  emojiLocalPathMap.value = next
  emojiStore.setLocalUrl(id, null)
  if (expressionUrl) {
    emojiUrlToLocalMap.delete(expressionUrl)
    localUrlCache.delete(expressionUrl)
  }
}

// 生成选项卡数组
const tabList = computed<TabItem[]>(() => {
  const baseItems: TabItem[] = [
    { id: 0, type: 'icon', name: t('emoticon.tabs.emoji'), icon: '#face' },
    { id: -1, type: 'icon', name: t('emoticon.tabs.favorites'), icon: '#heart' }
  ]

  // 添加米游社表情包系列
  const seriesItems: TabItem[] = emojisBbs.series.map((series, index) => ({
    id: index + 1,
    type: 'series',
    name: series.name,
    cover: series.cover
  }))

  return [...baseItems, ...seriesItems]
})

const currentSeries = computed(() => (activeIndex.value > 0 ? emojisBbs.series[activeIndex.value - 1] : null))
const packColumns = computed(() => (isMobile() ? 4 : 6))
const SERIES_PAGE_SIZE = 30
const favoritesPage = ref(1)
const seriesPage = ref(1)
const favoritesPageSize = computed(() => (isMobile() ? 20 : 25))

// 将"我的表情包"列表倒序显示
const reversedEmojiList = computed(() => {
  return [...emojiStore.emojiList].reverse()
})

const displayFavoriteEmojis = computed(() => {
  const size = favoritesPage.value * favoritesPageSize.value
  return reversedEmojiList.value.slice(0, size)
})

const displaySeriesRows = computed(() => {
  if (!currentSeries.value) return []
  const cols = packColumns.value
  const size = seriesPage.value * SERIES_PAGE_SIZE
  const visibleEmojiCount = Math.min(currentSeries.value.emojis.length, size)
  const rows: { key: number; emojis: (typeof currentSeries.value.emojis)[number][] }[] = []
  for (let i = 0; i < visibleEmojiCount; i += cols) {
    rows.push({ key: i, emojis: currentSeries.value.emojis.slice(i, i + cols) })
  }
  return rows
})

const SCROLL_LOAD_MORE_THRESHOLD = 32
const isNearBottom = (target: HTMLElement) =>
  target.scrollTop + target.clientHeight >= target.scrollHeight - SCROLL_LOAD_MORE_THRESHOLD

const favoritesLoadMoreLock = ref(false)
const seriesLoadMoreLock = ref(false)

const loadMoreFavorites = async () => {
  if (favoritesLoadMoreLock.value) return
  if (displayFavoriteEmojis.value.length >= reversedEmojiList.value.length) return
  favoritesLoadMoreLock.value = true
  favoritesPage.value += 1
  await nextTick()
  favoritesLoadMoreLock.value = false
}

const loadMoreSeries = async () => {
  if (seriesLoadMoreLock.value) return
  if (!currentSeries.value) return
  if (seriesPage.value * SERIES_PAGE_SIZE >= currentSeries.value.emojis.length) return
  seriesLoadMoreLock.value = true
  seriesPage.value += 1
  await nextTick()
  seriesLoadMoreLock.value = false
}

const handlePanelScroll = (event: Event) => {
  activeMenuId.value = ''
  const target =
    (panelScrollbarRef.value as any)?.containerRef ||
    (event.target as HTMLElement | null) ||
    (event.currentTarget as HTMLElement | null)
  if (!target) return
  if (isFavoritesView.value) {
    if (isNearBottom(target)) {
      void loadMoreFavorites()
    }
    return
  }
  if (currentSeries.value && isNearBottom(target)) {
    void loadMoreSeries()
  }
}

const res = getAllTypeEmojis()

const emojiObj = ref<EmojiType>({
  expressionEmojis: res.expressionEmojis,
  animalEmojis: res.animalEmojis,
  gestureEmojis: res.gestureEmojis
} as EmojiType)

if (props.all) {
  emojiObj.value = res
} else {
  emojiObj.value = {
    expressionEmojis: res.expressionEmojis,
    animalEmojis: res.animalEmojis,
    gestureEmojis: res.gestureEmojis
  } as EmojiType
}

const emojiRef = reactive<{
  chooseItem: string
  historyList: string[]
  allEmoji: EmojiType
}>({
  chooseItem: '',
  historyList: emoji,
  allEmoji: emojiObj.value
})

// 只在支持 window/Worker 的环境下按需创建 emoji 缓存 Worker，并在全局复用
const getEmojiWorker = () => {
  if (!isFavoritesView.value) {
    return null
  }
  if (typeof window === 'undefined') {
    return null
  }
  if (!emojiCacheWorker) {
    emojiCacheWorker = new Worker(emojiWorkerUrl)
  }
  return emojiCacheWorker
}

const getEmojiBaseDir = () => (isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource)
const getEmojiBaseDirPath = async () => (isMobile() ? await appDataDir() : await resourceDir())

// 兜底从 URL 字符串中推断扩展名，避免远端类型识别失败
const inferExtFromUrl = (url: string) => {
  try {
    const { pathname } = new URL(url)
    const index = pathname.lastIndexOf('.')
    if (index !== -1) {
      return pathname.slice(index + 1)
    }
  } catch {
    const clean = url.split('?')[0]
    const index = clean.lastIndexOf('.')
    if (index !== -1) {
      return clean.slice(index + 1)
    }
  }
  return null
}

// 优先使用 detectRemoteFileType 获取真实扩展名，否则回退到 URL 规则推断并缓存结果
const resolveEmojiExtension = async (url: string) => {
  if (emojiExtCache.has(url)) {
    return emojiExtCache.get(url)!
  }
  const inferred = inferExtFromUrl(url)
  if (inferred) {
    const ext = inferred.toLowerCase()
    emojiExtCache.set(url, ext)
    return ext
  }
  let ext = ''
  try {
    const info = await detectRemoteFileType({ url, fileSize: null })
    ext = info?.ext || ''
  } catch (error) {
    console.warn('识别表情类型失败:', error)
  }
  if (!ext) {
    ext = 'png'
  }
  emojiExtCache.set(url, ext)
  return ext
}

// 使用 Emoji URL 的 md5 + 扩展名生成稳定文件名，避免重复下载
const buildEmojiFileName = async (url: string) => {
  const hash = await md5FromString(url)
  const ext = await resolveEmojiExtension(url)
  return `${hash}.${ext}`
}

// 将绝对路径转换为 Tauri 可访问的 file URI，并写入响应式映射
const setEmojiLocalPath = (id: string, absolutePath: string, expressionUrl?: string) => {
  const localUrl = convertFileSrc(absolutePath)
  emojiLocalPathMap.value = {
    ...emojiLocalPathMap.value,
    [id]: localUrl
  }
  emojiStore.setLocalUrl(id, localUrl)
  if (expressionUrl) {
    emojiUrlToLocalMap.set(expressionUrl, localUrl)
    localUrlCache.set(expressionUrl, localUrl)
  }
}

const ensureEmojiCacheEnvironment = async () => {
  if (!isFavoritesView.value) return null
  const uid = userStore.userInfo?.uid
  if (!uid) {
    return null
  }
  if (emojiCacheEnv.value?.uid === uid) {
    return emojiCacheEnv.value
  }
  try {
    const [emojiDir, baseDirPath] = await Promise.all([getUserEmojiDir(uid), getEmojiBaseDirPath()])
    const env: EmojiCacheEnvironment = {
      uid,
      emojiDir,
      baseDir: getEmojiBaseDir(),
      baseDirPath
    }
    emojiCacheEnv.value = env
    return env
  } catch (error) {
    console.error('初始化表情缓存目录失败:', error)
    return null
  }
}

const releaseEmojiObserver = (id: string) => {
  const target = emojiVisibilityTargetMap.get(id)
  if (target) {
    unobserveEmojiVisibility(target)
    emojiVisibilityTargetMap.delete(id)
  }
}

const resolveVisibilityElement = (target: Element | ComponentPublicInstance | null) => {
  if (!target) {
    return null
  }
  if (target instanceof Element) {
    return target
  }
  const el = target.$el
  return el instanceof Element ? el : null
}

// 首选借助 Worker 下载以隔离网络 I/O；若无 Worker（如 SSR）则回退到 fetch
const downloadEmojiFile = async (url: string) => {
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
      if (!data || data.url !== url) {
        return
      }
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

const cleanupLocalEmojiMap = (validIds: string[]) => {
  const validSet = new Set(validIds)
  const nextMap = { ...emojiLocalPathMap.value }
  let changed = false
  Object.keys(nextMap).forEach((id) => {
    if (!validSet.has(id)) {
      delete nextMap[id]
      changed = true
    }
  })
  if (changed) {
    emojiLocalPathMap.value = nextMap
  }
}

const cleanupEmojiObservers = (validIds: string[]) => {
  const validSet = new Set(validIds)
  emojiVisibilityTargetMap.forEach((el, id) => {
    if (!validSet.has(id)) {
      unobserveEmojiVisibility(el)
      emojiVisibilityTargetMap.delete(id)
    }
  })
}

const cleanupAllEmojiCaches = () => {
  emojiLocalPathMap.value = {}
  emojiExtCache.clear()
  localUrlCache.clear()
  emojiUrlToLocalMap.clear()
  emojiVisibilityTargetMap.forEach((el) => unobserveEmojiVisibility(el))
  emojiVisibilityTargetMap.clear()
  cachingEmojiIds.clear()
  downloadingUrls.clear()
  emojiCacheEnv.value = null
}

// 只有当收藏项真正出现在视口内时才执行缓存下载
const handleEmojiVisibility = async (emojiItem: EmojiListItem) => {
  const id = emojiItem.id
  if (emojiItem.localUrl || emojiLocalPathMap.value[id] || cachingEmojiIds.has(id)) {
    releaseEmojiObserver(id)
    return
  }
  const env = await ensureEmojiCacheEnvironment()
  if (!env) {
    return
  }
  cachingEmojiIds.add(id)
  try {
    await ensureEmojiCached(emojiItem, env.emojiDir, env.baseDir, env.baseDirPath)
  } catch (error) {
    console.error('缓存表情失败:', emojiItem.expressionUrl, error)
  } finally {
    cachingEmojiIds.delete(id)
    releaseEmojiObserver(id)
  }
}

// 绑定 DOM 元素到观察器，等待其进入视口后触发下载
const registerEmojiVisibilityTarget = (target: Element | ComponentPublicInstance | null, emojiItem: EmojiListItem) => {
  releaseEmojiObserver(emojiItem.id)
  const el = resolveVisibilityElement(target)
  if (!el || !emojiItem.expressionUrl || emojiItem.localUrl || emojiLocalPathMap.value[emojiItem.id]) {
    return
  }
  emojiVisibilityTargetMap.set(emojiItem.id, el)
  observeEmojiVisibility(el, () => {
    void handleEmojiVisibility(emojiItem)
  })
}

// 根据用户 UID 的缓存目录落盘单个 Emoji，若文件不存在则下载后写入
const ensureEmojiCached = async (
  emojiItem: EmojiListItem,
  emojiDir: string,
  baseDir: BaseDirectory,
  baseDirPath: string
) => {
  const fileName = await buildEmojiFileName(emojiItem.expressionUrl)
  const relativePath = await join(emojiDir, fileName)
  const hasFile = await exists(relativePath, { baseDir })
  if (!hasFile) {
    const bytes = await downloadEmojiFile(emojiItem.expressionUrl)
    await writeFile(relativePath, bytes, { baseDir })
  }
  const absolutePath = await join(baseDirPath, relativePath)
  setEmojiLocalPath(emojiItem.id, absolutePath, emojiItem.expressionUrl)
}

// 将 store 中已有表情与本地缓存对齐，优先使用本地链接渲染
const hydrateEmojiLocalCache = async () => {
  if (!isFavoritesView.value) return
  const env = await ensureEmojiCacheEnvironment()
  if (!env) return
  const downloadTasks: Promise<unknown>[] = []
  for (const item of emojiStore.emojiList) {
    const fileName = await buildEmojiFileName(item.expressionUrl)
    const relativePath = await join(env.emojiDir, fileName)
    const hasFile = await exists(relativePath, { baseDir: env.baseDir })
    const absolutePath = await join(env.baseDirPath, relativePath)

    if (!hasFile) {
      // 本地文件不存在，先清除失效映射
      clearEmojiLocalPath(item.id, item.expressionUrl)
      // 异步下载（使用 worker）
      if (!downloadingUrls.has(item.expressionUrl)) {
        downloadingUrls.add(item.expressionUrl)
        const task = downloadLimit(async () => {
          try {
            await ensureEmojiCached(item, env.emojiDir, env.baseDir, env.baseDirPath)
          } catch (error) {
            console.error('[emoji] 重新缓存表情失败:', item.expressionUrl, error)
          } finally {
            downloadingUrls.delete(item.expressionUrl)
          }
        })
        downloadTasks.push(task)
      }
    } else {
      // 文件存在但 store 没有记录时，回填本地链接
      const localUrl = convertFileSrc(absolutePath)
      setEmojiLocalPath(item.id, absolutePath, item.expressionUrl)
      localUrlCache.set(item.expressionUrl, localUrl)
      emojiUrlToLocalMap.set(item.expressionUrl, localUrl)
    }
  }
  if (downloadTasks.length) {
    await Promise.allSettled(downloadTasks)
  }
}

// 监听收藏列表变化，保持本地映射与观察目标同步
watch(
  () => emojiStore.emojiList.map((item) => ({ id: item.id, url: item.expressionUrl })),
  (list) => {
    if (!isFavoritesView.value) return
    const ids = list.map((item) => item.id)
    cleanupLocalEmojiMap(ids)
    cleanupEmojiObservers(ids)
    void hydrateEmojiLocalCache()
  },
  { immediate: true, deep: true }
)

// 用户切换时重置缓存上下文与观察器
watch(
  () => userStore.userInfo?.uid,
  () => {
    cleanupAllEmojiCaches()
    disconnectEmojiObserver()
    // 切换账号后如已有列表，且当前在我的喜欢视图时，再尝试用本地缓存替换链接
    if (emojiStore.emojiList.length > 0 && userStore.userInfo?.uid && isFavoritesView.value) {
      void hydrateEmojiLocalCache()
    }
  },
  { immediate: true }
)

/**
 * 检查字符串是否为URL
 */
const checkIsUrl = (str: string) => {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

/**
 * 处理右键菜单点击事件
 * @param event 鼠标事件
 * @param item 表情项
 */
const handleContextMenu = (event: MouseEvent, item: any) => {
  // 阻止原生右键菜单
  event.preventDefault()
  activeMenuId.value = item.id
}

/**
 * 删除我的表情包
 * @param id 表情包ID
 */
const deleteMyEmoji = async (id: string) => {
  try {
    await emojiStore.deleteEmoji(id)
    window.$message.success(t('emoticon.favorites.deleteSuccess'))
    // 关闭菜单
    activeMenuId.value = ''
    localUrlCache.clear()
    emojiUrlToLocalMap.clear()
  } catch (error) {
    console.error('删除表情失败:', error)
    window.$message.error(t('emoticon.favorites.deleteFail'))
  }
}

/**
 * 选择表情
 * @param item
 */
const chooseEmoji = async (item: any, type: 'emoji' | 'url' = 'emoji') => {
  emojiRef.chooseItem = typeof item === 'string' ? item : item?.renderUrl || item?.expressionUrl || ''

  // 只有非URL的表情（emoji）才记录到历史记录中
  if (type === 'emoji') {
    // 如果已经存在于历史记录中，则先移除
    const index = emojiRef.historyList.indexOf(item)
    if (index !== -1) {
      emojiRef.historyList.splice(index, 1)
    }
    emojiRef.historyList.unshift(item)
    if (emojiRef.historyList.length > 18) {
      emojiRef.historyList.splice(18) // 保留前18个元素
    }
    setEmoji([...emojiRef.historyList])
  }

  // 传递表情类型信息，URL类型的表情作为EMOJI类型处理
  // URL 类型时，确保 renderUrl 优先使用本地链接
  if (type === 'url') {
    const payload =
      typeof item === 'object' && item
        ? {
            id: item.id,
            renderUrl: item.renderUrl || item.expressionUrl || '',
            serverUrl: item.serverUrl || item.expressionUrl || ''
          }
        : { renderUrl: typeof item === 'string' ? item : '', serverUrl: typeof item === 'string' ? item : '' }
    if (!isFavoritesView.value) {
      emit('emojiHandle', payload, 'emoji-url')
      return payload
    }
    try {
      const local = await ensureLocalByServerUrl(payload.serverUrl || payload.renderUrl, payload.id)
      if (local) {
        payload.renderUrl = local
      }
    } catch (error) {
      console.warn('[emoji] 获取本地表情失败，回退服务器URL', error)
    }
    emit('emojiHandle', payload, 'emoji-url')
    return payload
  }

  emit('emojiHandle', item, 'emoji')
  return item
}

const getEmojiRenderUrl = (item: EmojiListItem) => {
  const mapped = emojiUrlToLocalMap.get(item.expressionUrl)
  if (mapped) return mapped
  if (item.localUrl) {
    emojiUrlToLocalMap.set(item.expressionUrl, item.localUrl)
    localUrlCache.set(item.expressionUrl, item.localUrl)
    return item.localUrl
  }
  const localById = emojiLocalPathMap.value[item.id]
  if (localById) return localById
  return item.expressionUrl
}

// 确保某个服务端 URL 有本地副本，并返回可用于渲染的本地链接
const ensureLocalByServerUrl = async (serverUrl: string, id?: string, options?: { skipCache?: boolean }) => {
  try {
    if (!serverUrl) return null
    if (options?.skipCache) return null
    if (emojiUrlToLocalMap.has(serverUrl)) return emojiUrlToLocalMap.get(serverUrl)!
    const env = await ensureEmojiCacheEnvironment()
    if (!env) return null
    const fileName = await buildEmojiFileName(serverUrl)
    const relativePath = await join(env.emojiDir, fileName)
    const hasFile = await exists(relativePath, { baseDir: env.baseDir })
    const absolutePath = await join(env.baseDirPath, relativePath)
    if (hasFile) {
      const localUrl = convertFileSrc(absolutePath)
      emojiUrlToLocalMap.set(serverUrl, localUrl)
      localUrlCache.set(serverUrl, localUrl)
      if (id) {
        const next = { ...emojiLocalPathMap.value }
        next[id] = localUrl
        emojiLocalPathMap.value = next
      }
      return localUrl
    }
    // 未命中本地文件则异步下载，先返回 null 以便立即使用服务器 URL 展示
    if (!downloadingUrls.has(serverUrl)) {
      downloadingUrls.add(serverUrl)
      void downloadLimit(async () => {
        try {
          const bytes = await downloadEmojiFile(serverUrl)
          await writeFile(relativePath, bytes, { baseDir: env.baseDir })
          const localUrl = convertFileSrc(absolutePath)
          emojiUrlToLocalMap.set(serverUrl, localUrl)
          localUrlCache.set(serverUrl, localUrl)
          // 触发视图更新
          if (id) {
            const nextMap = { ...emojiLocalPathMap.value }
            nextMap[id] = localUrl
            emojiLocalPathMap.value = nextMap
          }
        } catch (error) {
          console.error('[emoji] ensureLocalByServerUrl 下载失败:', serverUrl, error)
          clearEmojiLocalPath('', serverUrl)
        } finally {
          downloadingUrls.delete(serverUrl)
        }
      })
    }
    return null
  } catch (error) {
    console.warn('[emoji] ensureLocalByServerUrl 异常，回退服务器URL', error)
    return null
  }
}

/**
 * 切换表情类型标签
 */
const handleTabChange = (index: number) => {
  activeIndex.value = index
  if (index === -1) {
    favoritesPage.value = 1
  }
  if (index > 0) {
    seriesPage.value = 1
  }
  void nextTick().then(() => {
    panelScrollbarRef.value?.scrollTo({ top: 0 })
  })
  // 切换到非“我的喜欢”视图时，立即清理缓存相关状态
  if (index !== -1) {
    cleanupAllEmojiCaches()
    disconnectEmojiObserver()
    if (emojiCacheWorker) {
      emojiCacheWorker.terminate()
      emojiCacheWorker = null
    }
  } else {
    // 切回“我的喜欢”时尝试同步本地缓存
    void hydrateEmojiLocalCache()
  }
  setLastEmojiTabIndex(index)
}

/**
 * 选择表情包系列
 */
const selectSeries = (index: number) => {
  handleTabChange(index + 1)
}

onMounted(async () => {
  // 获取我的表情包列表
  await emojiStore.getEmojiList()
  // 仅在“我的喜欢”视图时才尝试使用本地缓存，避免系列表情也走缓存逻辑
  if (isFavoritesView.value) {
    await hydrateEmojiLocalCache()
  }
})

onBeforeUnmount(() => {
  disconnectEmojiObserver()
  if (emojiCacheWorker) {
    emojiCacheWorker.terminate()
    emojiCacheWorker = null
  }
  cleanupAllEmojiCaches()
})
</script>

<style lang="scss">
/**! 修改naive-ui滚动条的间距 */
.n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--vertical,
.n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--vertical {
  right: 0;
}

.n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--horizontal > .n-scrollbar-rail__scrollbar,
.n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--horizontal > .n-scrollbar-rail__scrollbar {
  top: 4px;
}

.emoji-item {
  @apply cursor-pointer;
  @apply size-36px text-26px hover:bg-[--emoji-hover] rounded-8px;
}

.emoji-item--image {
  @apply size-60px hover:bg-transparent;

  &:hover .emoji-image {
    @apply scale-116 bg-[--emoji-hover] rounded-8px;
  }
}

.emoji-visibility-wrapper {
  @apply w-full h-full;
}

.expression-item {
  @apply h-50px w-full p-[0_14px] box-border select-none;
  border-top: 1px solid var(--line-color);

  .scrollbar-container {
    @apply w-full max-w-420px;
    overflow-x: auto;
  }

  .series-container {
    @apply flex items-center;
    white-space: nowrap;
    width: max-content;

    svg {
      @apply size-26px my-4px p-6px rounded-8px mr-12px flex-shrink-0 inline-flex items-center justify-center;
      &:not(.active):hover {
        background-color: var(--emoji-hover);
        cursor: pointer;
      }
    }
  }

  .series-icon {
    @apply size-30px my-4px p-4px rounded-8px mr-12px flex-shrink-0 inline-flex items-center justify-center;
    &:not(.active):hover {
      background-color: var(--emoji-hover);
      cursor: pointer;
    }

    &.active {
      background-color: var(--emoji-active-color) !important;
    }

    &:last-child {
      margin-right: 0;
    }
  }
}

.emoji-content {
  position: relative;
  width: 100%;
}

.emoji-pack-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  padding: 6px;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

// 移动端表情网格布局 - 普通emoji表情（7列）
.emoji-grid-mobile {
  display: grid !important;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  justify-items: center;
  width: 100%;
}

// 移动端表情包网格布局 - 表情包图片（4列）
.emoji-pack-grid-mobile {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  justify-items: center;
  width: 100%;
}
</style>
