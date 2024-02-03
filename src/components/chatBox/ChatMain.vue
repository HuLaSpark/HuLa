<template>
  <!-- 顶部操作栏和显示用户名 -->
  <div
    class="relative flex-y-center justify-between pl-20px pr-20px pt-8px pb-12px select-none shadow-[0_4px_4px_rgba(0,0,0,0.08)]">
    <div>宝贝🐶{{ activeItem }} ⛅</div>
    <!-- 顶部右边选项栏 -->
    <div class="options flex-y-center gap-20px">
      <div class="options-box">
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
          <template #trigger>
            <div>
              <svg @click="handleClick"><use href="#phone-telephone"></use></svg>
            </div>
          </template>
          <span>语言通话</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
          <template #trigger>
            <div>
              <svg><use href="#video-one"></use></svg>
            </div>
          </template>
          <span>视频通话</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
          <template #trigger>
            <div>
              <svg><use href="#screen-sharing"></use></svg>
            </div>
          </template>
          <span>屏幕共享</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
          <template #trigger>
            <div>
              <svg><use href="#remote-control"></use></svg>
            </div>
          </template>
          <span>远程协助</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
          <template #trigger>
            <div>
              <svg><use href="#launch"></use></svg>
            </div>
          </template>
          <span>发起群聊</span>
        </n-popover>
      </div>

      <div class="options-box" @click="sidebarShow = !sidebarShow">
        <svg><use href="#more"></use></svg>
      </div>
    </div>

    <!-- 侧边选项栏 -->
    <transition name="sidebar">
      <div
        v-if="sidebarShow"
        style="border: 1px solid rgba(90, 90, 90, 0.1)"
        class="flex flex-col absolute top-44px right-0 z-999 bg-#f0f0f0 p-22px box-border w-320px h-100vh shadow-[0_14px_14px_rgba(0,0,0,0.35)]">
        <div class="setting-item flex-col-y-center">
          <div class="flex-between-center">
            <p>设为置顶</p>
            <n-switch size="small" />
          </div>
          <div class="h-1px bg-#f1f1f1 m-[10px_0]"></div>
          <div class="flex-between-center">
            <p>消息免打扰</p>
            <n-switch size="small" />
          </div>
        </div>

        <div class="setting-item">
          <div class="flex-between-center">
            <p>屏蔽此人</p>
            <n-switch size="small" />
          </div>
        </div>

        <div class="setting-item cursor-pointer" @click="handleDelete('chat-history')">
          <p>删除聊天记录</p>
        </div>

        <div class="setting-item flex-x-center cursor-pointer" @click="handleDelete('friends')">
          <p class="color-#d03553">删除好友</p>
        </div>

        <p class="m-[0_auto] text-#059669 font-size-12px mt-20px cursor-pointer">被骚扰了?&nbsp;&nbsp;举报该用户</p>
      </div>
    </transition>
  </div>

  <!-- 中间聊天内容 -->
  <n-scrollbar style="max-height: calc(100vh - 260px)">
    <div class="user-box w-full h-75px mb-5px" v-for="n in 20" :key="n">
      <div class="flex items-center h-full pl-6px pr-8px gap-10px">
        <img class="w-44px h-44px rounded-50% bg-#fff" sytle="border: 1px solid #f1f1f1" src="/logo.png" alt="" />

        <div class="w-full h-38px flex flex-col justify-between">
          <div class="font-size-14px flex-y-center gap-4px">
            <p>宝贝🍓</p>
            <p>(快乐羊多多)</p>
          </div>

          <div
            class="text w-155px h-14px font-size-12px flex-y-center gap-4px"
            style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
            <p class="font-size-12px">[⛅今日天气]</p>
            <p>说的很经典哈萨克的哈萨克看到贺卡上</p>
          </div>
        </div>
      </div>
    </div>
  </n-scrollbar>

  <!-- 底部栏 -->
  <div class="wh-full bg-#f1f1f1" style="box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.08)">
    <!-- 输入框顶部选项栏 -->
    <div class="flex-between-center p-[10px_22px] select-none">
      <div class="input-options flex-y-center">
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center">
              <svg class="mr-18px"><use href="#smiling-face"></use></svg>
            </div>
          </template>
          <span>表情</span>
        </n-popover>
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center gap-2px mr-12px">
              <svg><use href="#screenshot"></use></svg>
              <svg style="width: 14px; height: 14px"><use href="#down"></use></svg>
            </div>
          </template>
          <span>截图</span>
        </n-popover>
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center gap-2px mr-12px">
              <svg><use href="#file2"></use></svg>
              <svg style="width: 14px; height: 14px"><use href="#down"></use></svg>
            </div>
          </template>
          <span>文件</span>
        </n-popover>
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center">
              <svg class="mr-18px"><use href="#photo"></use></svg>
            </div>
          </template>
          <span>图片</span>
        </n-popover>
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center">
              <svg class="mr-18px"><use href="#shake"></use></svg>
            </div>
          </template>
          <span>窗口抖动</span>
        </n-popover>
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center">
              <svg class="mr-18px"><use href="#red-packet"></use></svg>
            </div>
          </template>
          <span>红包</span>
        </n-popover>
        <n-popover
          trigger="hover"
          :show-arrow="false"
          placement="bottom"
          style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3); margin-right: 16px">
          <template #trigger>
            <div class="flex-center">
              <svg class="mr-18px"><use href="#voice"></use></svg>
            </div>
          </template>
          <span>语音信息</span>
        </n-popover>
      </div>

      <n-popover
        trigger="hover"
        :show-arrow="false"
        placement="bottom"
        style="padding: 5px; border: 1px solid rgba(90, 90, 90, 0.3)">
        <template #trigger>
          <div>
            <svg class="w-22px h-22px cursor-pointer"><use href="#history"></use></svg>
          </div>
        </template>
        <span>聊天记录</span>
      </n-popover>
    </div>

    <!-- 输入框及其发送按钮 -->
    <div class="pl-20px flex flex-col items-end gap-6px">
      <ContextMenu class="relative w-full h-100px" @select="handleSelect($event.label)" :menu="menuList">
        <n-input
          class="absolute"
          :placeholder="null as any"
          style="border: 0; background: #f1f1f1"
          type="textarea"
          size="small"
          autofocus
          v-model:value="contactInput"
          :autosize="{
            minRows: 4,
            maxRows: 4
          }" />
      </ContextMenu>

      <n-button-group size="small" class="pr-20px">
        <n-button color="#059669" :disabled="contactInput.length === 0" class="w-65px">发送</n-button>
        <n-button color="#059669" class="p-[0_6px]">
          <template #icon>
            <svg class="w-22px h-22px"><use href="#down"></use></svg>
          </template>
        </n-button>
      </n-button-group>
    </div>

    <!-- 弹出框 -->
    <n-modal v-model:show="modalShow" class="w-350px border-rd-8px">
      <div class="bg-#fdfdfd w-360px h-full p-6px box-border flex flex-col">
        <img @click="modalShow = false" src="@/assets/svg/close.svg" class="w-10px h-10px ml-a cursor-pointer" alt="" />
        <div class="flex flex-col gap-30px p-[22px_10px_10px_22px] select-none">
          <p>{{ tips }}</p>
          <label v-if="tipsOptions" class="font-size-14px flex gap-6px lh-16px">
            <n-checkbox v-model:checked="masking" />
            <span>同时屏蔽，不再接收此人消息</span>
          </label>

          <n-flex justify="end">
            <n-button @click="handleConfirm" class="w-78px" color="#059669">确定</n-button>
            <n-button @click="modalShow = false" class="w-78px" secondary>取消</n-button>
          </n-flex>
        </div>
      </div>
    </n-modal>
  </div>
