import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useDebounceFn } from '@vueuse/core'
import { sumBy } from 'es-toolkit'
import { NotificationTypeEnum } from '@/enums'
import type { SessionItem } from '@/services/types'
import { isMac } from '@/utils/PlatformConstants'

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
   * @param feedUnreadCount 朋友圈未读数（可选）
   */
  public calculateTotal(
    sessionList: SessionItem[],
    unReadMark: { newFriendUnreadCount: number; newGroupUnreadCount: number; newMsgUnreadCount: number },
    feedUnreadCount?: number
  ) {
    // 计算总未读数（排除免打扰的会话）
    const totalUnread = sumBy(sessionList, (session) => {
      if (session.muteNotification === NotificationTypeEnum.NOT_DISTURB) {
        return 0
      }
      return Math.max(0, session.unreadCount || 0)
    })

    // 更新全局未读计数
    unReadMark.newMsgUnreadCount = totalUnread

    // 更新系统徽章（包含朋友圈未读数）
    this.updateSystemBadge(unReadMark, feedUnreadCount)
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
   * @param unReadMark 全局未读标记对象
   * @param feedUnreadCount 朋友圈未读数（可选）
   */
  private async updateSystemBadge(
    unReadMark: {
      newFriendUnreadCount: number
      newGroupUnreadCount: number
      newMsgUnreadCount: number
    },
    feedUnreadCount?: number
  ): Promise<void> {
    const messageUnread = Math.max(0, unReadMark.newMsgUnreadCount || 0)
    const friendUnread = Math.max(0, unReadMark.newFriendUnreadCount || 0)
    const groupUnread = Math.max(0, unReadMark.newGroupUnreadCount || 0)
    const feedUnread = Math.max(0, feedUnreadCount || 0)
    const badgeTotal = messageUnread + friendUnread + groupUnread + feedUnread

    // 在 macOS 上更新 Dock 图标徽章
    if (isMac()) {
      const count = badgeTotal > 0 ? badgeTotal : undefined
      // 使用 getByLabel 获取 home 窗口，即使窗口隐藏也能正常设置徽章
      const homeWindow = await WebviewWindow.getByLabel('home')
      if (homeWindow) {
        await homeWindow.setBadgeCount(count)
      }
    }

    // 更新tipVisible状态，用于控制托盘通知显示
    if (messageUnread > 0) {
      // 有新消息时，设置tipVisible为true，触发托盘闪烁
      this.setTipVisible?.(true)
    } else {
      // 没有未读消息时，设置tipVisible为false
      this.setTipVisible?.(false)
    }
  }

  /**
   * 手动刷新系统徽章计数
   * @param unReadMark 全局未读标记对象
   * @param feedUnreadCount 朋友圈未读数（可选）
   */
  public refreshBadge(
    unReadMark: {
      newFriendUnreadCount: number
      newGroupUnreadCount: number
      newMsgUnreadCount: number
    },
    feedUnreadCount?: number
  ) {
    this.updateSystemBadge(unReadMark, feedUnreadCount)
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
