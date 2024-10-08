<template>
  <!-- 顶部操作栏和显示用户名 -->
  <main
    class="relative z-30 flex-y-center border-b-(1px solid [--right-chat-footer-line-color]) justify-between p-[6px_20px_12px] select-none">
    <n-flex align="center">
      <span class="color-[--text-color]">{{ activeItem.name }}</span>
      <svg v-if="activeItem.hot_Flag === IsAllUserEnum.Yes" class="size-20px color-#13987f select-none outline-none">
        <use href="#auth"></use>
      </svg>
    </n-flex>
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
            <svg @click="handleMedia"><use href="#screen-sharing"></use></svg>
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
    <Transition name="sidebar">
      <div v-if="sidebarShow" style="border: 1px solid rgba(90, 90, 90, 0.1)" class="sidebar">
        <div class="box-item flex-col-y-center">
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

        <div class="box-item">
          <div class="flex-between-center">
            <p>屏蔽此人</p>
            <n-switch size="small" />
          </div>
        </div>

        <div class="box-item cursor-pointer" @click="handleDelete('chat-history')">
          <p>删除聊天记录</p>
        </div>

        <div class="box-item flex-x-center cursor-pointer" @click="handleDelete('friends')">
          <p class="color-#d03553">删除好友</p>
        </div>

        <p class="m-[0_auto] text-(12px #13987f) mt-20px cursor-pointer">被骚扰了?&nbsp;&nbsp;举报该用户</p>
      </div>
    </Transition>
  </main>

  <!-- 弹出框 -->
  <n-modal v-model:show="modalShow" class="w-350px rounded-8px">
    <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
      <div
        v-if="type() === 'macos'"
        @click="modalShow = false"
        class="mac-close z-999 size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none absolute left-6px">
        <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
          <use href="#close"></use>
        </svg>
      </div>

      <svg v-if="type() === 'windows'" @click="modalShow = false" class="size-12px ml-a cursor-pointer select-none">
        <use href="#close"></use>
      </svg>
      <div class="flex flex-col gap-30px p-[22px_10px_10px_22px] select-none">
        <span class="text-14px">{{ tips }}</span>
        <label v-if="tipsOptions" class="text-14px flex gap-6px lh-16px">
          <n-checkbox v-model:checked="masking" />
          <span>同时屏蔽，不再接收此人消息</span>
        </label>

        <n-flex justify="end">
          <n-button @click="handleConfirm" class="w-78px" color="#13987f">确定</n-button>
          <n-button @click="modalShow = false" class="w-78px" secondary>取消</n-button>
        </n-flex>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { IsAllUserEnum, SessionItem } from '@/services/types.ts'
import { useDisplayMedia } from '@vueuse/core'
import { EventEnum } from '@/enums'
import { emit, listen } from '@tauri-apps/api/event'
import { type } from '@tauri-apps/plugin-os'

// 使用useDisplayMedia获取屏幕共享的媒体流
const { stream, start, stop } = useDisplayMedia()
/** 提醒框标题 */
const tips = ref()
/** 提醒框的选项 */
const tipsOptions = ref(false)
const modalShow = ref(false)
const sidebarShow = ref(false)
const masking = ref(false)
const { activeItem } = defineProps<{
  activeItem: SessionItem
}>()

// 创建一个RTCPeerConnection实例
const peerConnection = new RTCPeerConnection()

watchEffect(() => {
  stream.value?.getVideoTracks()[0].addEventListener('ended', () => {
    stop()
  })
})

const handleMedia = () => {
  start().then(() => {
    // 将媒体流添加到RTCPeerConnection
    stream.value?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream.value!)
    })

    // 创建一个offer
    peerConnection.createOffer().then((offer) => {
      // 设置本地描述
      peerConnection.setLocalDescription(offer)
      emit(EventEnum.SHARE_SCREEN)
      /** 当需要给独立窗口传输数据的时候需要先监听窗口的创建完毕事件 */
      listen('SharedScreenWin', async () => {
        await emit('offer', offer)
      })
      // 在这里，你需要将offer发送给对方
      // 对方需要调用peerConnection.setRemoteDescription(offer)来接受屏幕共享
    })
  })
}

/** 删除操作二次提醒 */
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
  /** 点击非侧边栏元素时，关闭侧边栏，但点击弹出框元素、侧边栏图标、还有侧边栏里面的元素时不关闭 */
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
@use '@/styles/scss/chat-header';
</style>
