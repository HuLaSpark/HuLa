<template>
  <div class="msg-input-container">
    <!-- 录音模式 -->
    <VoiceRecorder v-show="isVoiceMode" @cancel="handleVoiceCancel" @send="sendVoiceDirect" />

    <!-- 输入框表单 -->
    <form
      v-show="!isVoiceMode"
      id="message-form"
      @submit.prevent="handleFormSubmit"
      :class="[isMobile() ? 'gap-10px ' : '']"
      class="w-full flex flex-1 min-h-0">
      <div
        class="w-full flex"
        :class="isMobile() ? 'flex flex-1 p-5px gap-2 pt-5px items-center min-h-2.25rem' : ' flex-col'">
        <div v-if="isMobile()" class="flex items-center justify-center w-6 ms-5px h-2.5rem">
          <svg
            @click="handleVoiceClick"
            :class="mobilePanelState === MobilePanelStateEnum.VOICE ? 'text-#169781' : ''"
            class="w-25px h-25px mt-2px outline-none">
            <use href="#voice"></use>
          </svg>
        </div>

        <ContextMenu class="w-full flex-1 min-h-0" @select="$event.click()" :menu="menuList">
          <n-scrollbar @click="focusInput">
            <div
              id="message-input"
              ref="messageInputDom"
              :style="{
                minHeight: isMobile() ? '2rem' : '36px',
                lineHeight: isMobile() && !msgInput ? '2rem' : '20px',
                outline: 'none'
              }"
              contenteditable
              spellcheck="false"
              @paste="onPaste($event)"
              @input="handleInternalInput"
              @keydown.exact.enter="handleEnterKey"
              @keydown.exact.meta.enter="handleEnterKey"
              @keydown="updateSelectionRange"
              @keyup="updateSelectionRange"
              @click="updateSelectionRange"
              @blur="handleBlur"
              @compositionend="updateSelectionRange"
              @keydown.exact.ctrl.enter="handleEnterKey"
              :data-placeholder="t('editor.placeholder')"
              class="n-input"
              :class="
                isMobile()
                  ? 'empty:before:content-[attr(data-placeholder)] before:text-(12px #777) p-2 min-h-2rem ps-10px! text-14px! rounded-10px! max-h-8rem! flex items-center'
                  : 'empty:before:content-[attr(data-placeholder)] before:text-(12px #777) p-2'
              "></div>
          </n-scrollbar>
        </ContextMenu>

        <!-- 发送按钮 -->
        <div
          v-if="!isMobile()"
          class="flex-shrink-0 max-h-52px p-4px pr-12px border-t border-gray-200/50 flex justify-end mb-4px">
          <n-button-group size="small">
            <n-button
              color="#13987f"
              :disabled="props.isAIMode && props.isAIStreaming ? false : disabledSend"
              class="w-65px"
              @click="handleDesktopSend">
              {{ props.isAIMode && props.isAIStreaming ? '停止思考' : t('editor.send') }}
            </n-button>
            <n-button color="#13987f" class="p-[0_6px]">
              <template #icon>
                <n-popselect
                  v-model:show="arrow"
                  v-model:value="chatKey"
                  :options="sendOptions"
                  trigger="click"
                  placement="top-end">
                  <svg @click="arrow = true" v-if="!arrow" class="w-22px h-22px mt-2px outline-none">
                    <use href="#down"></use>
                  </svg>
                  <svg @click="arrow = false" v-else class="w-22px h-22px mt-2px outline-none">
                    <use href="#up"></use>
                  </svg>
                  <template #action>
                    <n-flex
                      justify="center"
                      align="center"
                      :size="4"
                      class="text-(12px #777) cursor-default tracking-1 select-none">
                      <i18n-t keypath="editor.send_or_newline">
                        <template #send>
                          <span v-if="chatKey !== 'Enter'">
                            {{ isMac() ? MacOsKeyEnum['⌘'] : WinKeyEnum.CTRL }}
                          </span>
                          <svg class="size-12px">
                            <use href="#Enter"></use>
                          </svg>
                        </template>
                        <template #newline>
                          <n-flex align="center" :size="0">
                            {{ isMac() ? MacOsKeyEnum['⇧'] : WinKeyEnum.SHIFT }}
                            <svg class="size-12px">
                              <use href="#Enter"></use>
                            </svg>
                          </n-flex>
                        </template>
                      </i18n-t>
                    </n-flex>
                  </template>
                </n-popselect>
              </template>
            </n-button>
          </n-button-group>
        </div>

        <!-- @提及框  -->
        <div v-if="ait && activeItem?.type === RoomTypeEnum.GROUP && personList.length > 0" class="ait-options">
          <n-virtual-list
            id="image-chat-ait"
            ref="virtualListInst-ait"
            style="max-height: 180px"
            :item-size="36"
            :items="personList"
            v-model:selectedKey="selectedAitKey">
            <template #default="{ item }">
              <n-flex
                @mouseover="() => (selectedAitKey = item.uid)"
                :class="{ active: selectedAitKey === item.uid }"
                @click="handleAit(item)"
                :key="item.uid"
                align="center"
                class="ait-item">
                <n-avatar
                  lazy
                  round
                  :size="22"
                  :src="AvatarUtils.getAvatarUrl(item.avatar)"
                  :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
                  :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
                  :render-placeholder="() => null"
                  :intersection-observer-options="{
                    root: '#image-chat-ait'
                  }" />
                <span>{{ item.myName || item.name }}</span>
              </n-flex>
            </template>
          </n-virtual-list>
        </div>

        <!-- / 提及框  -->
        <div
          v-if="aiDialogVisible && activeItem?.type === RoomTypeEnum.GROUP && groupedAIModels.length > 0"
          class="AI-options">
          <n-virtual-list
            ref="virtualListInst-AI"
            style="max-height: 180px"
            :item-size="36"
            :items="groupedAIModels"
            v-model:selectedKey="selectedAIKey">
            <template #default="{ item }">
              <n-flex
                @mouseover="() => (selectedAIKey = item.uid)"
                :class="{ active: selectedAIKey === item.uid }"
                @click="handleAI(item)"
                align="center"
                class="AI-item">
                <n-flex align="center" justify="space-between" class="w-full pr-6px">
                  <n-flex align="center">
                    <img class="size-18px object-contain" :src="item.avatar" alt="" />
                    <p class="text-(14px [--chat-text-color])">{{ item.name }}</p>
                  </n-flex>

                  <n-flex align="center" :size="6">
                    <div
                      class="ml-6px p-[4px_8px] size-fit bg-[--bate-bg] rounded-6px text-(11px [--bate-color] center)">
                      Beta
                    </div>
                    <n-tag size="small" class="text-10px" :bordered="false" type="success">128k</n-tag>
                  </n-flex>
                </n-flex>
              </n-flex>
            </template>
          </n-virtual-list>
        </div>

        <div
          v-if="isMobile()"
          class="grid gap-2 h-2.5rem items-center"
          :class="msgInput ? 'grid-cols-[2rem_3rem]' : 'grid-cols-[2rem_2rem]'">
          <div class="w-full flex-center h-full">
            <svg @click="handleEmojiClick" class="w-25px h-25px mt-2px outline-none iconpark-icon">
              <use :href="mobilePanelState === MobilePanelStateEnum.EMOJI ? '#face' : '#smiling-face'"></use>
            </svg>
          </div>
          <div
            v-if="msgInput"
            class="flex-shrink-0 max-h-62px h-full border-t border-gray-200/50 flex items-center justify-end">
            <n-button-group size="small" :class="isMobile() ? 'h-full' : 'pr-20px'">
              <n-button
                color="#13987f"
                :disabled="props.isAIMode && props.isAIStreaming ? false : disabledSend"
                class="w-3rem h-full"
                @click="handleMobileSend">
                {{ props.isAIMode && props.isAIStreaming ? '停止思考' : t('editor.send') }}
              </n-button>
            </n-button-group>
          </div>
          <div v-if="!msgInput" class="flex items-center justify-start h-full">
            <svg
              @click="handleMoreClick"
              :class="mobilePanelState === MobilePanelStateEnum.MORE ? 'rotate-45' : 'rotate-0'"
              class="w-25px h-25px mt-2px outline-none iconpark-icon transition-transform duration-300 ease">
              <use href="#add-one"></use>
            </svg>
          </div>
        </div>
      </div>
    </form>

    <!-- 文件上传弹窗 -->
    <FileUploadModal
      v-model:show="showFileModal"
      :files="pendingFiles"
      @confirm="handleFileConfirm"
      @cancel="handleFileCancel" />
  </div>
