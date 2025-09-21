<template>
  <div class="scanner">
    <div v-if="result">📦 扫码结果：{{ result }}</div>
    <div v-else>📷 正在扫码中，请对准二维码...</div>
  </div>
</template>

<script setup lang="ts">
import { listen } from '@tauri-apps/api/event'
import { cancel, Format, scan } from '@tauri-apps/plugin-barcode-scanner'
import { onMounted, onUnmounted, ref } from 'vue'
import { MittEnum } from '~/src/enums'
import { useMitt } from '~/src/hooks/useMitt'

const result = ref<string | null>(null)
const isActive = ref(true)

const startScan = async () => {
  try {
    const scanTask = scan({
      windowed: true,
      formats: [Format.QRCode, Format.EAN13]
    })

    const cancelTask = new Promise((resolve) => {
      const interval = setInterval(() => {
        if (!isActive.value) {
          clearInterval(interval)
          resolve(null)
        }
      }, 300)
    })

    const res = (await Promise.race([scanTask, cancelTask])) as any

    useMitt.emit(MittEnum.QR_SCAN_EVENT, res)

    if (res && typeof res === 'object' && 'content' in res) {
      alert(`扫码结果：${res.content}`)
      // 点击确定后返回上一页
      if (window.history.length > 1) {
        window.history.back()
      } else {
        window.close()
      }
      result.value = res.content
    } else {
      result.value = '扫码失败或已取消'
    }
  } catch (err) {
    console.error('扫码异常:', err)
    result.value = '扫码过程中发生错误'
  }
}

onMounted(() => {
  isActive.value = true
  startScan()

  // Android 返回键监听
  listen('tauri://android-back', () => {
    isActive.value = false
    cancel().catch((e) => {
      console.warn('cancel() 调用失败:', e)
    })
  })
})

onUnmounted(() => {
  isActive.value = false
  cancel().catch((e) => {
    console.warn('cancel() 调用失败:', e)
  })
})
</script>

<style scoped>
.scanner {
  position: relative;
  width: 100%;
  height: 100%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  padding: 20px;
  text-align: center;
}
</style>
