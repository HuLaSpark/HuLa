<template>
  <!-- 录音模式 -->
  <VoiceRecorder v-if="isVoiceMode" @cancel="handleVoiceCancel" @send="handleVoiceSend" />

  <!-- 输入框 -->
  <ContextMenu v-else class="w-full h-110px" @select="$event.click()" :menu="menuList">
    <n-scrollbar style="max-height: 100px">
      <div
        id="message-input"
        ref="messageInputDom"
        style="outline: none"
        contenteditable
        spellcheck="false"
        @paste="onPaste($event)"
        @input="handleInput"
        @keydown.exact.enter="inputKeyDown"
        @keydown.exact.meta.enter="inputKeyDown"
        @keydown="updateSelectionRange"
        @keyup="updateSelectionRange"
        @click="updateSelectionRange"
        @compositionend="updateSelectionRange"
        @keydown.exact.ctrl.enter="inputKeyDown"
        data-placeholder="善言一句暖人心，恶语一句伤人心"
        class="empty:before:content-[attr(data-placeholder)] before:text-(12px #777)"></div>
    </n-scrollbar>
  </ContextMenu>

  <!-- @提及框  -->
  <div
    v-if="ait && activeItem?.type === RoomTypeEnum.GROUP && personList.length > 0 && !isVoiceMode"
    class="ait-options">
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
            fallback-src="/logo.png"
            :render-placeholder="() => null"
            :intersection-observer-options="{
              root: '#image-chat-ait'
            }" />
          <span> {{ item.name }}</span>
        </n-flex>
      </template>
    </n-virtual-list>
  </div>

  <!-- / 提及框  -->
  <div
    v-if="aiDialogVisible && !isVoiceMode && activeItem?.type === RoomTypeEnum.GROUP && groupedAIModels.length > 0"
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

  <!-- 发送按钮 -->
  <n-flex v-if="!isVoiceMode" align="center" justify="space-between" :size="12">
    <n-config-provider :theme="lightTheme">
      <n-button-group size="small" class="pr-20px">
        <n-button color="#13987f" :disabled="disabledSend" class="w-65px" @click="send"> 发送 </n-button>
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
                      {{ type() === 'macos' ? MacOsKeyEnum['⌘'] : WinKeyEnum.CTRL }}
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
                      {{ type() === 'macos' ? MacOsKeyEnum['⇧'] : WinKeyEnum.SHIFT }}
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
  </n-flex>

  <!-- 文件上传弹窗 -->
  <FileUploadModal
    v-model:show="showFileModal"
    :files="pendingFiles"
    @confirm="handleFileConfirm"
    @cancel="handleFileCancel" />