</template>
<script setup lang="ts">
import { emit } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { onKeyStroke } from '@vueuse/core'
import { type VirtualListInst } from 'naive-ui'
import { storeToRefs } from 'pinia'
import type { Ref } from 'vue'
import { MacOsKeyEnum, MittEnum, RoomTypeEnum, ThemeEnum, WinKeyEnum } from '@/enums'
import { useCommon } from '@/hooks/useCommon.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useMsgInput } from '@/hooks/useMsgInput.ts'
import { useGlobalStore } from '@/stores/global'
import { useSettingStore } from '@/stores/setting.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { isMac, isMobile } from '@/utils/PlatformConstants'
import { useSendOptions } from '@/views/moreWindow/settings/config.ts'
import { useGroupStore } from '@/stores/group'
import { MobilePanelStateEnum } from '@/enums'
import { useI18n, I18nT } from 'vue-i18n'
import type { UploadFile } from '@/utils/FileType'

interface Props {
  isAIMode?: boolean
  isAIStreaming?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isAIMode: false,
  isAIStreaming: false
})

const { t } = useI18n()
const appWindow = WebviewWindow.getCurrent()
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
const { handlePaste, processFiles } = useCommon()
const sendOptions = useSendOptions()
/** 发送按钮旁的箭头 */
const arrow = ref(false)
/** 输入框dom元素 */
const messageInputDom = ref<HTMLElement>()
const gloabalStore = useGlobalStore()
const { currentSession: activeItem } = storeToRefs(gloabalStore)
/** ait 虚拟列表 */
const virtualListInstAit = useTemplateRef<VirtualListInst>('virtualListInst-ait')
/** AI 虚拟列表 */
const virtualListInstAI = useTemplateRef<VirtualListInst>('virtualListInst-AI')
// 录音模式状态
const isVoiceMode = ref(false)
const groupStore = useGroupStore()

