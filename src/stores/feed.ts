import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { StoresEnum } from '@/enums'
import {
  feedList as getFeedListApi,
  feedDetail as getFeedDetailApi,
  pushFeed,
  delFeed,
  editFeed,
  feedLikeToggle,
  feedLikeList,
  feedLikeCount,
  feedLikeHasLiked,
  feedCommentAdd,
  feedCommentDelete,
  feedCommentAll,
  feedCommentCount
} from '@/utils/ImRequestUtils'

/**
 * 朋友圈/动态 Store
 * 管理动态列表、发布、删除、编辑等功能
 */

// 点赞用户信息
export interface LikeUser {
  uid: string | number
  userName: string
  userAvatar: string
}

// 评论信息
export interface CommentItem {
  id: string | number
  uid: string | number
  userName: string
  content: string
  createTime?: number
  replyCommentId?: string | number // 被回复的评论ID
  replyUid?: string | number // 被回复人的uid
  replyUserName?: string // 被回复人的名称
}

// 朋友圈项类型定义
export interface FeedItem {
  id: string
  content: string
  urls?: string[] | null // 图片URL列表
  videoUrl?: string
  createTime?: number
  createBy?: string // 创建者ID
  uid: string // 用户ID
  commentCount?: number
  likeCount?: number // 点赞数量
  likeList?: LikeUser[] // 点赞用户列表
  commentList?: CommentItem[] // 评论列表
  hasLiked?: boolean // 是否已点赞
  mediaType?: 0 | 1 | 2 // 0-纯文本, 1-图片, 2-视频
  userName?: string
  userAvatar?: string
  permission?: 'privacy' | 'open' | 'partVisible' | 'notAnyone'
}

// 发布动态参数
export interface PublishFeedParams {
  content: string
  mediaType: 0 | 1 | 2
  urls?: string[]
  videoUrl?: string
  permission: 'privacy' | 'open' | 'partVisible' | 'notAnyone'
  uidList?: number[]
  targetIds?: number[]
}

// 编辑动态参数
export interface EditFeedParams {
  id: number
  content: string
  mediaType: 0 | 1 | 2
  urls?: string[]
  videoUrl?: string
  permission: 'privacy' | 'open' | 'partVisible' | 'notAnyone'
  uidList?: number[]
  targetIds?: number[]
}

