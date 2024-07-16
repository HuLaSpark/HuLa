<template>
  <!-- 输入框 -->
  <ContextMenu class="w-full h-110px" @select="$event.click()" :menu="menuList">
    <n-scrollbar style="max-height: 110px">
      <div
        id="message-input"
        ref="messageInputDom"
        contenteditable
        spellcheck="false"
        @paste="handlePaste($event, messageInputDom)"
        @input="handleInput"
        @keydown.exact.enter="inputKeyDown"
        @keydown.exact.ctrl.enter="inputKeyDown"></div>
    </n-scrollbar>
  </ContextMenu>

  <!-- @提及框  -->
  <div v-if="ait && activeItem.type === RoomTypeEnum.GROUP && personList.length > 0" class="ait">
    <n-virtual-list
      id="image-chat-msgInput"
      ref="virtualListInst"
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
            :color="'#fff'"
            :size="22"
            :src="item.avatar"
            fallback-src="/logo.png"
            :render-placeholder="() => null"
            :intersection-observer-options="{
              root: '#image-chat-msgInput'
            }" />
          <span> {{ item.name }}</span>
        </n-flex>
      </template>
    </n-virtual-list>
  </div>

  <!-- 发送按钮 -->
  <n-config-provider :theme="lightTheme">
    <n-button-group size="small" class="pr-20px">
      <n-button
        color="#13987f"
        :disabled="msgInput.length === 0 || msgInput.trim() === ''"
        class="w-65px"
        @click="send">
        发送
      </n-button>
      <n-button color="#13987f" class="p-[0_6px]">
        <template #icon>
          <n-config-provider :theme="themes.content === ThemeEnum.DARK ? darkTheme : lightTheme">
            <n-popselect
              v-model:show="arrow"
              v-model:value="chatKey"
              :options="sendOptions"
              trigger="click"
              placement="top-end">
              <svg @click="arrow = true" v-if="!arrow" class="w-22px h-22px outline-none"><use href="#down"></use></svg>
              <svg @click="arrow = false" v-else class="w-22px h-22px outline-none"><use href="#up"></use></svg>
            </n-popselect>
          </n-config-provider>
        </template>
      </n-button>
    </n-button-group>
  </n-config-provider>
</template>
<script setup lang="ts">
import { lightTheme, darkTheme, VirtualListInst } from 'naive-ui'
import { MittEnum, RoomTypeEnum, ThemeEnum } from '@/enums'
import Mitt from '@/utils/Bus.ts'
import { CacheUserItem, MockItem } from '@/services/types.ts'
import { emit, listen } from '@tauri-apps/api/event'
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { sendOptions } from '@/views/homeWindow/more/settings/config.ts'
import { useMsgInput } from '@/hooks/useMsgInput.ts'
import { useCommon } from '@/hooks/useCommon.ts'
import { onKeyStroke } from '@vueuse/core'

const settingStore = setting()
const { themes } = storeToRefs(settingStore)
/** 发送按钮旁的箭头 */
const arrow = ref(false)
/** 输入框dom元素 */
const messageInputDom = ref()
const activeItem = ref(inject('activeItem') as MockItem)
/** 虚拟列表 */
const virtualListInst = ref<VirtualListInst>()
const { handlePaste } = useCommon()
/** 引入useMsgInput的相关方法 */
const { inputKeyDown, handleAit, handleInput, send, personList, ait, msgInput, chatKey, menuList, selectedAitKey } =
  useMsgInput(messageInputDom)

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
    virtualListInst.value?.scrollTo({ key: newList[0].uid })
    selectedAitKey.value = newList[0].uid
  }
})

/** 处理键盘上下键切换提及项 */
const handleAitKeyChange = (direction: 1 | -1) => {
  const currentIndex = personList.value.findIndex((item) => item.uid === selectedAitKey.value)
  const newIndex = Math.max(0, Math.min(currentIndex + direction, personList.value.length - 1))
  selectedAitKey.value = personList.value[newIndex].uid
  // 获取新选中项在列表中的索引，并滚动到该位置(使用key来进行定位)
  virtualListInst.value?.scrollTo({ key: selectedAitKey.value })
}

const closeMenu = (event: any) => {
  /** 需要判断点击如果不是.context-menu类的元素的时候，menu才会关闭 */
  if (!event.target.matches('#message-input, #message-input *')) {
    ait.value = false
  }
}

onMounted(() => {
  onKeyStroke('Enter', (e) => {
    if (ait.value && selectedAitKey.value > -1) {
      e.preventDefault()
      const item = personList.value.find((item) => item.uid === selectedAitKey.value) as CacheUserItem
      handleAit(item)
    }
  })
  onKeyStroke('ArrowUp', (e) => {
    e.preventDefault()
    handleAitKeyChange(-1)
  })
  onKeyStroke('ArrowDown', (e) => {
    e.preventDefault()
    handleAitKeyChange(1)
  })
  emit('aloneWin')
  nextTick(() => {
    const inputDiv = document.getElementById('message-input')
    inputDiv?.focus()
  })
  // TODO 应该把打开的窗口的item给存到set中，需要修改输入框和消息展示的搭配，输入框和消息展示模块应该是一体并且每个用户独立的，这样当我点击这个用户框输入消息的时候就可以暂存信息了并且可以判断每个消息框是什么类型是群聊还是单聊，不然会导致比如@框可以在单聊框中出现 (nyh -> 2024-04-09 01:03:59)
  /** 当不是独立窗口的时候也就是组件与组件之间进行通信然后监听信息对话的变化 */
  Mitt.on(MittEnum.MSG_BOX_SHOW, (event: any) => {
    activeItem.value = event.item
  })
  /** 这里使用的是窗口之间的通信来监听信息对话的变化 */
  listen('aloneData', (event: any) => {
    activeItem.value = { ...event.payload.item }
  })
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})

/** 导出组件方法和属性 */
defineExpose({ messageInputDom })
</script>

<style scoped lang="scss">
@import '@/styles/scss/msg-input';
</style>
