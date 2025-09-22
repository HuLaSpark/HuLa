import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'
import { useDebounceFn } from '@vueuse/core'
import { NotificationTypeEnum } from '@/enums'
import type { SessionItem } from '@/services/types'
import { isMac } from '@/utils/PlatformConstants'
import { invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'

/**
 * 统一的未读计数管理器
 */
export class UnreadCountManager {
  private pendingUpdates = new Set<string>()
  private readonly DEBOUNCE_DELAY = 60 // 防抖延迟
  private updateCallback: (() => void) | null = null
  private setTipVisible?: (visible: boolean) => void
  private debouncedExecuteUpdate: () => void

  constructor() {
    this.debouncedExecuteUpdate = useDebounceFn(() => {
      this.executeUpdate()
    }, this.DEBOUNCE_DELAY)
  }

  /**
   * 设置更新回调函数
   * @param callback 当需要实际更新时调用的回调函数
   */
  public setUpdateCallback(callback: () => void) {
    this.updateCallback = callback
  }

  /**
   * 请求更新未读计数
   * @param sessionId 可选的会话ID，如果提供则只更新特定会话
   */
  public requestUpdate(sessionId?: string) {
    if (sessionId) {
      this.pendingUpdates.add(sessionId)
    } else {
      this.pendingUpdates.add('*') // '*' 表示全局更新
    }

    this.debouncedExecuteUpdate()
  }

  /**
   * 计算全局未读计数
   * @param sessionList 会话列表
   * @param unReadMark 全局未读标记对象
   */
  public calculateTotal(sessionList: SessionItem[], unReadMark: { newMsgUnreadCount: number }) {
    // 检查当前窗口标签
    const webviewWindowLabel = WebviewWindow.getCurrent()
    if (webviewWindowLabel.label !== 'home' && webviewWindowLabel.label !== 'mobile-home') {
      return
    }

    info('[UnreadCountManager] 计算全局未读消息计数')

    // 计算总未读数
    const totalUnread = sessionList.reduce((total, session) => {
      // 免打扰的会话不计入全局未读数
      if (session.muteNotification === NotificationTypeEnum.NOT_DISTURB) {
        return total
      }
      // 确保 unreadCount 是数字且不为负数
      const unread = Math.max(0, session.unreadCount || 0)
      return total + unread
    }, 0)

    // 更新全局未读计数
    unReadMark.newMsgUnreadCount = totalUnread

    // 更新系统徽章
    this.updateSystemBadge(totalUnread)
  }

  /**
   * 执行实际的更新操作
   */
  private executeUpdate() {
    if (this.updateCallback) {
      this.updateCallback()
    }
    this.pendingUpdates.clear()
  }

  /**
   * 更新系统徽章计数
   */
  private async updateSystemBadge(totalUnread: number): Promise<void> {
    if (isMac()) {
      const count = totalUnread > 0 ? totalUnread : undefined
      await invokeWithErrorHandler('set_badge_count', { count })
    }

    // 更新tipVisible状态，用于控制托盘通知显示
    if (totalUnread > 0) {
      // 有新消息时，设置tipVisible为true，触发托盘闪烁
      this.setTipVisible?.(true)
    } else {
      // 没有未读消息时，设置tipVisible为false
      this.setTipVisible?.(false)
    }
  }

  /**
   * 设置tipVisible回调函数
   * @param callback 回调函数，用于设置tipVisible状态
   */
  public setTipVisibleCallback(callback: (visible: boolean) => void) {
    this.setTipVisible = callback
  }

  /**
   * 销毁管理器，清理资源
   */
  public destroy() {
    this.pendingUpdates.clear()
  }
}

// 创建单例实例
export const unreadCountManager = new UnreadCountManager()
