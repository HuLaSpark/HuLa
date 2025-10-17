<template>
  <!-- 录音模式 -->
  <VoiceRecorder v-if="!isMobile()" v-show="isVoiceMode" @cancel="handleVoiceCancel" @send="sendVoiceDirect" />

  <!-- 输入框表单 -->
  <form
    v-show="!isVoiceMode"
    id="message-form"
    @submit.prevent="handleFormSubmit"
    :class="[isMobile() ? 'gap-10px ' : '']"
    class="w-full flex flex-1 min-h-0">
    <div
      class="w-full"
      :class="isMobile() ? 'bg-gray-100 flex flex-1 p-5px gap-2 pt-5px items-end bg-white min-h-2.25rem' : ''">
      <div v-if="isMobile()" class="flex items-center justify-center w-14 h-2.5rem">
        <svg
          @click="handleVoiceClick"
          :class="currentPanelState === MobilePanelState.VOICE ? 'text-#169781' : ''"
          class="w-25px h-25px mt-2px outline-none">
          <use href="#voice"></use>
        </svg>
      </div>

      <ContextMenu
        class="w-full"
        :style="{ height: isMobile() ? 'auto' : `${props.height - 108}px` }"
        @select="$event.click()"
        :menu="menuList">
        <n-scrollbar @click="focusInput">
          <div
            id="message-input"
            ref="messageInputDom"
            :style="{
              minHeight: isMobile() ? '2rem' : '36px',
              lineHeight: isMobile() && !msgInput ? '2rem' : '20px',
              outline: 'none',
              backgroundColor: props.disabled ? 'rgb(219, 219, 219) !important' : ''
            }"
            :contenteditable="!props.disabled"
            spellcheck="false"
            @paste="onPaste($event)"
            @input="handleInput"
            @keydown.exact.enter="inputKeyDown"
            @keydown.exact.meta.enter="inputKeyDown"
            @keydown="updateSelectionRange"
            @keyup="updateSelectionRange"
            @click="updateSelectionRange"
            @blur="handleBlur"
            @compositionend="updateSelectionRange"
            @keydown.exact.ctrl.enter="inputKeyDown"
            data-placeholder="善言一句暖人心，恶语一句伤人心"
            :class="[
              isMobile()
                ? 'empty:before:content-[attr(data-placeholder)] before:text-(12px #777) ps-10px! p-2 text-14px! bg-white! rounded-10px! max-h-8rem! flex items-center'
                : 'empty:before:content-[attr(data-placeholder)] before:text-(12px #777) p-2'
            ]"></div>
        </n-scrollbar>
      </ContextMenu>

      <!-- 发送按钮 -->
      <div
        v-if="!isMobile()"
        class="flex-shrink-0 max-h-52px p-4px pr-12px border-t border-gray-200/50 flex items-center justify-end">
        <n-config-provider :theme="lightTheme">
          <n-button-group size="small">
            <n-button color="#13987f" :disabled="disabledSend" class="w-65px" @click="handleSend">发送</n-button>
            <n-button color="#13987f" class="p-[0_6px]">
              <template #icon>
                <n-config-provider :theme="themes.content === ThemeEnum.DARK ? darkTheme : lightTheme">
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
                        <span v-if="chatKey !== 'Enter'">
                          {{ isMac() ? MacOsKeyEnum['⌘'] : WinKeyEnum.CTRL }}
                        </span>
                        <svg class="size-12px">
                          <use href="#Enter"></use>
                        </svg>
                        发送 /
                        <n-flex v-if="chatKey !== 'Enter'" align="center" :size="6">
                          <svg class="size-12px">
                            <use href="#Enter"></use>
                          </svg>
                          <p>或</p>
                        </n-flex>
                        <n-flex align="center" :size="0">
                          {{ isMac() ? MacOsKeyEnum['⇧'] : WinKeyEnum.SHIFT }}
                          <svg class="size-12px">
                            <use href="#Enter"></use>
                          </svg>
                        </n-flex>
                        换行
                      </n-flex>
                    </template>
                  </n-popselect>
                </n-config-provider>
              </template>
            </n-button>
          </n-button-group>
        </n-config-provider>
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
                  <div class="ml-6px p-[4px_8px] size-fit bg-[--bate-bg] rounded-6px text-(11px [--bate-color] center)">
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
        <div class="w-full items-center flex justify-center h-full">
          <svg @click="handleEmojiClick" class="w-25px h-25px mt-2px outline-none iconpark-icon">
            <use :href="currentPanelState === MobilePanelState.EMOJI ? '#face' : '#smiling-face'"></use>
          </svg>
        </div>
        <div
          v-if="msgInput && !props.disabled"
          class="flex-shrink-0 max-h-62px h-full border-t border-gray-200/50 flex items-center justify-end">
          <n-config-provider class="h-full" :theme="lightTheme">
            <n-button-group size="small" :class="isMobile() ? 'h-full' : 'pr-20px'">
              <n-button color="#13987f" :disabled="disabledSend" class="w-3rem h-full" @click="handleMobileSend">
                发送
              </n-button>
            </n-button-group>
          </n-config-provider>
        </div>
        <div v-if="!msgInput || props.disabled" class="flex items-center justify-start h-full">
          <svg
            @click="handleMoreClick"
            :class="currentPanelState === MobilePanelState.MORE ? 'rotate-45' : 'rotate-0'"
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
</template>
<script setup lang="ts">
import { emit } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { onKeyStroke } from '@vueuse/core'
import { darkTheme, lightTheme, type VirtualListInst } from 'naive-ui'
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
import { sendOptions } from '@/views/moreWindow/settings/config.ts'
import { useGroupStore } from '@/stores/group'