// 文件上传弹窗状态
const showFileModal = ref(false)
const pendingFiles = ref<UploadFile[]>([])

/** 引入useMsgInput的相关方法 */
const {
  inputKeyDown,
  handleAit,
  handleAI,
  handleInput,
  msgInput,
  send,
  sendLocationDirect,
  sendFilesDirect,
  sendVoiceDirect,
  sendEmojiDirect,
  personList,
  disabledSend,
  ait,
  aiDialogVisible,
  selectedAIKey,
  chatKey,
  menuList,
  selectedAitKey,
  groupedAIModels,
  updateSelectionRange,
  focusOn,
  getCursorSelectionRange
} = useMsgInput(messageInputDom)

/** 表单提交处理函数 */
const handleFormSubmit = async (e: Event) => {
  e.preventDefault()
  await send()
}

/** 聚焦输入框函数 */
const focusInput = () => {
  if (messageInputDom.value) {
    focusOn(messageInputDom.value)
    setIsFocus(true) // 移动端适配
  }
}

/** 输入框失焦处理函数 */
const handleBlur = () => {
  setIsFocus(false) // 移动端适配
}

/** 当切换聊天对象时，重新获取焦点 */
watch(activeItem, () => {
  nextTick(() => {
    // 移动端不自动聚焦
    if (!isMobile()) {
      const inputDiv = document.getElementById('message-input')
      inputDiv?.focus()
      setIsFocus(true)
    }
  })
})

/** 当ait人员列表发生变化的时候始终select第一个 */
watch(personList, (newList) => {
  if (newList.length > 0) {
    /** 先设置滚动条滚动到第一个 */
    virtualListInstAit.value?.scrollTo({ key: newList[0].uid })
    selectedAitKey.value = newList[0].uid
  } else {
    // 无匹配用户时立即关闭@状态，放开回车键让用户可以发送消息
    ait.value = false
  }
})

// /** 当AI列表发生变化的时候始终select第一个 */
// watch(groupedAIModels, (newList) => {
//   if (newList.length > 0) {
//     /** 先设置滚动条滚动到第一个 */
//     virtualListInstAI.value?.scrollTo({ key: newList[0].uid })
//     selectedAIKey.value = newList[0].uid
//   }
// })
const handleInternalInput = (e: Event) => {
  handleInput(e)
  selfEmitter('input', e)
}

// 显示文件弹窗的回调函数
const showFileModalCallback = (files: UploadFile[]) => {
  pendingFiles.value = files
  showFileModal.value = true
}

