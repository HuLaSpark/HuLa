<template>
  <div class="scanner-page">
    <HeaderBar
      class="scanner-header"
      :isOfficial="false"
      :hidden-right="true"
      :enable-default-background="false"
      :enable-shadow="false"
      room-name="" />

    <div class="scanner">
      <div
        class="w-60 h-60 mt-30% items-center justify-center border-op-50 overflow-hidden flex-col rounded-15px flex border-solid border-white border-3"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { listen } from '@tauri-apps/api/event'
import { cancel, Format, scan } from '@tauri-apps/plugin-barcode-scanner'
import { onMounted, onUnmounted, ref } from 'vue'
import { MittEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import router from '@/router'

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

    // 为空或已取消
    if (!res) {
      result.value = '扫码已取消'
      return
    }

    console.log('扫码结果：', res)

    if (res && typeof res === 'object' && 'content' in res && typeof res.content === 'string') {
      try {
        const jsonData = JSON.parse(res.content)
        console.log('扫码json:', jsonData)
        useMitt.emit(MittEnum.QR_SCAN_EVENT, jsonData)
      } catch (error) {
        console.log('扫码结果不是JSON，按纯文本处理：', error)
        useMitt.emit(MittEnum.QR_SCAN_EVENT, { raw: res.content })
      }

      if (window.history.length > 1) {
        window.history.back()
      } else {
        window.close()
      }
      result.value = res.content
    } else if (typeof res === 'string') {
      // 某些平台可能直接返回字符串内容
      useMitt.emit(MittEnum.QR_SCAN_EVENT, { raw: res })
      result.value = res
      if (window.history.length > 1) window.history.back()
      else window.close()
    } else {
      result.value = '扫码失败或已取消'
    }
  } catch (err: any) {
    console.error('扫码异常:', err)

    if (err && typeof err === 'object' && 'message' in err && /permission/i.test(err.message)) {
      alert('没有相机权限，请在系统设置中开启权限')
      router.back() // 用户点 OK 后会执行这里
      result.value = '缺少权限'
    } else {
      alert('扫码过程中发生错误')
      router.back() // 其他错误也返回上一页
      result.value = '扫码过程中发生错误'
    }
  }
}

let unlistenAndroidBack: (() => void) | null = null
let originalAppBg = ''

onMounted(async () => {
  // 使相机预览可见：将根容器背景设为透明，避免遮挡
  const appContainer = document.querySelector('.appContainer') as HTMLElement | null
  if (appContainer) {
    originalAppBg = appContainer.style.backgroundColor || ''
    appContainer.style.backgroundColor = 'transparent'
  }

  isActive.value = true
  startScan()

  // 仅在 Android 设备监听返回键，避免在 iOS/Safari 环境报错
  const isAndroid = /Android/i.test(navigator.userAgent)
  if (isAndroid) {
    try {
      unlistenAndroidBack = await listen('tauri://android-back', () => {
        isActive.value = false
        cancel().catch((e) => {
          console.warn('cancel() 调用失败:', e)
        })
      })
    } catch (e) {
      console.warn('监听 Android 返回键失败:', e)
    }
  }
})

onUnmounted(() => {
  isActive.value = false
  if (unlistenAndroidBack) {
    unlistenAndroidBack()
    unlistenAndroidBack = null
  }
  // 恢复应用根容器背景色
  const appContainer = document.querySelector('.appContainer') as HTMLElement | null
  if (appContainer) {
    appContainer.style.backgroundColor = originalAppBg
  }
  cancel().catch((e) => {
    console.warn('cancel() 调用失败:', e)
  })
})
</script>

<style scoped>
.scanner-page {
  position: relative;
  width: 100%;
  height: 100%;
}

.scanner-header {
  position: relative;
  z-index: 10; /* 确保头部在扫码层之上 */
}

.scanner {
  position: fixed;
  inset: 0;
  background: transparent; /* 保持透明，透出相机预览 */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  text-align: center;
  pointer-events: none; /* 不拦截点击，避免遮挡返回按钮 */
}

.scanner > div {
  z-index: 1;
}
</style>
