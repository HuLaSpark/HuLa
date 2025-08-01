import type { SafeArea } from '@/stores/mobile'

export interface MobileClientInterface {
  /**
   * 获取当前设备的安全区域信息
   * @param envType - 操作系统类型，'android' 或 'ios'
   * @returns Promise<SafeArea> - 安全区域边距信息
   */
  getSafeArea(): Promise<SafeArea>

  /**
   * 监听窗口大小变化并更新安全区域状态
   * @param envType - 当前运行环境的操作系统类型
   */
  listenWindowResize(callback: (safeArea: SafeArea) => void): Promise<void>
}
