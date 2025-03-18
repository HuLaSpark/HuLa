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
                <svg @click="open()"><use href="#file2"></use></svg>
                <svg style="width: 14px; height: 14px"><use href="#down"></use></svg>
              </div>
            </template>
            <span>文件</span>
          </n-popover>
          <n-popover trigger="hover" :show-arrow="false" placement="bottom">
            <template #trigger>
              <svg @click="open({ accept: 'image/**' })" class="mr-18px"><use href="#photo"></use></svg>
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
              <svg class="mr-18px"><use href="#voice"></use></svg>
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
import { useFileDialog } from '@vueuse/core'
import { LimitEnum, MsgEnum, RoomTypeEnum } from '@/enums'
import { SelectionRange, useCommon } from '@/hooks/useCommon.ts'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emitTo } from '@tauri-apps/api/event'
import { useGlobalStore } from '@/stores/global.ts'
import type { ContactItem, SessionItem } from '@/services/types'
import { useContactStore } from '@/stores/contacts'
import { useHistoryStore } from '@/stores/history'

const { id } = defineProps<{
  id: SessionItem['id']
}>()
const globalStore = useGlobalStore()
const contactStore = useContactStore()
const historyStore = useHistoryStore()
const { open, onChange, reset } = useFileDialog()
const MsgInputRef = ref()
const msgInputDom = ref<HTMLInputElement | null>(null)
const emojiShow = ref(false)
const recentlyTip = ref(false)
const recentEmojis = computed(() => {
  return historyStore.emoji.slice(0, 15)
})
const { insertNodeAtRange, triggerInputEvent, imgPaste, FileOrVideoPaste } = useCommon()

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
    lastEditRange.range.insertNode(imgElement)

    // 移动光标到图片后面
    const range = document.createRange()
    range.setStartAfter(imgElement)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)
  } else {
    // 如果是普通表情，作为文本插入
    insertNodeAtRange(MsgEnum.TEXT, item, inp, lastEditRange)
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

onChange((files) => {
  if (!files) return
  if (files.length > LimitEnum.COM_COUNT) {
    window.$message.warning(`一次性只能上传${LimitEnum.COM_COUNT}个文件或图片`)
    return
  }
  for (let file of files) {
    // 检查文件大小
    let fileSizeInMB = file.size / 1024 / 1024 // 将文件大小转换为兆字节(MB)
    if (fileSizeInMB > 300) {
      window.$message.warning(`文件 ${file.name} 超过300MB`)
      continue // 如果文件大小超过300MB，就跳过这个文件，处理下一个文件
    }
    let type = file.type
    if (type.startsWith('image/')) {
      imgPaste(file, MsgInputRef.value.messageInputDom)
    } else if (type.startsWith('video/')) {
      // 处理视频粘贴
      FileOrVideoPaste(file, MsgEnum.VIDEO, MsgInputRef.value.messageInputDom)
    } else {
      // 处理文件粘贴
      FileOrVideoPaste(file, MsgEnum.FILE, MsgInputRef.value.messageInputDom)
    }
  }
  reset()
})

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
