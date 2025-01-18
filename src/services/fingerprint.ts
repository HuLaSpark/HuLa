import { type } from '@tauri-apps/plugin-os'
import FingerprintJS from '@fingerprintjs/fingerprintjs'

const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时缓存

// 创建 Worker 实例
const worker = new Worker(new URL('../workers/fingerprint.worker.ts', import.meta.url), {
  type: 'module'
})

// 添加一个 Promise 来追踪正在进行的指纹生成
let fingerprintPromise: Promise<string> | null = null

/**
 * 获取性能优化的跨平台设备指纹
 */
export const getEnhancedFingerprint = async (): Promise<string> => {
  // 如果已经有正在进行的请求，直接返回该Promise
  if (fingerprintPromise) {
    return fingerprintPromise
  }

  // 创建新的Promise并保存引用
  fingerprintPromise = (async () => {
    console.time('🔍 设备指纹获取总耗时')

    try {
      // 检查缓存是否有效
      const cachedData = localStorage.getItem('deviceFingerprint')
      if (cachedData) {
        const { fingerprint, timestamp } = JSON.parse(cachedData)
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.timeEnd('🔍 设备指纹获取总耗时')
          console.log('✅ 使用缓存的设备指纹')
          return fingerprint
        }
      }

      console.time('📊 收集设备信息耗时')
      // 收集设备信息
      const deviceInfo = {
        platform: await type(),
        screenSize: `${window.screen.width}x${window.screen.height}`,
        pixelRatio: window.devicePixelRatio,
        colorDepth: window.screen.colorDepth,
        hardwareConcurrency: navigator.hardwareConcurrency || undefined,
        deviceMemory: (navigator as any).deviceMemory,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
      console.timeEnd('📊 收集设备信息耗时')

      // 在主线程中获取基础浏览器指纹
      console.time('Worker: 基础指纹生成')
      const fp = await FingerprintJS.load()
      const fpResult = await fp.get({
        debug: false
      })
      console.timeEnd('Worker: 基础指纹生成')

      // 创建 Promise 等待 Worker 返回结果
      console.time('🔨 Worker生成指纹耗时')
      const fingerprint = await new Promise<string>((resolve) => {
        const handleMessage = (e: MessageEvent) => {
          const { type, fingerprint } = e.data
          if (type === 'fingerprintGenerated') {
            worker.removeEventListener('message', handleMessage)
            resolve(fingerprint)
          }
        }

        worker.addEventListener('message', handleMessage)
        worker.postMessage({
          type: 'generateFingerprint',
          deviceInfo,
          browserFingerprint: fpResult.visitorId
        })
      })
      console.timeEnd('🔨 Worker生成指纹耗时')

      // 缓存结果
      if (fingerprint) {
        localStorage.setItem(
          'deviceFingerprint',
          JSON.stringify({
            fingerprint,
            timestamp: Date.now()
          })
        )
        console.log('✅ 生成新的设备指纹并缓存')
      }

      console.timeEnd('🔍 设备指纹获取总耗时')
      return fingerprint
    } catch (error) {
      console.timeEnd('🔍 设备指纹获取总耗时')
      console.error('❌ 获取设备指纹失败:', error)
      return ''
    } finally {
      // 清除正在进行的Promise引用
      fingerprintPromise = null
    }
  })()

  return fingerprintPromise
}
