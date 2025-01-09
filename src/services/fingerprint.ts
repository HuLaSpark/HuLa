import FingerprintJS from '@fingerprintjs/fingerprintjs'
import { type } from '@tauri-apps/plugin-os'

const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时缓存

/**
 * 获取性能优化的跨平台设备指纹
 */
export const getEnhancedFingerprint = async (): Promise<string> => {
  // 检查缓存是否有效
  const cachedData = localStorage.getItem('deviceFingerprint')
  if (cachedData) {
    const { fingerprint, timestamp } = JSON.parse(cachedData)
    if (Date.now() - timestamp < CACHE_DURATION) {
      return fingerprint
    }
  }

  try {
    // 1. 基础浏览器指纹 (轻量级)
    const fp = await FingerprintJS.load()
    const fpResult = await fp.get({
      debug: false
    })

    // 2. 平台检测
    const platform = type()

    // 3. 基本设备信息 (跨平台通用)
    const deviceInfo = {
      platform: platform,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      pixelRatio: window.devicePixelRatio,
      colorDepth: window.screen.colorDepth,
      hardwareConcurrency: navigator.hardwareConcurrency || undefined,
      deviceMemory: (navigator as any).deviceMemory,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }

    // 4. 性能优化的浏览器特征检测
    const browserFeatures = await detectBrowserFeatures()

    // 组合所有特征
    const combinedFingerprint = JSON.stringify({
      browserFingerprint: fpResult.visitorId,
      deviceInfo,
      browserFeatures,
      timestamp: Date.now()
    })

    // 使用 SHA-256 生成最终指纹
    const fingerprintBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(combinedFingerprint))
    const fingerprint = Array.from(new Uint8Array(fingerprintBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // 缓存结果
    localStorage.setItem(
      'deviceFingerprint',
      JSON.stringify({
        fingerprint,
        timestamp: Date.now()
      })
    )

    return fingerprint
  } catch (error) {
    console.error('获取设备指纹失败:', error)
    return ''
  }
}

/**
 * 性能优化的浏览器特征检测
 */
const detectBrowserFeatures = async (): Promise<Record<string, boolean>> => {
  const features: Record<string, boolean> = {}

  const checks = {
    webgl: async () => {
      try {
        const canvas = document.createElement('canvas')
        return !!canvas.getContext('webgl')
      } catch {
        return false
      }
    },
    canvas: async () => {
      try {
        const canvas = document.createElement('canvas')
        return !!canvas.getContext('2d')
      } catch {
        return false
      }
    },
    audio: async () => {
      try {
        return !!(window.AudioContext || (window as any).webkitAudioContext)
      } catch {
        return false
      }
    }
  }

  const results = await Promise.all(
    Object.entries(checks).map(async ([key, check]) => {
      try {
        const result = await check()
        return [key, result]
      } catch {
        return [key, false]
      }
    })
  )

  results.forEach(([key, value]) => {
    features[key as string] = value as boolean
  })

  return features
}

// /**
//  * 缓存的浏览器指纹值
//  * 用于避免重复计算指纹，提高性能
//  */
// let cachedFingerprint: string | null = null

// /**
//  * 获取浏览器指纹
//  * 使用 FingerprintJS 库生成唯一的访客标识符
//  * @returns {Promise<string>} 返回浏览器指纹字符串，如果获取失败则返回空字符串
//  */
// export const getFingerprint = async (): Promise<string> => {
//   // 如果已有缓存的指纹，直接返回
//   if (cachedFingerprint) {
//     return cachedFingerprint
//   }

//   try {
//     // 加载 FingerprintJS 实例
//     const fp = await FingerprintJS.load()
//     // 获取访客的唯一标识符
//     const result = await fp.get()
//     // 缓存并返回指纹值
//     cachedFingerprint = result.visitorId
//     return cachedFingerprint
//   } catch (error) {
//     // 如果获取失败，记录错误并返回空字符串
//     console.error('获取浏览器指纹失败:', error)
//     return ''
//   }
// }
