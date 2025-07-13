<template>
  <!-- 底部栏 -->
  <main class="border-t-(1px solid [--right-chat-footer-line-color]) relative">
    <!-- 添加遮罩层 -->
    <div
      v-if="isSingleChat && !isFriend"
      class="absolute inset-0 z-20 backdrop-blur-md cursor-default flex-center select-none pointer-events-auto light:bg-[rgba(255,255,255,0.1)] dark:bg-[rgba(33,33,33,0.1)]">
      <n-flex align="center" justify="center" class="pb-60px">
        <svg class="size-24px"><use href="#cloudError"></use></svg>
        <span class="text-(14px [--chat-text-color])">你们当前已经不是好友关系</span>
      </n-flex>
    </div>

    <div class="size-full relative z-10 color-[--icon-color]">
      <!-- 输入框顶部选项栏 -->
      <n-flex align="center" justify="space-between" class="p-[10px_22px_5px] select-none">
        <n-flex align="center" :size="0" class="input-options">
          <!-- emoji表情 -->
          <n-popover
            v-model:show="emojiShow"
            trigger="click"
            :show-arrow="false"
            placement="top-start"
            style="
              padding: 0;
              background: var(--bg-emoji);
              backdrop-filter: blur(10px);
              -webkit-backdrop-filter: blur(10px);
              box-shadow: 2px 2px 12px 2px var(--box-shadow-color);
              border: 1px solid var(--box-shadow-color);
              width: auto;
            ">
            <template #trigger>
              <n-popover
                v-model:show="recentlyTip"
                trigger="hover"
                :delay="800"
                :duration="100"
                :show-arrow="false"
                :disabled="emojiShow || recentEmojis.length < 4"
                placement="top">
                <template #trigger>
                  <svg class="mr-18px"><use href="#smiling-face"></use></svg>
                </template>
                <div v-if="recentEmojis.length > 0" class="p-4px">
                  <div class="text-xs text-gray-500 mb-4px">最近使用</div>
                  <div class="flex flex-wrap gap-8px max-w-212px">
                    <div
                      v-for="(emoji, index) in recentEmojis"
                      :key="index"
                      class="emoji-item cursor-pointer flex-center"
                      @click="emojiHandle(emoji, checkIsUrl(emoji) ? 'emoji-url' : 'emoji')">
                      <img v-if="checkIsUrl(emoji)" :src="emoji" class="size-24px" />
                      <span v-else class="text-18px">{{ emoji }}</span>
                    </div>
                  </div>
                </div>
              </n-popover>
            </template>
            <Emoticon @emojiHandle="emojiHandle" :all="false" />
          </n-popover>

          <n-popover trigger="hover" :show-arrow="false" placement="bottom">
            <template #trigger>
              <div class="flex-center gap-2px mr-12px">
                <svg @click="handleCap()"><use href="#screenshot"></use></svg>
                <svg style="width: 14px; height: 14px"><use href="#down"></use></svg>
              </div>
            </template>
            <span>截图</span>
          </n-popover>
          <n-popover trigger="hover" :show-arrow="false" placement="bottom">
            <template #trigger>
              <div class="flex-center gap-2px mr-12px">
                <svg @click="handleFileOpen"><use href="#file2"></use></svg>
                <svg style="width: 14px; height: 14px"><use href="#down"></use></svg>
              </div>
            </template>
            <span>文件</span>
          </n-popover>
          <n-popover trigger="hover" :show-arrow="false" placement="bottom">
            <template #trigger>
              <svg @click="handleImageOpen" class="mr-18px">
                <use href="#photo"></use>
              </svg>
            </template>
            <span>图片</span>
          </n-popover>
          <!--        <n-popover trigger="hover" :show-arrow="false" placement="bottom">-->
          <!--          <template #trigger>-->
          <!--            <svg class="mr-18px"><use href="#shake"></use></svg>-->
          <!--          </template>-->
          <!--          <span>窗口抖动</span>-->
          <!--        </n-popover>-->
          <!--        <n-popover trigger="hover" :show-arrow="false" placement="bottom">-->
          <!--          <template #trigger>-->
          <!--            <svg class="mr-18px"><use href="#red-packet"></use></svg>-->
          <!--          </template>-->
          <!--          <span>红包</span>-->
          <!--        </n-popover>-->
          <n-popover trigger="hover" :show-arrow="false" placement="bottom">
            <template #trigger>
              <svg @click="handleVoiceRecord" class="mr-18px"><use href="#voice"></use></svg>
            </template>
            <span>语音信息</span>
          </n-popover>
        </n-flex>

        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg class="w-22px h-22px cursor-pointer outline-none"><use href="#history"></use></svg>
          </template>
          <span>聊天记录</span>
        </n-popover>
      </n-flex>

      <!-- 输入框及其发送按钮 -->
      <div class="pl-20px flex flex-col items-end gap-6px">
        <MsgInput ref="MsgInputRef" />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { open } from '@tauri-apps/plugin-dialog'
