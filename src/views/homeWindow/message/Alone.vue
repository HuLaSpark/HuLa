<template>
  <main class="flex-1 rounded-8px bg-[--right-bg-color] h-full w-100vw">
    <div style="background: var(--right-theme-bg-color)">
      <ActionBar :shrink="false" :current-label="appWindow.label" />

      <ChatBox />
    </div>
  </main>
</template>
<script setup lang="ts">
import { emit } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { EventEnum } from '@/enums'

const appWindow = WebviewWindow.getCurrent()

// 监听窗口关闭事件,当窗口是非正常关闭的时候触发
appWindow.onCloseRequested(async (e) => {
  await emit(EventEnum.WIN_CLOSE, e)
})

/**! 创建新窗口然后需要通信传递数据时候需要进行提交一次页面创建成功的事件，否则会接收不到数据 */
onMounted(async () => {
  await getCurrentWebviewWindow().show()
  await emit(EventEnum.ALONE)
})
</script>
