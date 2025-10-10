<template>
  <HeaderBar
    :isOfficial="false"
    :hidden-right="true"
    :enable-default-background="false"
    :enable-shadow="false"
    room-name="" />
  <div class="scanner"></div>
</template>

<script setup lang="ts">
import { listen } from '@tauri-apps/api/event'
import { cancel, Format, scan } from '@tauri-apps/plugin-barcode-scanner'
import { onMounted, onUnmounted, ref } from 'vue'
import { MittEnum } from '~/src/enums'
import { useMitt } from '~/src/hooks/useMitt'
import router from '~/src/router'

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

    try {
      const jsonData = JSON.parse(res.content)
      console.log('扫码结果：', res)
      console.log('扫码json:', jsonData)

      useMitt.emit(MittEnum.QR_SCAN_EVENT, jsonData)

      if (res && typeof res === 'object' && 'content' in res) {
        if (window.history.length > 1) {
          window.history.back()
        } else {
          window.close()
        }
        result.value = res.content
      } else {
        result.value = '扫码失败或已取消'
      }
    } catch (error) {
      console.log('扫码结果尝试解析JSON时失败：', error)
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

onMounted(() => {
  isActive.value = true
  startScan()

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
