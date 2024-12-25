<template>
  <n-flex vertical :size="6" class="notify" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <n-flex align="left" :size="10" class="m-[8px_0_0_0]">
      <span style="font-size: 14px">新消息·{{ msgCount }}</span>
    </n-flex>
    <component :is="division" />
    <n-flex
      @click="handleClickMsg"
      align="left"
      :size="10"
      class="p-6px box-border rounded-8px hover:bg-[--tray-hover] cursor-pointer">
      <n-avatar
        round
        :size="44"
        src="https://thirdwx.qlogo.cn/mmopen/vi_32/PiajxSqBRaEL7OpdTZYkEeE9oTmZFKL4gIzCr1ibf38OiaPqqcmqlLxTxvw3gskZV5uTma7NSQzCk8yVbIiaN6FV3kmicBWg2CLOKicysib6mDFGEPprQxfUYEupA/132" />

      <n-flex class="flex-1" vertical justify="center" :size="8">
        <span class="text-(16px [--text-color]) font-bold">Dawn</span>

        <n-flex class="w-full" align="center" justify="space-between" :size="10">
          <span class="max-w-150px truncate text-(12px [--text-color])">你好，你有一条新消息sssssssssssssssssssss</span>

          <!-- 有多少条消息 -->
          <div class="text-(10px #fff) rounded-full px-6px py-2px flex-center bg-#13987f">
            {{ msgCount > 99 ? '99+' : msgCount }}
          </div>
        </n-flex>
      </n-flex>
    </n-flex>
    <component :is="division" />
    <p @click="handleTip" class="pt-4px pl-6px text-(12px #13987f) cursor-pointer">忽略全部</p>
  </n-flex>
</template>
<script setup lang="tsx">
import { useGlobalStore } from '@/stores/global.ts'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { Event } from '@tauri-apps/api/event'
import { PhysicalPosition } from '@tauri-apps/api/dpi'
import { useWindow } from '@/hooks/useWindow.ts'
import { useTauriListener } from '@/hooks/useTauriListener'

const appWindow = WebviewWindow.getCurrent()
const { checkWinExist } = useWindow()
const { pushListeners } = useTauriListener()
const globalStore = useGlobalStore()
const { tipVisible } = storeToRefs(globalStore)
const isMouseInWindow = ref(false)
const msgCount = ref(100)

const division = () => {
  return <div class={'h-1px bg-[--line-color] w-full'}></div>
}

// 处理点击消息的逻辑
const handleClickMsg = async () => {
  // 打开消息页面
  await checkWinExist('home')
  await handleTip()
}

// 取消状态栏闪烁
const handleTip = async () => {
  globalStore.setTipVisible(false)
  await WebviewWindow.getCurrent().hide()
}

// 处理窗口显示和隐藏的逻辑
const showWindow = async (event: Event<any>) => {
  if (tipVisible.value) {
    const notifyWindow = await WebviewWindow.getCurrent()
    const outerSize = await notifyWindow?.outerSize()
    if (outerSize) {
      await notifyWindow?.setPosition(
        new PhysicalPosition(
          event.payload.position.Physical.x - 120,
          event.payload.position.Physical.y - outerSize.height
        )
      )
      await notifyWindow?.show()
      await notifyWindow?.unminimize()
      await notifyWindow?.setFocus()
      await notifyWindow?.setAlwaysOnTop(true)
    }
  }
}

const hideWindow = async () => {
  if (!isMouseInWindow.value) {
    const notifyWindow = await WebviewWindow.getCurrent()
    await notifyWindow?.hide()
  }
}

const handleMouseEnter = () => {
  console.log('Mouse enter')
  isMouseInWindow.value = true
}

const handleMouseLeave = async () => {
  console.log('Mouse leave')
  isMouseInWindow.value = false
  await hideWindow()
}

onMounted(async () => {
  await pushListeners([
    // 监听托盘鼠标进入事件
    appWindow.listen('notify_enter', async (event: Event<any>) => {
      if (tipVisible.value) {
        await showWindow(event)
      }
    }),

    // 监听托盘鼠标离开事件
    appWindow.listen('notify_leave', async () => {
      setTimeout(async () => {
        await hideWindow()
      }, 300)
    })
  ])
})
</script>
<style scoped lang="scss">
.notify {
  @apply bg-[--center-bg-color] size-full p-8px box-border select-none text-[--text-color] text-12px;
}
</style>
