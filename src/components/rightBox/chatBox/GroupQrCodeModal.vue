<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import { fetch as nativeFetch } from '@tauri-apps/plugin-http'
import { MergeMessageType, MessageStatusEnum, MittEnum, MsgEnum, ThemeEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import type { MessageType } from '@/services/types.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useGroupStore } from '@/stores/group.ts'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { canvasToImageBytes } from '@/utils/Canvas2Dom'
import { isMac, isWindows } from '@/utils/PlatformConstants'

const props = defineProps<{
  show: boolean
  avatar: string
  name: string
  account: string
  roomId: string
  onCopyAccount?: () => void
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const { t } = useI18n()
const chatStore = useChatStore()
const groupStore = useGroupStore()
const userStore = useUserStore()
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)

const QR_IMAGE_SIZE = 200
const QR_CARD_EXPORT_WIDTH = 360
const QR_CARD_EXPORT_HEIGHT = 460
const QR_CARD_RADIUS = 36

const qrCodeWrapperRef = ref<HTMLElement | null>(null)
const qrCodeExportWrapperRef = ref<HTMLElement | null>(null)
const qrExportIconSrc = ref<string | null>(null)
const qrExportIconKey = ref<string>('')

const modalShow = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const groupQrValue = computed(() => {
  if (!props.roomId) return ''
  return JSON.stringify({ type: 'scanEnterGroup', roomId: props.roomId })
})

const isTauriContext = () =>
  Boolean((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__ || (window as any).__TAURI_INVOKE__)

const convertHttpDataToArrayBuffer = (data: unknown): ArrayBuffer => {
  if (data === null || data === undefined) {
    throw new Error('无法解析图片数据')
  }

  if (data instanceof ArrayBuffer) {
    return data
  }

  if (data instanceof Uint8Array) {
    return data.slice().buffer
  }

  if (Array.isArray(data)) {
    return Uint8Array.from(data).buffer
  }

  if (typeof data === 'object') {
    const maybeData = (data as { data?: number[] }).data
    if (Array.isArray(maybeData)) {
      return Uint8Array.from(maybeData).buffer
    }
  }

  if (typeof data === 'string') {
    const binaryString = atob(data)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  throw new Error('无法解析图片数据')
}

const revokeQrExportIcon = () => {
  if (qrExportIconSrc.value?.startsWith('blob:')) {
    URL.revokeObjectURL(qrExportIconSrc.value)
  }
  qrExportIconSrc.value = null
}

const resolveQrExportIcon = async () => {
  const avatar = props.avatar
  if (!avatar) {
    revokeQrExportIcon()
    qrExportIconKey.value = ''
    return
  }

  const avatarUrl = AvatarUtils.getAvatarUrl(avatar)
  if (!avatarUrl || avatarUrl === qrExportIconKey.value) return
  qrExportIconKey.value = avatarUrl
  revokeQrExportIcon()

  if (!isTauriContext() || !/^https?:\/\//i.test(avatarUrl)) {
    qrExportIconSrc.value = avatarUrl
    return
  }

  try {
    const response = await nativeFetch(avatarUrl, { method: 'GET' })
    const anyResponse = response as any
    const status = typeof anyResponse.status === 'number' ? anyResponse.status : 200
    const statusText = typeof anyResponse.statusText === 'string' ? anyResponse.statusText : ''
    const ok = 'ok' in anyResponse ? Boolean(anyResponse.ok) : status >= 200 && status < 400
    if (!ok) {
      throw new Error(`下载失败: ${status} ${statusText}`.trim())
    }

    let buffer: ArrayBuffer | null = null
    if (typeof anyResponse.arrayBuffer === 'function') {
      const resBuffer = await anyResponse.arrayBuffer()
      if (resBuffer instanceof ArrayBuffer) {
        buffer = resBuffer
      }
    }
    if (!buffer && typeof anyResponse.bytes === 'function') {
      const bytes = await anyResponse.bytes()
      buffer = convertHttpDataToArrayBuffer(bytes)
    }
    if (!buffer && 'data' in anyResponse) {
      buffer = convertHttpDataToArrayBuffer(anyResponse.data)
    }
    if (!buffer) {
      throw new Error('无法解析图片数据')
    }

    const contentType =
      typeof anyResponse.headers?.get === 'function' ? anyResponse.headers.get('content-type') : 'image/png'
    const blob = new Blob([buffer], { type: contentType || 'image/png' })
    qrExportIconSrc.value = URL.createObjectURL(blob)
  } catch (error) {
    console.error('获取二维码头像失败:', error)
    qrExportIconSrc.value = null
  }
}

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      void resolveQrExportIcon()
    } else {
      revokeQrExportIcon()
    }
  }
)