const onPaste = async (e: ClipboardEvent) => {
  if (messageInputDom.value) await handlePaste(e, messageInputDom.value, showFileModalCallback)
}

// 处理弹窗确认
const handleFileConfirm = async (files: UploadFile[]) => {
  try {
    await sendFilesDirect(files)
  } catch (error) {
    console.error('弹窗发送文件失败:', error)
  }
  showFileModal.value = false
  pendingFiles.value = []
}

// 处理弹窗取消
const handleFileCancel = () => {
  showFileModal.value = false
  pendingFiles.value = []
}

// 处理全局拖拽文件
const handleGlobalFilesDrop = async (files: UploadFile[]) => {
  if (!files?.length || !messageInputDom.value) return
  try {
    await processFiles(files, messageInputDom.value, showFileModalCallback)
  } catch (error) {
    console.error('处理拖拽文件失败:', error)
    window.$message?.error?.('处理拖拽文件失败')
  }
}

/** 位置选择完成的回调 */
const handleLocationSelected = async (locationData: any) => {
  await sendLocationDirect(locationData)
}

/** 处理键盘上下键切换提及项 */
const handleAitKeyChange = (
  direction: 1 | -1,
  list: Ref<any[]>,
  virtualListInst: VirtualListInst,
  key: Ref<number | string | null>
) => {
  const currentIndex = list.value.findIndex((item) => item.uid === key.value)
  const newIndex = Math.max(0, Math.min(currentIndex + direction, list.value.length - 1))
  key.value = list.value[newIndex].uid
  // 获取新选中项在列表中的索引，并滚动到该位置(使用key来进行定位)
  virtualListInst?.scrollTo({ index: newIndex })
}

const closeMenu = (event: any) => {
  /** 需要判断点击如果不是.context-menu类的元素的时候，menu才会关闭 */
  if (!event.target.matches('#message-input, #message-input *')) {
    ait.value = false
  }
}

/** 禁用浏览器默认的全选快捷键，当输入框有内容或者聚焦时不禁用 */
const disableSelectAll = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === 'a') {
    const inputDiv = document.getElementById('message-input')
    // 检查输入框是否存在、是否有内容、是否聚焦
    const hasFocus = document.activeElement === inputDiv
    const hasContent = inputDiv && inputDiv.textContent && inputDiv.textContent.trim().length > 0

    // 只有当输入框没有聚焦或没有内容时才阻止默认行为
    if (!hasFocus || !hasContent) {
      e.preventDefault()
    }
  }
}

// 语音录制相关事件处理
const handleVoiceCancel = () => {
  isVoiceMode.value = false
}

// 使用枚举管理移动端面板状态
const mobilePanelState = ref<MobilePanelStateEnum>(MobilePanelStateEnum.NONE)

// 定义公共类型
interface ClickState {
  panelState: MobilePanelStateEnum
}

interface AISendData {
  content: string
}

/**
 * 自定义事件
 * clickMore: 点击更多按钮
 * clickEmoji: 点击表情按钮
 * clickVoice: 点击语音按钮
 */
const selfEmitter = defineEmits<{
  (e: 'clickMore', data: ClickState): void
  (e: 'clickEmoji', data: ClickState): void
  (e: 'clickVoice', data: ClickState): void
  (e: 'customFocus', data: ClickState): void
  (e: 'send', data: ClickState): void
  (e: 'input', event: Event): void
  (e: 'send-ai', data: AISendData): void
  (e: 'stop-ai'): void
}>()

/** 设置聚焦状态 */
const setIsFocus = (value: boolean) => {
  // 移动端：如果当前面板是打开状态（表情、语音、更多），不要因为聚焦而关闭面板
  if (
    isMobile() &&
    !value &&
    (mobilePanelState.value === MobilePanelStateEnum.EMOJI ||
      mobilePanelState.value === MobilePanelStateEnum.VOICE ||
      mobilePanelState.value === MobilePanelStateEnum.MORE)
  ) {
    // 保持当前面板状态，不关闭
    return
  }

  mobilePanelState.value = value ? MobilePanelStateEnum.FOCUS : MobilePanelStateEnum.NONE

  selfEmitter('customFocus', {
    panelState: mobilePanelState.value
  })
}

/** 点击更多按钮 */
const handleMoreClick = () => {
  mobilePanelState.value =
    mobilePanelState.value === MobilePanelStateEnum.MORE ? MobilePanelStateEnum.NONE : MobilePanelStateEnum.MORE

  selfEmitter('clickMore', {
    panelState: mobilePanelState.value
  })
}

