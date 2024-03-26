<template>
  <!-- 顶部操作栏和显示用户名 -->
  <main
    style="box-shadow: 0 4px 4px var(--box-shadow-color)"
    class="relative z-30 flex-y-center justify-between p-[8px_20px_12px] select-none">
    <div class="color-[--text-color]">{{ activeItem.accountName }}</div>
    <!-- 顶部右边选项栏 -->
    <nav class="options flex-y-center gap-20px color-[--icon-color]">
      <div class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg @click="handleClick"><use href="#phone-telephone"></use></svg>
          </template>
          <span>语言通话</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg><use href="#video-one"></use></svg>
          </template>
          <span>视频通话</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg><use href="#screen-sharing"></use></svg>
          </template>
          <span>屏幕共享</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg><use href="#remote-control"></use></svg>
          </template>
          <span>远程协助</span>
        </n-popover>
      </div>

      <div class="options-box">
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg><use href="#launch"></use></svg>
          </template>
          <span>发起群聊</span>
        </n-popover>
      </div>

      <div class="options-box" @click="sidebarShow = !sidebarShow">
        <svg><use href="#more"></use></svg>
      </div>
    </nav>

    <!-- 侧边选项栏 -->
    <transition name="sidebar">
      <div v-if="sidebarShow" style="border: 1px solid rgba(90, 90, 90, 0.1)" class="sidebar">
        <div class="setting-item flex-col-y-center">
          <div class="flex-between-center">
            <p>设为置顶</p>
            <n-switch size="small" />
          </div>
          <div class="h-1px bg-[--setting-item-line] m-[10px_0]"></div>
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

        <p class="m-[0_auto] text-#059669 text-12px mt-20px cursor-pointer">被骚扰了?&nbsp;&nbsp;举报该用户</p>
      </div>
    </transition>
  </main>

  <!-- 弹出框 -->
  <n-modal v-model:show="modalShow" class="w-350px border-rd-8px">
    <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
      <svg @click="modalShow = false" class="w-12px h-12px ml-a cursor-pointer select-none">
        <use href="#close"></use>
      </svg>
      <div class="flex flex-col gap-30px p-[22px_10px_10px_22px] select-none">
        <span class="text-14px">{{ tips }}</span>
        <label v-if="tipsOptions" class="text-14px flex gap-6px lh-16px">
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
</template>

<script setup lang="ts">
import { MockItem } from '@/services/types.ts'

/* 提醒框标题 */
const tips = ref()
/* 提醒框的选项 */
const tipsOptions = ref(false)
const modalShow = ref(false)
const sidebarShow = ref(false)
const masking = ref(false)
const { activeItem } = defineProps<{
  activeItem: MockItem
}>()

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

const handleConfirm = () => {}

const handleClick = () => {
  console.log(111)
}

const closeMenu = (event: any) => {
  /* 点击非侧边栏元素时，关闭侧边栏，但点击弹出框元素、侧边栏图标、还有侧边栏里面的元素时不关闭 */
  if (!event.target.matches('.sidebar, .sidebar *, .n-modal-mask, .options-box *, .n-modal *') && !modalShow.value) {
    sidebarShow.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style scoped lang="scss">
@import '@/styles/scss/chat-header';
</style>