const appWindow = WebviewWindow.getCurrent()
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
const { handlePaste, processFiles } = useCommon()
/** 发送按钮旁的箭头 */
const arrow = ref(false)
/** 输入框dom元素 */
const messageInputDom = ref<HTMLElement>()
const gloabalStore = useGlobalStore()
const activeItem = gloabalStore.currentSession!
/** ait 虚拟列表 */
const virtualListInstAit = useTemplateRef<VirtualListInst>('virtualListInst-ait')
/** AI 虚拟列表 */
const virtualListInstAI = useTemplateRef<VirtualListInst>('virtualListInst-AI')
// 录音模式状态
const isVoiceMode = ref(false)
const groupStore = useGroupStore()

// 文件上传弹窗状态
const showFileModal = ref(false)
const pendingFiles = ref<File[]>([])

// 输入框滚动区域高度计算
const props = defineProps<{
  height: number
  disabled?: boolean
  disabledFocus?: boolean
}>()

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
  personList,
  disabledSend,
  ait,
  aiDialogVisible,
  selectedAIKey,
  chatKey,
  menuList,
  selectedAitKey,
  groupedAIModels,
  getCursorSelectionRange,
  updateSelectionRange,
  focusOn
} = useMsgInput(messageInputDom)

/** 移动端专用适配变量（开始） */
// const isFocus = ref(false) // 当前是否聚焦

// const isClickedVoice = ref(false)
// const isClickedEmoji = ref(false)
// const isClickedMore = ref(false)

/** 移动端专用适配变量（结束） */

const handleSend = async () => {
  try {
    await send()
  } catch (error: any) {
    window.$message.warning(error?.message)
  }
}

/** 表单提交处理函数 */
const handleFormSubmit = async (e: Event) => {
  e.preventDefault()
  await handleSend()
  focusInput()
}

/** 直接发送位置消息 */
const handleLocationSelected = async (locationData: any) => {
  try {
    await sendLocationDirect(locationData)
  } catch (error) {
    console.error('发送位置消息失败:', error)
    window.$message.error('发送位置消息失败')
  }
}