import { copyFile, readFile } from '@tauri-apps/plugin-fs'
import { MittEnum, MsgEnum, RoomTypeEnum } from '@/enums'
import { SelectionRange, useCommon } from '@/hooks/useCommon.ts'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emitTo } from '@tauri-apps/api/event'
import { useGlobalStore } from '@/stores/global.ts'
import type { ContactItem, FilesMeta, SessionItem } from '@/services/types'
import { useContactStore } from '@/stores/contacts'
import { useHistoryStore } from '@/stores/history'
import { useMitt } from '@/hooks/useMitt'
import { extractFileName, getMimeTypeFromExtension } from '@/utils/Formatting'
import { getFilesMeta, getUserAbsoluteVideosDir } from '@/utils/PathUtil'
import { useUserStore } from '@/stores/user'
import { join } from '@tauri-apps/api/path'

const { id } = defineProps<{
  id: SessionItem['id']
}>()
const globalStore = useGlobalStore()
const contactStore = useContactStore()
const historyStore = useHistoryStore()
const MsgInputRef = ref()
const msgInputDom = ref<HTMLInputElement | null>(null)
const emojiShow = ref(false)
const recentlyTip = ref(false)
const recentEmojis = computed(() => {
  return historyStore.emoji.slice(0, 15)
})
const { insertNodeAtRange, triggerInputEvent, processFiles, imgPaste } = useCommon()
const userStore = useUserStore()?.userInfo

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

// 判断是否为单聊
const isSingleChat = computed(() => {
  return globalStore.currentSession?.type === RoomTypeEnum.SINGLE
})

/** 是否是好友关系 */
const isFriend = computed(() => {
  if (!isSingleChat.value) return true
  return contactStore.contactsList.some((contact: ContactItem) => contact.uid === id)
})

// 监听emojiShow的变化，当emojiShow为true时关闭recentlyTip
watch(emojiShow, (newValue) => {
  if (newValue === true) {
    recentlyTip.value = false
  }
})

// 文件选择（不限制类型）
const handleFileOpen = async () => {
  // 获取文件路径列表
  const selected = await open({
    multiple: true
    // 不设置filters，允许选择所有文件类型
  })

  if (selected && Array.isArray(selected)) {
    const filesMeta = await getFilesMeta<FilesMeta>(selected)

    const copyUploadFile = async () => {
      console.log('复制上传文件')
      const currentChatRoomId = globalStore.currentSession.roomId // 这个id可能为群id可能为用户uid，所以不能只用用户uid
      const currentUserUid = userStore.uid as string

      const userResourceDir = await getUserAbsoluteVideosDir(currentUserUid, currentChatRoomId)

      for (const filePathStr of selected) {
        const fileMeta = filesMeta.find((f) => f.path === filePathStr)
        if (fileMeta) {
          copyFile(filePathStr, await join(userResourceDir, fileMeta.name))
        }
      }
    }

    await copyUploadFile()

    // 获取选中文件的类型

    const files = await Promise.all(
      selected.map(async (path) => {
        const fileData = await readFile(path)
        const fileName = extractFileName(path)
        const blob = new Blob([fileData])

        // 找到对应路径的文件，并且获取其类型
        const fileMeta = filesMeta.find((f) => f.path === path)
        const fileType = fileMeta?.mime_type || fileMeta?.file_type

        // 最后手动传入blob中，因为blob无法自动判断文件类型
        return new File([blob], fileName, { type: fileType })
      })
    )
    // 使用processFiles方法进行文件类型验证
    await processFiles(files, MsgInputRef.value.messageInputDom, MsgInputRef.value?.showFileModal)
  }
}

// 图片选择（只能选择图片类型）
const handleImageOpen = async () => {
  const selected = await open({
    multiple: true,
    filters: [
      {
        name: 'Images',
        extensions: ['jpeg', 'jpg', 'png', 'gif', 'webp', 'bmp', 'svg']
      }
    ]
  })

  if (selected && Array.isArray(selected)) {
    // 并行处理所有图片文件
    const imagePromises = selected.map(async (path) => {
      const fileData = await readFile(path)
      const fileName = extractFileName(path)
      const mimeType = getMimeTypeFromExtension(fileName)

      const blob = new Blob([fileData], { type: mimeType })
      return new File([blob], fileName, { type: mimeType })
    })

    const files = await Promise.all(imagePromises)

    // 将所有图片插入到输入框
    for (const file of files) {
      await imgPaste(file, MsgInputRef.value.messageInputDom)
    }
  }
}

/**
 * 选择表情，并把表情插入输入框
 * @param item 选择的表情
 * @param type 表情类型，'emoji' 为普通表情，'emoji-url' 为表情包URL
 */
