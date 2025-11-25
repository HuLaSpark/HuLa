import FingerprintJS from '@fingerprintjs/fingerprintjs'
import { getOSType } from '@/utils/PlatformConstants'

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
    const totalStart = performance.now()

    try {
      // 检查缓存是否有效
      const cachedData = localStorage.getItem('deviceFingerprint')
      if (cachedData) {
        const { fingerprint, timestamp } = JSON.parse(cachedData)
        if (Date.now() - timestamp < CACHE_DURATION) {
          const totalTime = performance.now() - totalStart
          console.log(`使用缓存的设备指纹，总耗时: ${totalTime.toFixed(2)}ms`)
          return fingerprint
        }
      }

      // 收集设备信息
      const deviceInfoStart = performance.now()
      const deviceInfo = {
        platform: getOSType(),
        screenSize: `${window.screen.width}x${window.screen.height}`,
        pixelRatio: window.devicePixelRatio,
        colorDepth: window.screen.colorDepth,
        hardwareConcurrency: navigator.hardwareConcurrency || undefined,
        deviceMemory: (navigator as any).deviceMemory,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
      const deviceInfoTime = performance.now() - deviceInfoStart
      console.log(`收集设备信息耗时: ${deviceInfoTime.toFixed(2)}ms`)

      // 在主线程中获取基础浏览器指纹
      const fpStart = performance.now()
      const fp = await FingerprintJS.load()
      const fpResult = await fp.get({
        debug: false
      })
      const fpTime = performance.now() - fpStart
      console.log(`基础指纹生成耗时: ${fpTime.toFixed(2)}ms`)

      // Worker处理
      const workerStart = performance.now()
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
      const workerTime = performance.now() - workerStart
      console.log(`Worker生成指纹耗时: ${workerTime.toFixed(2)}ms`)

      // 缓存结果
      if (fingerprint) {
        localStorage.setItem(
          'deviceFingerprint',
          JSON.stringify({
            fingerprint,
            timestamp: Date.now()
          })
        )
      }

      const totalTime = performance.now() - totalStart
      console.log(`设备指纹获取总耗时: ${totalTime.toFixed(2)}ms`)
      return fingerprint
    } catch (error) {
      const totalTime = performance.now() - totalStart
      console.error(`获取设备指纹失败，总耗时: ${totalTime.toFixed(2)}ms`, error)
      return ''
    } finally {
      fingerprintPromise = null
    }
  })()

  return fingerprintPromise
}