</template>
<script setup lang="ts">
import { type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { lightTheme, darkTheme, VirtualListInst } from 'naive-ui'
import { MacOsKeyEnum, MittEnum, RoomTypeEnum, ThemeEnum, WinKeyEnum } from '@/enums'
import { CacheUserItem, SessionItem } from '@/services/types.ts'
import { emit } from '@tauri-apps/api/event'
import { useSettingStore } from '@/stores/setting.ts'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { sendOptions } from '@/views/moreWindow/settings/config.ts'
import { useMsgInput } from '@/hooks/useMsgInput.ts'
import { useCommon } from '@/hooks/useCommon.ts'
import { onKeyStroke } from '@vueuse/core'
import { type } from '@tauri-apps/plugin-os'
import { useUserInfo } from '@/hooks/useCached.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useTauriListener } from '@/hooks/useTauriListener'

const appWindow = WebviewWindow.getCurrent()
const { addListener } = useTauriListener()
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
const { handlePaste } = useCommon()
/** 发送按钮旁的箭头 */
const arrow = ref(false)
/** 输入框dom元素 */
const messageInputDom = ref<HTMLElement>()
const activeItem = ref<SessionItem>()
/** ait 虚拟列表 */
const virtualListInstAit = useTemplateRef<VirtualListInst>('virtualListInst-ait')
/** AI 虚拟列表 */
const virtualListInstAI = useTemplateRef<VirtualListInst>('virtualListInst-AI')
// 录音模式状态
const isVoiceMode = ref(false)

// 文件上传弹窗状态
const showFileModal = ref(false)
const pendingFiles = ref<File[]>([])

/** 引入useMsgInput的相关方法 */
const {
  inputKeyDown,
  handleAit,
  handleAI,
  handleInput,
  send,
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

/** 当切换聊天对象时，重新获取焦点 */
watch(activeItem, () => {
  nextTick(() => {
    const inputDiv = document.getElementById('message-input')
    inputDiv?.focus()
  })
})

/** 当ait人员列表发生变化的时候始终select第一个 */
watch(personList, (newList) => {
  if (newList.length > 0) {
    /** 先设置滚动条滚动到第一个 */
    virtualListInstAit.value?.scrollTo({ key: newList[0].uid })
    selectedAitKey.value = newList[0].uid
  }
})

/** 当AI列表发生变化的时候始终select第一个 */
watch(groupedAIModels, (newList) => {
  if (newList.length > 0) {
    /** 先设置滚动条滚动到第一个 */
    virtualListInstAI.value?.scrollTo({ key: newList[0].uid })
    selectedAIKey.value = newList[0].uid
  }
})

// 显示文件弹窗的回调函数
const showFileModalCallback = (files: File[]) => {
  pendingFiles.value = files
  showFileModal.value = true
}

const onPaste = async (e: ClipboardEvent) => {
  console.log('粘贴：', e)
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

/** 处理键盘上下键切换提及项 */
const handleAitKeyChange = (
  direction: 1 | -1,
  list: Ref<any[]>,
  virtualListInst: VirtualListInst,
  key: Ref<number | string>
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

// 处理发送语音消息
const handleVoiceSend = async (voiceData: any) => {
  isVoiceMode.value = false
  await sendVoiceDirect(voiceData)
}

/** 导出组件方法和属性 */
defineExpose({
  messageInputDom,
  getLastEditRange: () => getCursorSelectionRange(),
  updateSelectionRange,
  focus,
  showFileModal: showFileModalCallback
})

onMounted(async () => {
  activeItem.value = inject('activeItem') as SessionItem
  onKeyStroke('Enter', () => {
    if (ait.value && Number(selectedAIKey.value) > -1) {
      const item = personList.value.find((item) => item.uid === selectedAitKey.value) as CacheUserItem
      handleAit(item)
    } else if (aiDialogVisible.value && Number(selectedAIKey.value) > -1) {
      const item = groupedAIModels.value.find((item) => item.uid === selectedAIKey.value)
      handleAI(item)
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
    const inputDiv = document.getElementById('message-input')
    inputDiv?.focus()
  })
  // TODO 应该把打开的窗口的item给存到set中，需要修改输入框和消息展示的搭配，输入框和消息展示模块应该是一体并且每个用户独立的，这样当我点击这个用户框输入消息的时候就可以暂存信息了并且可以判断每个消息框是什么类型是群聊还是单聊，不然会导致比如@框可以在单聊框中出现 (nyh -> 2024-04-09 01:03:59)
  /** 当不是独立窗口的时候也就是组件与组件之间进行通信然后监听信息对话的变化 */

  useMitt.on(MittEnum.MSG_BOX_SHOW, (event: any) => {
    activeItem.value = event.item
  })
  useMitt.on(MittEnum.AT, (event: any) => {
    handleAit(useUserInfo(event).value as any)
  })
  // 监听录音模式切换事件
  useMitt.on(MittEnum.VOICE_RECORD_TOGGLE, () => {
    isVoiceMode.value = !isVoiceMode.value
  })
  /** 这里使用的是窗口之间的通信来监听信息对话的变化 */
  await addListener(
    appWindow.listen('aloneData', (event: any) => {
      activeItem.value = { ...event.payload.item }
    })
  )
  window.addEventListener('click', closeMenu, true)
  window.addEventListener('keydown', disableSelectAll)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
  window.removeEventListener('keydown', disableSelectAll)
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/msg-input';
</style>