watch(
  () => props.avatar,
  () => {
    if (props.show) {
      void resolveQrExportIcon()
    }
  }
)

onUnmounted(() => {
  revokeQrExportIcon()
})

const getGroupQrCanvas = () => {
  const wrapper = qrCodeExportWrapperRef.value || qrCodeWrapperRef.value
  if (!wrapper) return null
  const canvas = wrapper.querySelector('canvas')
  return canvas instanceof HTMLCanvasElement ? canvas : null
}

const drawRoundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

const loadImageSafely = (src?: string | null): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null)
      return
    }
    const image = new Image()
    if (/^https?:/i.test(src)) {
      image.crossOrigin = 'anonymous'
    }
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

const truncateCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) {
    return text
  }
  let truncated = text
  while (truncated.length > 0 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}…`
}

const buildGroupQrShareCanvas = async (): Promise<HTMLCanvasElement | null> => {
  const baseCanvas = getGroupQrCanvas()
  if (!baseCanvas) return null
  const canvas = document.createElement('canvas')
  canvas.width = QR_CARD_EXPORT_WIDTH
  canvas.height = QR_CARD_EXPORT_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  drawRoundedRectPath(ctx, 0, 0, canvas.width, canvas.height, QR_CARD_RADIUS)
  ctx.clip()
  ctx.fillStyle = '#f6f7fb'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const horizontalPadding = 42
  const avatarSize = 44
  const avatarX = horizontalPadding
  const contentAnchorY = 52
  const avatarY = contentAnchorY + 8

  // 头像
  ctx.save()
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  const avatarSrc = qrExportIconSrc.value || AvatarUtils.getAvatarUrl(props.avatar) || undefined
  const avatarImg = await loadImageSafely(avatarSrc)
  if (avatarImg) {
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize)
  } else {
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize)
    ctx.fillStyle = '#64748b'
    ctx.font = 'bold 20px "PingFang SC", system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const initial = (props.name || 'H').slice(0, 1).toUpperCase()
    ctx.fillText(initial, avatarX + avatarSize / 2, avatarY + avatarSize / 2)
  }
  ctx.restore()

  // 文本信息
  const textX = avatarX + avatarSize + 16
  const maxTextWidth = canvas.width - textX - horizontalPadding
  const groupName = props.name
  const groupId = props.account || props.roomId
  ctx.fillStyle = '#0f172a'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = 'bold 20px "PingFang SC", system-ui'
  const title = truncateCanvasText(ctx, groupName, maxTextWidth)
  ctx.fillText(title, textX, avatarY + 24)

  ctx.fillStyle = '#6b7280'
  ctx.font = '14px "PingFang SC", system-ui'
  const groupLabel = truncateCanvasText(ctx, `群号：${groupId}`, maxTextWidth)
  ctx.fillText(groupLabel, textX, avatarY + 42)

  // 绘制二维码
  const qrSize = 248
  const qrX = (canvas.width - qrSize) / 2
  const qrY = contentAnchorY + avatarSize + 28
  ctx.drawImage(baseCanvas, qrX, qrY, qrSize, qrSize)

  // 提示文字
  ctx.fillStyle = '#4b5563'
  ctx.font = '15px "PingFang SC", system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(t('home.chat_header.qr.tip'), QR_CARD_EXPORT_WIDTH / 2, qrY + qrSize + 34)

  ctx.restore()
  return canvas
}

const getGroupQrImageBytes = async (): Promise<{ bytes: Uint8Array; width: number; height: number } | null> => {
  await nextTick()
  const shareCanvas = await buildGroupQrShareCanvas()
  if (!shareCanvas) return null
  return await canvasToImageBytes(shareCanvas, {
    type: 'image/webp'
  })
}

const normalizeSavePath = (path: string) => path.replace(/\\/g, '/')

const handleForwardGroupQr = async () => {
  if (!groupQrValue.value) return
  try {
    const qrResult = await getGroupQrImageBytes()
    if (!qrResult || !qrResult.bytes?.length) {
      return
    }
    const { bytes, width, height } = qrResult

    const canvas = getGroupQrCanvas()
    const previewWidth = width || canvas?.width || QR_IMAGE_SIZE
    const previewHeight = height || canvas?.height || QR_IMAGE_SIZE
    const size = bytes.byteLength
    const mimeType = 'image/webp'
    const arrayBuffer = bytes.slice().buffer
    const blob = new Blob([arrayBuffer], { type: mimeType })
    const previewUrl = URL.createObjectURL(blob)
    const roomId = props.roomId

    if (!roomId) {
      URL.revokeObjectURL(previewUrl)
      return
    }

    const tempMsgId = `QR_${roomId}_${Date.now()}`
    const selfInfo = groupStore.getUserInfo(userStore.userInfo!.uid)
    const fromUser = {
      uid: userStore.userInfo!.uid,
      username: selfInfo?.name || userStore.userInfo!.name || '',
      avatar: selfInfo?.avatar || userStore.userInfo!.avatar || '',
      locPlace: selfInfo?.locPlace || ''
    }

    const tempMessage: MessageType = {
      fromUser,
      message: {
        id: tempMsgId,
        roomId,
        sendTime: Date.now(),
        status: MessageStatusEnum.PENDING,
        type: MsgEnum.IMAGE,
        body: {
          url: previewUrl,
          width: previewWidth,
          height: previewHeight,
          size
        },
        messageMarks: {}
      },
      sendTime: Date.now(),
      loading: false,
      isCheck: true
    }

    chatStore.clearMsgCheck()
    await chatStore.pushMsg(tempMessage)

    chatStore.setCustomForwardTask({
      id: tempMsgId,
      type: MsgEnum.IMAGE,
      fileName: 'group-qr.png',
      mimeType,
      bytes,
      previewUrl,
      width: previewWidth,
      height: previewHeight,
      size
    })

    chatStore.setMsgMultiChoose(true, 'forward')
    await nextTick()
    useMitt.emit(MittEnum.MSG_MULTI_CHOOSE, {
      action: 'open-forward',
      mergeType: MergeMessageType.SINGLE
    })
  } catch (error) {
    console.error('转发二维码失败:', error)
  }
}

const handleCopyGroupId = async () => {
  const groupId = props.account || props.roomId
  if (!groupId) {
    return
  }
  try {
    await navigator.clipboard.writeText(groupId)
    window.$message.success(t('home.chat_header.qr.toast.group_id_copied'))
  } catch (error) {
    console.error('复制群号失败:', error)
  }
}

const handleSaveGroupQrImage = async () => {
  if (!groupQrValue.value) return
  try {
    const qrResult = await getGroupQrImageBytes()
    if (!qrResult) {
      window.$message.error(t('home.chat_header.qr.toast.save_failed'))
      return
    }
    const { bytes } = qrResult
    const defaultName = `group-qr-${props.roomId || 'unknown'}.png`
    const savePath = await save({
      defaultPath: defaultName,
      filters: [
        {
          name: 'PNG',
          extensions: ['png']
        }
      ]
    })
    if (!savePath) return
    await writeFile(normalizeSavePath(savePath), bytes)
    window.$message.success(t('home.chat_header.qr.toast.save_success'))
  } catch (error) {
    console.error('保存二维码失败:', error)
    window.$message.error(t('home.chat_header.qr.toast.save_failed'))
  }
}
</script>

<template>
  <n-modal v-model:show="modalShow" class="w-400px rounded-8px">
    <div class="bg-[--bg-popover] w-400px p-6px box-border flex flex-col">
      <div
        v-if="isMac()"
        @click="modalShow = false"
        class="mac-close z-999 size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none absolute left-6px">
        <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
          <use href="#close"></use>
        </svg>
      </div>

      <svg v-if="isWindows()" @click="modalShow = false" class="size-12px ml-a cursor-pointer select-none">
        <use href="#close"></use>
      </svg>

      <div class="flex flex-col gap-20px p-[22px_20px_20px_22px] select-none">
        <div class="flex justify-center">
          <div class="w-full max-w-250px flex flex-col gap-20px">
            <div class="flex items-center gap-10px">
              <n-avatar round :size="44" :src="AvatarUtils.getAvatarUrl(avatar)" class="flex-shrink-0" />
              <div class="flex flex-col overflow-hidden gap-6px w-full cursor-default">
                <p class="text-(18px [--text-color]) font-bold truncate">
                  {{ name }}
                </p>
                <span class="flex items-center text-(13px [--chat-text-color]) truncate">
                  {{ t('home.chat_header.qr.group_id_label') }}{{ account || roomId || '--' }}
                  <n-tooltip v-if="account" trigger="hover">
                    <template #trigger>
                      <svg
                        class="size-14px cursor-pointer color-[--icon-color] hover:color-#13987f transition-colors inline-block ml-6px"
                        @click="onCopyAccount">
                        <use href="#copy"></use>
                      </svg>
                    </template>
                    <span>{{ t('home.chat_header.sidebar.group.copy') }}</span>
                  </n-tooltip>
                </span>
              </div>
            </div>

            <div ref="qrCodeWrapperRef" class="rounded-24px flex flex-col items-center gap-12px">
              <n-qr-code
                style="border-radius: 16px"
                :value="groupQrValue"
                :size="220"
                type="canvas"
                :color="themes.content === ThemeEnum.DARK ? '#202020' : '#000000'"
                :background-color="themes.content === ThemeEnum.DARK ? '#e3e3e3' : '#e3e3e382'"
                :icon-src="AvatarUtils.getAvatarUrl(avatar)" />
              <p class="text-(12px [--chat-text-color])">{{ t('home.chat_header.qr.tip') }}</p>
            </div>
          </div>
        </div>

        <div ref="qrCodeExportWrapperRef" class="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
          <n-qr-code
            :value="groupQrValue"
            :size="200"
            type="canvas"
            :color="themes.content === ThemeEnum.DARK ? '#202020' : '#000000'"
            :background-color="themes.content === ThemeEnum.DARK ? '#e3e3e3' : '#e3e3e382'"
            :icon-src="qrExportIconSrc || undefined" />
        </div>

        <div class="flex items-center justify-between gap-12px border-t-(1px solid [--line-color]) pt-12px">
          <div class="QRcode-item" @click="handleForwardGroupQr">
            <svg class="size-20px"><use href="#share-three"></use></svg>
            <span>{{ t('home.chat_header.qr.actions.forward') }}</span>
          </div>
          <div class="QRcode-item" @click="handleCopyGroupId">
            <svg class="size-20px"><use href="#copy"></use></svg>
            <span>{{ t('home.chat_header.qr.actions.copy_group_id') }}</span>
          </div>
          <div class="QRcode-item" @click="handleSaveGroupQrImage">
            <svg class="size-20px"><use href="#Importing"></use></svg>
            <span>{{ t('home.chat_header.qr.actions.save_image') }}</span>
          </div>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<style scoped lang="scss">
.QRcode-item {
  @apply flex flex-1 flex-col items-center gap-10px cursor-pointer text-(12px [--chat-text-color]) p-8px rounded-12px transition-colors hover:bg-#e3e3e360 dark:hover:bg-#262626;
}
</style>
