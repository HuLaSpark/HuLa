<template>
  <!-- 输入框 -->
  <ContextMenu class="w-full h-110px" @select="$event.click()" :menu="menuList">
    <n-scrollbar style="max-height: 100px">
      <div
        id="message-input"
        ref="messageInputDom"
        style="outline: none"
        contenteditable
        spellcheck="false"
        @paste="handlePaste($event, messageInputDom)"
        @input="handleInput"
        @keydown.exact.enter="inputKeyDown"
        @keydown.exact.meta.enter="inputKeyDown"
        @keydown.exact.ctrl.enter="inputKeyDown"></div>
      <!-- TODO 这里的在win上会有延迟显示的bug (nyh -> 2024-09-01 23:40:44) -->
      <span
        v-if="isEntering"
        @click.stop="messageInputDom.focus()"
        class="absolute select-none top-8px left-6px w-fit text-(12px #777)">
        聊点什么吧...
      </span>
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

  <!-- 发送按钮 TODO 建议不要放在外面会影响视觉效果，可以放在发送按钮里面做提示，发送按钮需要修改一下大小 (nyh -> 2024-09-01 23:41:34) -->
  <n-flex align="center" justify="space-between" :size="12">
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
                    <svg class="size-12px"><use href="#Enter"></use></svg>
                    发送/
                    <n-flex align="center" :size="0">
                      {{ type() === 'macos' ? MacOsKeyEnum['⇧'] : WinKeyEnum.SHIFT }}
                      <svg class="size-12px"><use href="#Enter"></use></svg>
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
</template>
<script setup lang="ts">
import { lightTheme, darkTheme, VirtualListInst } from 'naive-ui'
import { MacOsKeyEnum, MittEnum, RoomTypeEnum, ThemeEnum, WinKeyEnum } from '@/enums'
import Mitt from '@/utils/Bus.ts'
import { CacheUserItem, MockItem } from '@/services/types.ts'
import { emit, listen } from '@tauri-apps/api/event'
import { setting } from '@/stores/setting.ts'
import { sendOptions } from '@/views/homeWindow/more/settings/config.ts'
import { useMsgInput } from '@/hooks/useMsgInput.ts'
import { useCommon } from '@/hooks/useCommon.ts'
import { onKeyStroke } from '@vueuse/core'
import { type } from '@tauri-apps/plugin-os'

const settingStore = setting()
const { themes } = storeToRefs(settingStore)
/** 发送按钮旁的箭头 */
const arrow = ref(false)
/** 输入框dom元素 */
const messageInputDom = ref()
const activeItem = ref(inject('activeItem') as MockItem)
/** 虚拟列表 */
const virtualListInst = ref<VirtualListInst>()
/** 是否处于输入状态 */
const isEntering = computed(() => {
  return msgInput.value === ''
})
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
@use '@/styles/scss/msg-input';
</style>
