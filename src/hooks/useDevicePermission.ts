import { openAppSettings } from '@tauri-apps/plugin-barcode-scanner'
import { openUrl } from '@tauri-apps/plugin-opener'
import { isAndroid, isIOS, isMac, isWindows } from '@/utils/PlatformConstants'

export type DeviceKind = 'microphone' | 'camera'

/**
 * 设备权限相关
 *
 * 仅做权限预检和引导用户打开系统设置，不做原生权限请求。
 * macOS/iOS 的系统弹窗由 getUserMedia 首次调用时自动触发；
 * Android 的运行时权限由 MainActivity.kt 在启动时请求。
 */
export const useDevicePermission = () => {
  /**
   * 预检设备权限状态
   * @param kind 设备类型 microphone | camera
   * @returns PermissionState，不支持查询时回退 'prompt'
   */
  const checkDevicePermission = async (kind: DeviceKind): Promise<PermissionState> => {
    if (!('permissions' in navigator)) return 'prompt'
    try {
      const permission = await navigator.permissions.query({ name: kind as PermissionName })
      return permission.state
    } catch (err) {
      console.warn(`检查 ${kind} 权限失败`, err)
      return 'prompt'
    }
  }

  /**
   * 判断错误是否为权限拒绝
   */
  const isPermissionDenied = (err: unknown): boolean => {
    const name = (err as { name?: string })?.name
    return name === 'NotAllowedError' || name === 'SecurityError'
  }

  /**
   * 多个设备同时请求失败时，尽量识别是哪个权限被拒绝。
   */
  const resolveDeniedDeviceKind = async (kinds: DeviceKind[]): Promise<DeviceKind> => {
    if (kinds.length === 1) return kinds[0]
    for (const kind of kinds) {
      if ((await checkDevicePermission(kind)) === 'denied') return kind
    }
    return kinds.includes('camera') ? 'camera' : 'microphone'
  }

  /**
   * 获取当前平台的隐私设置入口
   * @param kind 设备类型
   */
  const getSettingsUrl = (kind: DeviceKind): string => {
    const isCamera = kind === 'camera'
    if (isMac()) {
      return isCamera
        ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera'
        : 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
    }
    if (isWindows()) {
      return isCamera ? 'ms-settings:privacy-webcam' : 'ms-settings:privacy-microphone'
    }
    // iOS/Android 暂无通用 DeepLink，返回应用设置页占位
    if (isIOS()) return 'app-settings:'
    if (isAndroid()) return 'package:com.android.settings'
    return ''
  }

  /**
   * 打开系统隐私设置页
   * 优先用 opener 的 openUrl（走系统默认处理器），失败时降级兜底。
   */
  const openSystemSettings = async (kind: DeviceKind): Promise<void> => {
    if (isIOS() || isAndroid()) {
      try {
        await openAppSettings()
        return
      } catch (err) {
        console.error('打开应用设置失败:', err)
      }
    }

    const url = getSettingsUrl(kind)
    if (!url) {
      console.warn('当前平台暂不支持自动打开系统设置')
      return
    }
    try {
      await openUrl(url)
    } catch (err) {
      console.error('打开系统设置失败:', err)
      // 降级：尝试用 window.open
      try {
        window.open(url, '_blank', 'noreferrer')
      } catch {
        // 忽略降级失败
      }
    }
  }

  return {
    checkDevicePermission,
    isPermissionDenied,
    resolveDeniedDeviceKind,
    openSystemSettings
  }
}