</template>
<script setup lang="ts">
const menuList = ref([
  { label: '剪切', icon: 'screenshot', disabled: true },
  { label: '复制', icon: 'copy', disabled: true },
  { label: '粘贴', icon: 'intersection' },
  { label: '另存为', icon: 'download', disabled: true },
  { label: '全部选择', icon: 'check-one' }
])
const contactInput = ref('')
const sidebarShow = ref(false)
const modalShow = ref(false)
const masking = ref(false)
/* 提醒框标题 */
const tips = ref()
/* 提醒框的选项 */
const tipsOptions = ref(false)

const { activeItem } = defineProps<{
  activeItem: any
}>()

// watch(sidebarShow, () => {
//   if (sidebarShow.value) {
//     window.addEventListener('click', handleOutsideClick)
//   } else {
//     window.removeEventListener('click', handleOutsideClick)
//   }
// })
//
// const handleOutsideClick = (event: MouseEvent) => {
//   const sidebar = document.querySelector('.sidebar')?.contains(event.target as Node)
//   if (!sidebar) {
//     sidebarShow.value = false // 如果点击事件不是发生在侧边栏及其子元素上，关闭侧边栏
//   }
// }

/* 删除操作二次提醒 */
const handleDelete = (label: string) => {
  modalShow.value = true
  if (label === 'friends') {
    tips.value = '确定删除该好友吗?'
    tipsOptions.value = true
  } else {
    tipsOptions.value = false
    tips.value = '确定后将删除本地聊天记录'
  }
}

const handleClick = () => {
  console.log(111)
}

const handleConfirm = () => {}

const handleSelect = (event: MouseEvent) => {
  console.log(event)
}
</script>

<style scoped lang="scss">
.options {
  .options-box {
    cursor: pointer;
    svg {
      width: 22px;
      height: 22px;
    }
    &:hover svg {
      color: #059669;
      animation: twinkle 0.3s ease-in-out;
    }
  }
}

.input-options {
  svg {
    width: 22px;
    height: 22px;
    cursor: pointer;
    &:hover {
      color: #059669;
    }
  }
}

.setting-item {
  &:first-child {
    margin-top: 0;
  }
  margin-top: 20px;
  background: #fdfdfd;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  box-sizing: border-box;
  font-size: 14px;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/*! 使用vue内置transition做过渡效果 */
// 进入动画的生效状态
.sidebar-enter-active {
  animation: slideIn 0.3s ease-in-out;
}
// 离开动画的生效状态
.sidebar-leave-active {
  animation: slideOut 0.3s ease-in-out;
}
/*!end */
:deep(.n-input .n-input-wrapper) {
  padding: 0;
}
</style>
