<template>
  <!-- 输入框 -->
  <ContextMenu class="w-full h-110px" @select="$event.click()" :menu="menuList">
    <n-scrollbar style="max-height: 110px">
      <div
        id="message-input"
        ref="messageInputDom"
        contenteditable
        spellcheck="false"
        @paste="handlePaste"
        @input="handleInput"
        @keydown.exact.enter="inputKeyDown"
        @keydown.exact.ctrl.enter="inputKeyDown"></div>
    </n-scrollbar>
  </ContextMenu>

  <!-- @提及框  -->
  <div v-if="ait && activeItem.type === RoomTypeEnum.GROUP && filteredList.length > 0" class="ait">
    <n-virtual-list id="image-chat-msgInput" style="max-height: 180px" :item-size="36" :items="filteredList">
      <template #default="{ item }">
        <n-flex @click="handleAit(item)" :key="item.key" align="center" class="ait-item">
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
          <span> {{ item.accountName }}</span>
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
import { lightTheme, darkTheme } from 'naive-ui'
import { MittEnum, RoomTypeEnum, ThemeEnum } from '@/enums'
import Mitt from '@/utils/Bus.ts'
import { MockItem } from '@/services/types.ts'
import { emit, listen } from '@tauri-apps/api/event'
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { sendOptions } from '@/views/home-window/more/settings/config.ts'
import { useMsgInput } from '@/hooks/useMsgInput.ts'

const settingStore = setting()
const { themes } = storeToRefs(settingStore)
/* 发送按钮旁的箭头 */
const arrow = ref(false)
// 输入框dom元素
const messageInputDom = ref()
const activeItem = ref(inject('activeItem') as MockItem)
/* 引入useMsgInput的相关方法 */
const {
  handlePaste,
  insertNode,
  triggerInputEvent,
  inputKeyDown,
  handleAit,
  handleInput,
  send,
  filteredList,
  ait,
  msgInput,
  chatKey,
  menuList
} = useMsgInput(messageInputDom)

/* 当切换聊天对象时，重新获取焦点 */
watch(activeItem, () => {
  nextTick(() => {
    const inputDiv = document.getElementById('message-input')
    inputDiv?.focus()
  })
})

const closeMenu = (event: any) => {
  /* 需要判断点击如果不是.context-menu类的元素的时候，menu才会关闭 */
  if (!event.target.matches('#message-input, #message-input *')) {
    ait.value = false
  }
}

onMounted(() => {
  emit('aloneWin')
  nextTick(() => {
    const inputDiv = document.getElementById('message-input')
    inputDiv?.focus()
  })
  // TODO 应该把打开的窗口的item给存到set中，需要修改输入框和消息展示的搭配，输入框和消息展示模块应该是一体并且每个用户独立的，这样当我点击这个用户框输入消息的时候就可以暂存信息了并且可以判断每个消息框是什么类型是群聊还是单聊，不然会导致比如@框可以在单聊框中出现 (nyh -> 2024-04-09 01:03:59)
  /* 当不是独立窗口的时候也就是组件与组件之间进行通信然后监听信息对话的变化 */
  Mitt.on(MittEnum.MSG_BOX_SHOW, (event: any) => {
    activeItem.value = event.item
  })
  /* 这里使用的是窗口之间的通信来监听信息对话的变化 */
  listen('aloneData', (event: any) => {
    activeItem.value = { ...event.payload.item }
  })
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})

/* 导出组件方法和属性 */
defineExpose({ messageInputDom, triggerInputEvent, insertNode })
</script>

<style scoped lang="scss">
#message-input {
  padding: 4px 24px 4px 4px; /* 输入框内填充 */
  font-size: 14px; /* 字体大小 */
  color: inherit; /* 继承颜色 */
  cursor: text; /* 文本输入光标 */
  resize: none; /* 不允许调整尺寸 */
  background: none; /* 无背景 */
  border: none; /* 边框样式，可根据需求修改 */
  border-radius: 0; /* 边框圆角 */
  outline: none; /* 点击时无轮廓 */
  min-height: 90px; /* 最小高度 */
  line-height: 20px; /* 行高 */
  overflow: auto; /* 内容过多时允许滚动 */
  flex: 1; /* 弹性盒自适应填充可用空间 */
  caret-color: #13987f; /* 光标颜色，可根据需求调整 */
  white-space: pre-wrap; /* 保留空白符号并正常换行 */
  word-break: break-word; /* 在长单词或URL地址内部进行换行 */
}
.ait {
  @apply w-200px h-fit max-h-190px bg-[--center-bg-color] rounded-8px p-[5px_0_5px_5px];
  box-shadow: 2px 2px 12px 2px var(--box-shadow-color);
  border: 1px solid var(--box-shadow-color);
  .ait-item {
    @apply h-26px text-[--text-color] text-14px p-[5px_0_5px_10px] mr-5px rounded-6px hover:bg-[--bg-group-hover] cursor-pointer;
  }
}
</style>
