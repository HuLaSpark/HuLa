import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { StoresEnum } from '@/enums'
import { feedList as getFeedListApi, pushFeed, delFeed, editFeed } from '@/utils/ImRequestUtils'

/**
 * 朋友圈/动态 Store
 * 管理动态列表、发布、删除、编辑等功能
 */

// 朋友圈项类型定义（与后端返回的数据结构对齐）
export interface FeedItem {
  id: string
  content: string
  urls?: string[] | null // 图片URL列表
  videoUrl?: string
  createTime?: number
  createBy?: string // 创建者ID
  uid: string // 用户ID
  commentCount?: number
  mediaType?: 0 | 1 | 2 // 0-纯文本, 1-图片, 2-视频
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
        const index = feedList.value.findIndex((item) => item.id === feedId)
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

    return {
      feedList,
      feedOptions,
      feedStats,
      getFeedList,
      publishFeed,
      deleteFeed,
      updateFeed,
      loadMore,
      refresh,
      clearFeedList,
      updateStats
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
