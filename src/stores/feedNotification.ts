import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { StoresEnum } from '@/enums'

/**
 * 朋友圈通知项
 */
export interface FeedNotificationItem {
  id: string // 唯一ID
  type: 'like' | 'comment' // 通知类型：点赞或评论
  feedId: string // 朋友圈ID
  feedContent: string // 朋友圈内容
  operatorUid: string // 操作人UID
  operatorName: string // 操作人名称
  operatorAvatar: string // 操作人头像
  commentContent?: string // 评论内容（仅评论类型）
  createTime: number // 创建时间
  isRead: boolean // 是否已读
}

interface NotificationStats {
  unreadCount: number
  totalCount: number
}

/**
 * 朋友圈通知 Store
 * 管理朋友圈的点赞和评论通知
 */
export const useFeedNotificationStore = defineStore(StoresEnum.FEED_NOTIFICATION, () => {
  // 通知列表
  const notifications = ref<FeedNotificationItem[]>([])

  // 通知统计
  const notificationStats = reactive<NotificationStats>({
    unreadCount: 0, // 未读通知数
    totalCount: 0 // 总通知数
  })

  /**
   * 添加通知
   */
  const addNotification = (notification: FeedNotificationItem) => {
    // 检查是否已存在相同的通知（避免重复）
    const exists = notifications.value.some(
      (n) =>
        n.feedId === notification.feedId &&
        n.operatorUid === notification.operatorUid &&
        n.type === notification.type &&
        Math.abs(n.createTime - notification.createTime) < 1000 // 1秒内的重复通知视为同一条
    )

    if (!exists) {
      notifications.value.unshift(notification)
      notificationStats.totalCount++

      if (!notification.isRead) {
        notificationStats.unreadCount++
      }
    }
  }

  /**
   * 标记通知为已读
   */
  const markAsRead = (notificationId: string) => {
    const notification = notifications.value.find((n) => n.id === notificationId)
    if (notification && !notification.isRead) {
      notification.isRead = true
      notificationStats.unreadCount = Math.max(0, notificationStats.unreadCount - 1)
    }
  }

  /**
   * 标记所有通知为已读
   */
  const markAllAsRead = () => {
    notifications.value.forEach((n) => {
      n.isRead = true
    })
    notificationStats.unreadCount = 0
  }

  /**
   * 删除通知
   */
  const deleteNotification = (notificationId: string) => {
    const index = notifications.value.findIndex((n) => n.id === notificationId)
    if (index > -1) {
      const notification = notifications.value[index]
      if (!notification.isRead) {
        notificationStats.unreadCount = Math.max(0, notificationStats.unreadCount - 1)
      }
      notifications.value.splice(index, 1)
      notificationStats.totalCount = Math.max(0, notificationStats.totalCount - 1)
    }
  }

  /**
   * 清空所有通知
   */
  const clearAllNotifications = () => {
    notifications.value = []
    notificationStats.unreadCount = 0
    notificationStats.totalCount = 0
  }

  return {
    notifications,
    notificationStats,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  }
})