/** 点击表情按钮 */
const handleEmojiClick = () => {
  mobilePanelState.value =
    mobilePanelState.value === MobilePanelStateEnum.EMOJI ? MobilePanelStateEnum.NONE : MobilePanelStateEnum.EMOJI

  selfEmitter('clickEmoji', {
    panelState: mobilePanelState.value
  })
}

/** 点击语音按钮 */
const handleVoiceClick = () => {
  mobilePanelState.value =
    mobilePanelState.value === MobilePanelStateEnum.VOICE ? MobilePanelStateEnum.NONE : MobilePanelStateEnum.VOICE

  selfEmitter('clickVoice', {
    panelState: mobilePanelState.value
  })
}

const getInputContent = (): string => {
  if (messageInputDom.value) {
    const innerHTML = messageInputDom.value.innerHTML || ''

    // 检查是否有表情包
    if (innerHTML.includes('data-type="emoji"')) {
      return 'emoji' // 返回非空字符串表示有内容
    }

    // 检查是否有图片
    if (innerHTML.includes('<img') || innerHTML.includes('data-type=')) {
      return 'image' // 返回非空字符串表示有内容
    }

    // 返回文本内容
    return messageInputDom.value.textContent?.trim() || ''
  }
  return ''
}

/**
 * 判断逻辑：
 * 1. 如果有选中的AI模型 -> AI发送 [暂不实现]
 * 2. 如果当前是AI对话模式 -> AI发送
 * 3. 默认 -> IM发送
 */
const determineSendType = (): 'ai' | 'im' => {
  if (props.isAIMode) {
    return 'ai'
  }
  return 'im'
}

// 手机端发送逻辑
const handleMobileSend = async () => {
  const isAi = determineSendType() === 'ai'
  if (isAi && props.isAIStreaming) {
    selfEmitter('stop-ai')
    return
  }
  const content = getInputContent()
  if (!content.trim()) {
    window.$message.warning('请输入消息内容')
    return
  }
  if (isAi) {
    await handleAISend()
  } else {
    await send()
  }

  // 发送后不关闭面板，保持当前状态
  selfEmitter('send', {
    panelState: mobilePanelState.value
  })

  // 移动端发送消息后重新聚焦输入框
  if (isMobile()) {
    focusInput()
  }
}

// 清空输入框
const clearInput = () => {
  if (messageInputDom.value) {
    messageInputDom.value.textContent = ''
    // 触发输入事件更新状态
    const event = new Event('input', { bubbles: true })
    messageInputDom.value.dispatchEvent(event)
  }
}

// AI发送逻辑
const handleAISend = async () => {
  const content = getInputContent()
  if (!content.trim()) {
    window.$message.warning('请输入消息内容')
    return
  }

  selfEmitter('send-ai', {
    content: content
  })
  clearInput()
}

// 桌面端发送逻辑
const handleDesktopSend = async () => {
  const isAi = determineSendType() === 'ai'
  if (isAi && props.isAIStreaming) {
    selfEmitter('stop-ai')
    return
  }
  const content = getInputContent()
  if (!content.trim()) {
    window.$message.warning('请输入消息内容')
    return
  }
  if (isAi) {
    await handleAISend()
  } else {
    await send()
  }
}

const handleEnterKey = (e: KeyboardEvent) => {
  if (determineSendType() === 'ai') {
    e.preventDefault()
    e.stopPropagation()
    if (props.isAIStreaming) {
      selfEmitter('stop-ai')
      return
    }
    handleAISend()
  } else {
    inputKeyDown(e)
  }
}

/** 监听移动端关闭面板 */
const listenMobilePanelHandler = () => {
  mobilePanelState.value = MobilePanelStateEnum.NONE
}

/** 监听移动端关闭面板 */
const listenMobileClosePanel = () => {
  useMitt.on(MittEnum.MOBILE_CLOSE_PANEL, listenMobilePanelHandler)
}

/** 移除移动端关闭面板 */
const removeMobileClosePanel = () => {
  useMitt.off(MittEnum.MOBILE_CLOSE_PANEL, listenMobilePanelHandler)
}

