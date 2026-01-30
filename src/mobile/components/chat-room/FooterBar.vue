<template>
  <div ref="root">
    <!-- 隐藏的 contenteditable，用于复用 useMsgInput 的发送逻辑 -->
    <div
      ref="messageInputDom"
      contenteditable="true"
      spellcheck="false"
      style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; white-space: pre-wrap"></div>

    <div class="w-full min-h-20px flex flex-col z-2 footer-bar-shadow">
      <div class="flex-1 min-h-0">
        <chat-footer :detail-id="globalStore.currentSession?.detailId"></chat-footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import 'vant/es/dialog/style'
import { invoke } from '@tauri-apps/api/core'
import { useGlobalStore } from '@/stores/global'
import { isIOS } from '@/utils/PlatformConstants'

const globalStore = useGlobalStore()
const emit = defineEmits(['focus', 'blur', 'updateHeight'])

// ==== DOM 和状态 ====
const messageInputDom = ref<HTMLElement | null>(null)
const root = ref()

onMounted(() => {
  if (root.value) {
    const resizeObserver = new ResizeObserver((entries) => {
      const height = entries[0].contentRect.height
      emit('updateHeight', height)
    })
    resizeObserver.observe(root.value)

    onUnmounted(() => {
      resizeObserver.disconnect()
    })
  }

  if (isIOS()) {
    invoke('set_webview_keyboard_adjustment', { enabled: true })
  }
})

onUnmounted(() => {
  if (isIOS()) {
    invoke('set_webview_keyboard_adjustment', { enabled: false })
  }
})

// ==== 对外暴露 ====
defineExpose({ root })
</script>

<style lang="scss" scoped>
.active-icon {
  position: relative;

  svg {
    color: #13987f;
    /* 主题色 */
    transition: color 0.3s ease;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: #13987f;
    animation: pulse 1.5s infinite;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }

  50% {
    opacity: 0.5;
    transform: translateX(-50%) scale(1.2);
  }
}

.footer-bar-shadow {
  box-shadow: 0 -3px 6px -4px rgba(0, 0, 0, 0.1);
}

.rotate {
  transform: rotate(180deg);
}

.transition-transform {
  transition: transform 0.15s ease;
}
</style>