/** 聚焦输入框函数 */
const focusInput = () => {
  // 如果输入框被禁用，则只关闭当前面板，不设置聚焦状态
  if (props.disabled && isMobile()) {
    // 关闭当前面板（语音面板）
    closePanel()
    return
  }
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

/** 当AI列表发生变化的时候始终select第一个 */
watch(groupedAIModels, (newList) => {
  if (newList.length > 0) {
    /** 先设置滚动条滚动到第一个 */
    virtualListInstAI.value?.scrollTo({ key: newList[0].uid })
    selectedAIKey.value = newList[0].uid
  } else {
    // 无AI候选时立即关闭弹层并清空选中项，避免残留状态阻挡回车发送
    selectedAIKey.value = null
    aiDialogVisible.value = false
  }
})

// 显示文件弹窗的回调函数
const showFileModalCallback = (files: File[]) => {
  pendingFiles.value = files
  showFileModal.value = true
}

const onPaste = async (e: ClipboardEvent) => {
  if (messageInputDom.value) await handlePaste(e, messageInputDom.value, showFileModalCallback)
}

// 处理弹窗确认
const handleFileConfirm = async (files: File[]) => {
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

// 添加强制退出语音模式的方法
const exitVoiceMode = () => {
  isVoiceMode.value = false
  console.log('强制退出语音模式')
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

/**
 * 恢复编辑器焦点
 */
const focus = () => {
  const editor = messageInputDom.value
  if (editor) focusOn(editor)
}

// 语音录制相关事件处理
const handleVoiceCancel = () => {
  isVoiceMode.value = false
}

onMounted(async () => {
  onKeyStroke('Enter', () => {
    if (ait.value && Number(selectedAitKey.value) > -1) {
      const item = personList.value.find((item) => item.uid === selectedAitKey.value)
      if (item) {
        handleAit(item)
      }
    } else if (aiDialogVisible.value && selectedAIKey.value != null) {
      const item = groupedAIModels.value.find((item) => item.uid === selectedAIKey.value)
      if (item) {
        handleAI(item)
      }
    }
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
    console.log('语音模式切换:', isVoiceMode.value ? '语音模式' : '文本模式')
  })

  // 添加ESC键退出语音模式
  onKeyStroke('Escape', () => {
    if (isVoiceMode.value) {
      isVoiceMode.value = false
      console.log('ESC键退出语音模式')
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
})

/**
 *
 *
 *
 *
 * 移动端专用适配事件（开始）
 *
 *
 *
 *  */

// 定义移动端面板状态枚举
enum MobilePanelState {
  NONE = 'none',
  MORE = 'more',
  EMOJI = 'emoji',
  VOICE = 'voice',
  FOCUS = 'focus'
}

// 当前激活的面板状态
const currentPanelState = ref<MobilePanelState>(MobilePanelState.NONE)

/**
 * 自定义事件
 * clickMore: 点击更多按钮
 * clickEmoji: 点击表情按钮
 * clickVoice: 点击语音按钮
 */
const selfEmitter = defineEmits(['clickMore', 'clickEmoji', 'clickVoice', 'customFocus', 'send'])

// 计算属性：根据当前状态生成事件数据
const getPanelStateData = () => ({
  isClickedMore: currentPanelState.value === MobilePanelState.MORE,
  isClickedEmoji: currentPanelState.value === MobilePanelState.EMOJI,
  isClickedVoice: currentPanelState.value === MobilePanelState.VOICE,
  isFocus: currentPanelState.value === MobilePanelState.FOCUS
})

/** 设置聚焦状态 */
const setIsFocus = (value: boolean) => {
  // 判断设置时如果任意三个按钮中的一个被点击，那就不发送事件

  currentPanelState.value = value ? MobilePanelState.FOCUS : MobilePanelState.NONE

  const data = (currentPanelState.value = (value ? MobilePanelState.FOCUS : MobilePanelState.NONE) as MobilePanelState)

  switch (data) {
    case MobilePanelState.MORE:
      return
    case MobilePanelState.EMOJI:
      return
    case MobilePanelState.VOICE:
      return
    case MobilePanelState.FOCUS:
      selfEmitter('customFocus', getPanelStateData())
      break
    default:
      break
  }

  // if (data === MobilePanelState.FOCUS) {
  //   selfEmitter('customFocus', getPanelStateData())
  // }
}

/** 点击更多按钮 */
const handleMoreClick = () => {
  // 如果已经是 MORE 状态，则切换为 NONE；否则切换为 MORE
  currentPanelState.value =
    currentPanelState.value === MobilePanelState.MORE ? MobilePanelState.NONE : MobilePanelState.MORE
  selfEmitter('clickMore', getPanelStateData())
}

/** 点击表情按钮 */
const handleEmojiClick = () => {
  // 如果已经是 EMOJI 状态，则切换为 NONE；否则切换为 EMOJI
  currentPanelState.value =
    currentPanelState.value === MobilePanelState.EMOJI ? MobilePanelState.NONE : MobilePanelState.EMOJI
  selfEmitter('clickEmoji', getPanelStateData())
}

/** 点击语音按钮 */
const handleVoiceClick = () => {
  console.log('点击语音')
  // 如果已经是 VOICE 状态，则切换为 NONE；否则切换为 VOICE
  currentPanelState.value =
    currentPanelState.value === MobilePanelState.VOICE ? MobilePanelState.NONE : MobilePanelState.VOICE
  selfEmitter('clickVoice', getPanelStateData())
}

const handleMobileSend = async () => {
  await handleSend()
  const inputDiv = document.getElementById('message-input')
  inputDiv?.focus()
  selfEmitter('send', getPanelStateData())
}

const closePanel = () => {
  currentPanelState.value = MobilePanelState.NONE
  // 触发事件通知父组件更新状态（包括解除禁用）
  selfEmitter('clickVoice', getPanelStateData())
}

const cancelFocus = () => {
  console.log('取消聚焦：')
  if (messageInputDom.value) {
    setTimeout(() => {
      messageInputDom!.value!.blur()
      setIsFocus(false)
      console.log('取消聚焦成功')
    }, 0)
  }
}

/** 移动端专用适配事件（结束） */

/** 导出组件方法和属性 */
defineExpose({
  messageInputDom,
  getLastEditRange: () => getCursorSelectionRange(),
  updateSelectionRange,
  focus,
  showFileModal: showFileModalCallback,
  exitVoiceMode,
  isVoiceMode: readonly(isVoiceMode),
  handleLocationSelected,
  handleVoiceCancel,
  closePanel, // 关闭语音输入面板（用于移动端）
  cancelFocus,
  sendVoiceDirect,
  sendFilesDirect
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/msg-input';
</style>