export const useFeedStore = defineStore(
  StoresEnum.FEED,
  () => {
    // 动态列表
    const feedList = ref<FeedItem[]>([])

    // 分页选项
    const feedOptions = reactive({
      isLast: false,
      isLoading: false,
      cursor: ''
    })

    // 统计信息
    const feedStats = reactive({
      total: 0,
      followCount: 0,
      fansCount: 0
    })

    // 未读消息数量
    const unreadCount = ref(0)

    // 朋友圈未读状态（用于全局通知处理）
    const feedUnreadStatus = reactive({
      hasUnread: false, // 是否有未读通知
      unreadCount: 0 // 未读通知数量
    })

    /**
     * 获取动态列表
     * @param isFresh 是否刷新列表，true则重新加载，false则加载更多
     */
    const getFeedList = async (isFresh = false) => {
      // 非刷新模式下，如果已经加载完或正在加载中，则直接返回
      if (!isFresh) {
        if (feedOptions.isLast || feedOptions.isLoading) return
      }

      feedOptions.isLoading = true

      try {
        const response = await getFeedListApi({
          pageSize: 20,
          cursor: isFresh ? '' : feedOptions.cursor
        })

        if (!response) return

        const data = response

        // 刷新模式下替换整个列表，否则追加到列表末尾
        if (isFresh) {
          feedList.value.splice(0, feedList.value.length, ...data.list)
        } else {
          feedList.value.push(...data.list)
        }

        // 更新分页信息
        feedOptions.cursor = data.cursor
        feedOptions.isLast = data.isLast

        // 更新统计信息
        feedStats.total = data.total || feedList.value.length
      } catch (error) {
        console.error('获取朋友圈列表失败:', error)
        throw error
      } finally {
        feedOptions.isLoading = false
      }
    }

    /**
     * 发布动态
     * @param params 发布参数
     */
    const publishFeed = async (params: PublishFeedParams) => {
      try {
        const response = await pushFeed(params)

        // 发布成功后刷新列表
        await getFeedList(true)

        return response
      } catch (error) {
        console.error('发布动态失败:', error)
        throw error
      }
    }

    /**
     * 删除动态
     * @param feedId 动态ID
     */
    const deleteFeed = async (feedId: string) => {
      try {
        await delFeed({ feedId })

        // 从列表中移除已删除的动态
        const index = feedList.value.findIndex((item: any) => item.id === feedId)
        if (index > -1) {
          feedList.value.splice(index, 1)
          feedStats.total = Math.max(0, feedStats.total - 1)
        }
      } catch (error) {
        console.error('删除动态失败:', error)
        throw error
      }
    }

    /**
     * 编辑动态
     * @param params 编辑参数
     */
    const updateFeed = async (params: EditFeedParams) => {
      try {
        await editFeed(params)

        // 刷新列表以获取最新数据
        await getFeedList(true)
      } catch (error) {
        console.error('编辑动态失败:', error)
        throw error
      }
    }

    /**
     * 加载更多动态
     */
    const loadMore = async () => {
      await getFeedList(false)
    }

    /**
     * 刷新动态列表
     */
    const refresh = async () => {
      await getFeedList(true)
    }

    /**
     * 清空动态列表
     */
    const clearFeedList = () => {
      feedList.value = []
      feedOptions.cursor = ''
      feedOptions.isLast = false
      feedStats.total = 0
    }

    /**
     * 更新统计信息
     */
    const updateStats = (stats: Partial<typeof feedStats>) => {
      Object.assign(feedStats, stats)
    }

    /**
     * 增加未读消息数量
     */
    const increaseUnreadCount = (count = 1) => {
      unreadCount.value += count
    }

    /**
     * 减少未读消息数量
     */
    const decreaseUnreadCount = (count = 1) => {
      unreadCount.value = Math.max(0, unreadCount.value - count)
    }

    /**
     * 清空未读消息数量
     */
    const clearUnreadCount = () => {
      unreadCount.value = 0
      feedUnreadStatus.unreadCount = 0
      feedUnreadStatus.hasUnread = false
    }

    /**
     * 设置未读消息数量
     */
    const setUnreadCount = (count: number) => {
      unreadCount.value = count
    }

    // ==================== 点赞相关方法 ====================
    /**
     * 点赞或取消点赞
     */
    const toggleLike = async (feedId: string, actType: number) => {
      try {
        await feedLikeToggle({ feedId, actType })
        // 更新本地状态
        const feed = feedList.value.find((f: any) => f.id === feedId)
        if (feed) {
          if (actType === 1) {
            feed.hasLiked = true
            try {
              const likeListResult = await getLikeList(feedId)
              if (Array.isArray(likeListResult)) {
                feed.likeList = likeListResult
                feed.likeCount = likeListResult.length
              }
            } catch (_error) {
              feed.likeCount = (feed.likeCount || 0) + 1
            }
          } else if (actType === 2) {
            feed.hasLiked = false
            try {
              const likeListResult = await getLikeList(feedId)
              if (Array.isArray(likeListResult)) {
                feed.likeList = likeListResult
                feed.likeCount = likeListResult.length
              }
            } catch (_error) {
              feed.likeCount = Math.max(0, (feed.likeCount || 1) - 1)
            }
          }
        }
        return true
      } catch (error) {
        console.error('点赞失败:', error)
        throw error
      }
    }

    /**
     * 获取点赞列表
     */
    const getLikeList = async (feedId: string) => {
      try {
        return await feedLikeList({ feedId })
      } catch (error) {
        console.error('获取点赞列表失败:', error)
        throw error
      }
    }

    /**
     * 获取点赞数量
     */
    const getLikeCount = async (feedId: string) => {
      try {
        return await feedLikeCount({ feedId })
      } catch (error) {
        console.error('获取点赞数量失败:', error)
        throw error
      }
    }

    /**
     * 判断是否已点赞
     */
    const checkHasLiked = async (feedId: string) => {
      try {
        return await feedLikeHasLiked({ feedId })
      } catch (error) {
        console.error('检查点赞状态失败:', error)
        throw error
      }
    }

    // ==================== 评论相关方法 ====================

    /**
     * 发表评论
     */
    const addComment = async (feedId: string, content: string, replyCommentId?: string, replyUid?: string) => {
      try {
        await feedCommentAdd({ feedId, content, replyCommentId, replyUid })
        const feed = feedList.value.find((f: any) => f.id === feedId)
        if (feed) {
          // 获取最新的评论列表
          try {
            const commentListResult = await getCommentList(feedId)
            if (Array.isArray(commentListResult)) {
              feed.commentList = commentListResult
              feed.commentCount = commentListResult.length
            }
          } catch (_error) {
            // 如果获取失败，使用本地计数
            feed.commentCount = (feed.commentCount || 0) + 1
          }
        }
        return true
      } catch (error) {
        console.error('发表评论失败:', error)
        throw error
      }
    }

    /**
     * 删除评论
     */
    const deleteComment = async (commentId: string, feedId?: string) => {
      try {
        await feedCommentDelete({ commentId })
        // 更新评论数量
        if (feedId) {
          const feed = feedList.value.find((f: any) => f.id === feedId)
          if (feed && feed.commentCount) {
            feed.commentCount = Math.max(0, feed.commentCount - 1)
          }
        }
        return true
      } catch (error) {
        console.error('删除评论失败:', error)
        throw error
      }
    }

    /**
     * 获取评论列表（不分页，用于发表评论后更新）
     */
    const getCommentList = async (feedId: string) => {
      try {
        return await feedCommentAll({ feedId })
      } catch (error) {
        console.error('获取评论列表失败:', error)
        throw error
      }
    }

    /**
     * 获取评论数量
     */
    const getCommentCount = async (feedId: string) => {
      try {
        return await feedCommentCount({ feedId })
      } catch (error) {
        console.error('获取评论数量失败:', error)
        throw error
      }
    }

    /**
     * 获取单个朋友圈详情
     */
    const getFeedDetail = async (feedId: string) => {
      try {
        const result = await getFeedDetailApi({ feedId })
        console.log('✅ 获取朋友圈详情成功:', result)
        return result
      } catch (error) {
        console.error('获取朋友圈详情失败:', error)
        throw error
      }
    }

    /**
     * 处理朋友圈通知（全局处理）
     * 用于在 WebSocket 接收到通知时更新未读状态
     */
    const handleFeedNotification = (_data: any) => {
      // 更新未读状态
      feedUnreadStatus.hasUnread = true
      feedUnreadStatus.unreadCount++

      // 同时更新总未读数
      increaseUnreadCount(1)

      console.log('📢 朋友圈通知已处理，未读数:', feedUnreadStatus.unreadCount)
    }

    /**
     * 清除朋友圈未读状态
     */
    const clearFeedUnreadStatus = () => {
      feedUnreadStatus.hasUnread = false
      feedUnreadStatus.unreadCount = 0
    }

    return {
      feedList,
      feedOptions,
      feedStats,
      unreadCount,
      feedUnreadStatus,
      getFeedList,
      publishFeed,
      deleteFeed,
      updateFeed,
      loadMore,
      refresh,
      clearFeedList,
      updateStats,
      increaseUnreadCount,
      decreaseUnreadCount,
      clearUnreadCount,
      setUnreadCount,
      // 点赞相关
      toggleLike,
      getLikeList,
      getLikeCount,
      checkHasLiked,
      // 评论相关
      addComment,
      deleteComment,
      getCommentList,
      getCommentCount,
      // 详情相关
      getFeedDetail,
      // 通知处理
      handleFeedNotification,
      clearFeedUnreadStatus
    }
  },
  {
    // 启用状态共享
    share: {
      enable: true,
      initialize: true
    }
  }
)