/** 导出组件方法和属性 */
defineExpose({
  messageInputDom,
  updateSelectionRange,
  focus: () => focusInput(),
  getLastEditRange: () => getCursorSelectionRange(),
  showFileModal: showFileModalCallback,
  isVoiceMode: readonly(isVoiceMode),
  handleVoiceCancel,
  sendVoiceDirect,
  sendFilesDirect,
  sendEmojiDirect,
  handleLocationSelected
})

/** 移动端专用适配事件（结束） */

onMounted(async () => {
  useMitt.on(MittEnum.GLOBAL_FILES_DROP, handleGlobalFilesDrop)
  if (isMobile()) {
    listenMobileClosePanel()
  }
  onKeyStroke('Enter', () => {
    if (ait.value && Number(selectedAitKey.value) > -1) {
      const item = personList.value.find((item) => item.uid === selectedAitKey.value)
      if (item) {
        handleAit(item)
      }
    }
    // } else if (aiDialogVisible.value && Number(selectedAIKey.value) > -1) {
    //   const item = groupedAIModels.value.find((item) => item.uid === selectedAIKey.value)
    //   if (item) {
    //     handleAI(item)
    //   }
    // }
  })
  onKeyStroke('ArrowUp', (e) => {
    e.preventDefault()
    if (ait.value) {
      handleAitKeyChange(-1, personList, virtualListInstAit.value!, selectedAitKey)
    } else if (aiDialogVisible.value) {
      handleAitKeyChange(-1, groupedAIModels, virtualListInstAI.value!, selectedAIKey)
    }
  })
  onKeyStroke('ArrowDown', (e) => {
    e.preventDefault()
    if (ait.value) {
      handleAitKeyChange(1, personList, virtualListInstAit.value!, selectedAitKey)
    } else if (aiDialogVisible.value) {
      handleAitKeyChange(1, groupedAIModels, virtualListInstAI.value!, selectedAIKey)
    }
  })
  // TODO: 暂时已经关闭了独立窗口聊天功能
  emit('aloneWin')
  nextTick(() => {
    // 移动端不自动聚焦
    if (!isMobile()) {
      const inputDiv = document.getElementById('message-input')
      inputDiv?.focus()
      setIsFocus(true)
    }
  })
  // TODO 应该把打开的窗口的item给存到set中，需要修改输入框和消息展示的搭配，输入框和消息展示模块应该是一体并且每个用户独立的，这样当我点击这个用户框输入消息的时候就可以暂存信息了并且可以判断每个消息框是什么类型是群聊还是单聊，不然会导致比如@框可以在单聊框中出现 (nyh -> 2024-04-09 01:03:59)
  /** 当不是独立窗口的时候也就是组件与组件之间进行通信然后监听信息对话的变化 */
  useMitt.on(MittEnum.AT, (event: any) => {
    handleAit(groupStore.getUserInfo(event)!)
  })
  // 监听录音模式切换事件
  useMitt.on(MittEnum.VOICE_RECORD_TOGGLE, () => {
    isVoiceMode.value = !isVoiceMode.value
  })

  // 添加ESC键退出语音模式
  onKeyStroke('Escape', () => {
    if (isVoiceMode.value) {
      isVoiceMode.value = false
    }
  })
  appWindow.listen('screenshot', async (e: any) => {
    // 确保输入框获得焦点
    if (messageInputDom.value) {
      messageInputDom.value.focus()
      try {
        // 从 ArrayBuffer 数组重建 Blob 对象
        const buffer = new Uint8Array(e.payload.buffer)
        const blob = new Blob([buffer], { type: e.payload.mimeType })
        const file = new File([blob], 'screenshot.png', { type: e.payload.mimeType })

        await processFiles([file], messageInputDom.value, showFileModalCallback)
      } catch (error) {
        console.error('处理截图失败:', error)
      }
    }
  })
  window.addEventListener('click', closeMenu, true)
  window.addEventListener('keydown', disableSelectAll)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
  window.removeEventListener('keydown', disableSelectAll)
  useMitt.off(MittEnum.GLOBAL_FILES_DROP, handleGlobalFilesDrop)
  if (isMobile()) {
    removeMobileClosePanel()
  }
})

watch(
  () => props.isAIMode,
  (newValue) => {
    if (!newValue) {
      selectedAIKey.value = null
    }
  }
)
</script>

<style scoped lang="scss">
@use '@/styles/scss/msg-input';
// 传递 props 到子组件是新增了一个div 适配样式
.msg-input-container {
  display: contents;
}
</style>