const emojiHandle = (item: string, type: 'emoji' | 'emoji-url' = 'emoji') => {
  emojiShow.value = false

  const inp = msgInputDom.value
  if (!inp) return

  // 确保输入框有焦点
  MsgInputRef.value?.focus()

  // 检查是否为 URL
  const isUrl = (str: string) => {
    try {
      new URL(str)
      return true
    } catch {
      return false
    }
  }

  // 尝试获取最后的编辑范围
  let lastEditRange: SelectionRange | null = MsgInputRef.value?.getLastEditRange()

  // 如果没有最后的编辑范围，尝试获取当前选区
  if (!lastEditRange) {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      lastEditRange = {
        range: selection.getRangeAt(0),
        selection
      }
    } else {
      // 如果没有选区，创建一个新的范围到最后
      const range = document.createRange()
      range.selectNodeContents(inp)
      range.collapse(false)
      lastEditRange = {
        range,
        selection: window.getSelection()!
      }
    }
  }

  // 清空上下文选区并设置新的选区
  const selection = window.getSelection()
  if (selection) {
    selection.removeAllRanges()
    selection.addRange(lastEditRange.range)
  }

  // 根据内容类型插入不同的节点
  if (isUrl(item)) {
    // 如果是URL，创建图片元素并插入
    const imgElement = document.createElement('img')
    imgElement.src = item
    imgElement.style.maxWidth = '80px'
    imgElement.style.maxHeight = '80px'
    // 设置数据类型，区分是普通图片还是表情包
    imgElement.dataset.type = type === 'emoji-url' ? 'emoji' : 'image'

    // 获取回复框
    const replyDiv = document.getElementById('replyDiv')

    // 如果有回复框，确保表情插入在回复框之后
    if (replyDiv && inp) {
      // 创建一个范围，定位到回复框之后
      const range = document.createRange()
      range.setStartAfter(replyDiv)
      range.collapse(true)

      // 插入表情到回复框后面
      range.insertNode(imgElement)

      // 移动光标到表情后面
      const newRange = document.createRange()
      newRange.setStartAfter(imgElement)
      newRange.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(newRange)
    } else {
      // 没有回复框，按原来方式插入
      lastEditRange.range.insertNode(imgElement)

      // 移动光标到图片后面
      const range = document.createRange()
      range.setStartAfter(imgElement)
      range.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  } else {
    // 如果是普通表情，作为文本插入
    // 获取回复框
    // const replyDiv = document.getElementById('replyDiv')

    // // 如果有回复框，确保表情插入在回复框之后
    // if (replyDiv && inp) {
    // 创建一个范围，定位到回复框之后
    //   const range = document.createRange()
    //   range.setStartAfter(replyDiv)
    //   range.collapse(true)

    //   // 插入文本到回复框后面
    //   const textNode = document.createTextNode(item)
    //   range.insertNode(textNode)

    //   // 移动光标到文本后面
    //   const newRange = document.createRange()
    //   newRange.setStartAfter(textNode)
    //   newRange.collapse(true)
    //   selection?.removeAllRanges()
    //   selection?.addRange(newRange)

    //   // 触发输入事件
    //   triggerInputEvent(inp)
    // } else {
    // 没有回复框，按原来方式插入
    insertNodeAtRange(MsgEnum.TEXT, item, inp, lastEditRange)
    // }
  }

  // 记录新的选区位置
  MsgInputRef.value?.updateSelectionRange()

  // 触发输入事件
  triggerInputEvent(inp)

  // 保持焦点在输入框
  MsgInputRef.value?.focus()

  // 添加到最近使用表情列表
  updateRecentEmojis(item)
}

/**
 * 更新最近使用的表情列表
 */
const updateRecentEmojis = (emoji: string) => {
  const currentEmojis = [...historyStore.emoji]
  const index = currentEmojis.indexOf(emoji)
  if (index !== -1) {
    currentEmojis.splice(index, 1)
  }
  currentEmojis.unshift(emoji)
  const updatedEmojis = currentEmojis.slice(0, 15)
  historyStore.setEmoji(updatedEmojis)
}

const handleCap = async () => {
  let captureWindow = await WebviewWindow.getByLabel('capture')
  captureWindow?.show()
  await emitTo('capture', 'capture', true)
}

const handleVoiceRecord = () => {
  // 触发录音模式切换事件
  useMitt.emit(MittEnum.VOICE_RECORD_TOGGLE)
}

onMounted(async () => {
  if (MsgInputRef.value) {
    msgInputDom.value = MsgInputRef.value.messageInputDom
  }
})
</script>

<style scoped lang="scss">
.input-options {
  svg {
    width: 22px;
    height: 22px;
    cursor: pointer;
    &:hover {
      color: #13987f;
    }
  }
}

:deep(.n-input .n-input-wrapper) {
  padding: 0;
}
</style>
