import { type, version } from '@tauri-apps/plugin-os'

/**
 * 平台类型枚举
 */
export type PlatformType = 'desktop' | 'mobile'

/**
 * 操作系统类型
 */
export type OSType = 'windows' | 'macos' | 'linux' | 'android' | 'ios'

/**
 * 平台检测结果 - 应用启动时执行一次，全局共享
 */
class PlatformDetector {
  private static _osType: OSType
  private static _platformType: PlatformType
  private static _osVersion: string | undefined
  private static _isWindows10 = false
  private static _initialized = false

  /**
   * 初始化平台检测（只执行一次）
   */
  static initialize(): void {
    if (PlatformDetector._initialized) return

    try {
      const detectedType = type()
      PlatformDetector._osType = PlatformDetector.normalizeOSType(detectedType)
      PlatformDetector._platformType = PlatformDetector.isDesktopOS(PlatformDetector._osType) ? 'desktop' : 'mobile'
      PlatformDetector._osVersion = PlatformDetector.detectVersion()
      PlatformDetector._isWindows10 =
        PlatformDetector._osType === 'windows' && PlatformDetector.isWindows10Version(PlatformDetector._osVersion)

      if (import.meta.env.DEV) {
        console.log(`Platform detected: ${PlatformDetector._osType} (${PlatformDetector._platformType})`)
      }
    } catch (error) {
      console.warn('Failed to detect platform type, defaulting to desktop:', error)
    }

    PlatformDetector._initialized = true
  }

  private static normalizeOSType(osType: string): OSType {
    switch (osType) {
      case 'windows':
        return 'windows'
      case 'macos':
        return 'macos'
      case 'linux':
        return 'linux'
      case 'android':
        return 'android'
      case 'ios':
        return 'ios'
      default:
        throw new Error(`Unsupported OS type: ${osType}`)
    }
  }

  private static isDesktopOS(osType: OSType): boolean {
    return osType === 'windows' || osType === 'linux' || osType === 'macos'
  }

  private static detectVersion(): string | undefined {
    try {
      return version()
    } catch (error) {
      console.warn('Failed to detect platform version:', error)
      return undefined
    }
  }

  private static isWindows10Version(osVersion?: string): boolean {
    if (!osVersion) return false
    const numbers = osVersion
      .match(/\d+/g)
      ?.map((num) => Number.parseInt(num, 10))
      .filter((num) => !Number.isNaN(num))
    if (!numbers || numbers.length === 0) return false
    const [major, minor, patch] = numbers
    const buildNumber = typeof patch === 'number' ? patch : typeof minor === 'number' ? minor : undefined
    return major === 10 && typeof buildNumber === 'number' && buildNumber < 22000
  }

  static get osType(): OSType {
    return PlatformDetector._osType
  }

  static get osVersion(): string | undefined {
    return PlatformDetector._osVersion
  }

  static get isWindows10(): boolean {
    return PlatformDetector._isWindows10
  }

  static get platformType(): PlatformType {
    return PlatformDetector._platformType
  }
}

export const initializePlatform = () => PlatformDetector.initialize()

/**
 * 获取操作系统类型
 * @returns 'windows' | 'macos' | 'linux' | 'android' | 'ios'
 */
export const getOSType = (): OSType => PlatformDetector.osType

/**
 * 获取平台类型
 * @returns 'desktop' | 'mobile'
 */
export const getPlatformType = (): PlatformType => PlatformDetector.platformType

/**
 * 获取系统版本号
 */
export const getOSVersion = (): string | undefined => PlatformDetector.osVersion

/**
 * 是否为桌面端
 */
export const isDesktop = (): boolean => PlatformDetector.platformType === 'desktop'

/**
 * 是否为移动端
 */
export const isMobile = (): boolean => PlatformDetector.platformType === 'mobile'

/**
 * 是否为 Windows 系统
 */
export const isWindows = (): boolean => PlatformDetector.osType === 'windows'

/**
 * 是否为 Windows 10
 */
export const isWindows10 = (): boolean => PlatformDetector.isWindows10

/**
 * 是否为 macOS 系统
 */
export const isMac = (): boolean => PlatformDetector.osType === 'macos'

/**
 * 是否为 Linux 系统
 */
export const isLinux = (): boolean => PlatformDetector.osType === 'linux'

/**
 * 是否为 Android 系统
 */
export const isAndroid = (): boolean => PlatformDetector.osType === 'android'

/**
 * 是否为 iOS 系统
 */
export const isIOS = (): boolean => PlatformDetector.osType === 'ios'

/**
 * 是否为兼容平台（Windows 或 Linux）
 */
export const isCompatibility = (): boolean => isWindows() || isLinux()

/**
 * 平台工具集合 - 统一导出所有平台判断函数
 */
export const Platform = {
  // 获取信息
  getOSType,
  getPlatformType,
  getOSVersion,

  // 平台判断
  isDesktop,
  isMobile,

  // 系统判断
  isWindows,
  isWindows10,
  isMac,
  isLinux,
  isAndroid,
  isIOS,
  isCompatibility
} as const
