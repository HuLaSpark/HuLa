<template>
  <n-flex vertical :size="40">
    <!-- 消息通知设置 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">提示音</span>

      <n-flex class="item p-12px" :size="12" vertical>
        <!-- 消息提示音 -->
        <n-flex align="center" justify="space-between">
          <n-flex vertical :size="8">
            <span>消息提示音</span>
            <span class="text-(12px #909090)">开启后，收到新消息时会播放提示音</span>
          </n-flex>

          <n-switch size="small" v-model:value="messageSound" />
        </n-flex>
      </n-flex>
    </n-flex>

    <!-- 群消息设置 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <n-flex align="center" justify="space-between" class="pl-10px pr-10px">
        <span>群消息设置</span>
        <n-input v-model:value="searchKeyword" size="small" placeholder="搜索群聊" clearable style="width: 200px">
          <template #prefix>
            <svg class="size-14px"><use href="#search"></use></svg>
          </template>
        </n-input>
      </n-flex>

      <n-flex class="item" :size="0" vertical>
        <div v-if="filteredGroupSessions.length === 0" class="text-(12px #909090) text-center py-20px">
          {{ searchKeyword ? '未找到匹配的群聊' : '暂无群聊' }}
        </div>

        <!-- 批量操作栏 -->
        <n-flex v-if="filteredGroupSessions.length > 0" align="center" justify="space-between" class="p-12px h-28px">
          <n-flex align="center" :size="12">
            <n-checkbox
              v-model:checked="selectAll"
              :indeterminate="selectedSessions.length > 0 && selectedSessions.length < filteredGroupSessions.length"
              @update:checked="handleSelectAll">
              全选 ({{ selectedSessions.length }}/{{ filteredGroupSessions.length }})
            </n-checkbox>
          </n-flex>

          <n-flex v-if="selectedSessions.length > 0" align="center" :size="8">
            <span class="text-(12px #909090)">批量设置:</span>
            <n-button
              size="small"
              type="primary"
              secondary
              :disabled="isProcessing"
              @click="batchSetNotification('allow')">
              允许提醒
            </n-button>
            <n-button size="small" secondary :disabled="isProcessing" @click="batchSetNotification('mute')">
              免打扰
            </n-button>
            <n-button
              size="small"
              type="error"
              secondary
              :disabled="isProcessing"
              @click="batchSetNotification('shield')">
              屏蔽
            </n-button>
          </n-flex>
        </n-flex>

        <!-- 进度条显示 -->
        <n-flex v-if="isProcessing" vertical :size="12" class="p-12px">
          <n-flex align="center" justify="space-between">
            <span class="text-(12px #909090)">正在处理：{{ processedCount }}/{{ totalCount }}</span>
            <span class="text-(12px #909090)">{{ progress }}%</span>
          </n-flex>
          <n-progress
            type="line"
            :color="'#13987f'"
            :rail-color="'#13987f30'"
            :percentage="progress"
            :show-indicator="false" />
        </n-flex>

        <span v-if="filteredGroupSessions.length > 0" class="w-full h-1px bg-[--line-color] block"></span>

        <n-scrollbar
          style="max-height: 420px; padding: 0 12px; box-sizing: border-box"
          :style="{ pointerEvents: isDropdownShow ? 'none' : 'auto' }">
          <template v-for="(session, index) in filteredGroupSessions" :key="session.roomId">
            <n-flex align="center" justify="space-between" class="py-14px">
              <n-flex align="center" :size="12">
                <n-checkbox
                  :checked="selectedSessions.includes(session.roomId)"
                  @update:checked="(checked) => handleSessionSelect(session.roomId, checked)" />
                <img
                  :src="AvatarUtils.getAvatarUrl(session.avatar) || '/imgs/avatar.png'"
                  :alt="session.name"
                  class="w-32px h-32px rounded-6px object-cover" />
                <n-flex vertical :size="2">
                  <span class="text-14px">{{ session.name }}</span>
                </n-flex>
              </n-flex>

              <n-dropdown
                :options="getNotificationOptions(session)"
                @select="(key) => handleNotificationChange(session, key)"
                trigger="click"
                :scrollable="false"
                @update:show="(show) => (isDropdownShow = show)">
                <n-button size="small" :color="'#13987f'" text class="text-(12px [--text-color])">
                  {{ getNotificationStatusText(session) }}
                </n-button>
              </n-dropdown>
            </n-flex>

            <span v-if="index < filteredGroupSessions.length - 1" class="w-full h-1px bg-[--line-color] block"></span>
          </template>
        </n-scrollbar>
      </n-flex>
    </n-flex>
  </n-flex>
</template>

<script setup lang="ts">
import { NotificationTypeEnum, RoomTypeEnum } from '@/enums'
import type { SessionItem } from '@/services/types'
import { useChatStore } from '@/stores/chat'
import { useSettingStore } from '@/stores/setting'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { notification, shield } from '@/utils/ImRequestUtils'

const settingStore = useSettingStore()
const chatStore = useChatStore()

// 搜索关键词
const searchKeyword = ref('')

// 选中的会话列表
const selectedSessions = ref<string[]>([])

// 批量操作进度状态
const isProcessing = ref(false)
const progress = ref(0)
const processedCount = ref(0)
const totalCount = ref(0)
const processingResults = ref<{ roomId: string; name: string; success: boolean; error?: string }[]>([])

// 下拉菜单显示状态
const isDropdownShow = ref(false)

const messageSound = computed({
  get: () => settingStore.notification.messageSound,
  set: (value: boolean) => {
    settingStore.setMessageSoundEnabled(value)
  }
})

// 获取所有群聊会话（包含官方频道）
const groupSessions = computed(() => {
  return chatStore.sessionList.filter((session) => session.type === RoomTypeEnum.GROUP)
})

// 过滤后的群聊列表（搜索功能）
const filteredGroupSessions = computed(() => {
  if (!searchKeyword.value) {
    return groupSessions.value
  }
  return groupSessions.value.filter((session) => session.name.toLowerCase().includes(searchKeyword.value.toLowerCase()))
})

// 全选状态
const selectAll = computed({
  get: () =>
    selectedSessions.value.length === filteredGroupSessions.value.length && filteredGroupSessions.value.length > 0,
  set: (value: boolean) => {
    if (value) {
      selectedSessions.value = filteredGroupSessions.value.map((session) => session.roomId)
    } else {
      selectedSessions.value = []
    }
  }
})

// 获取通知状态文本
const getNotificationStatusText = (session: SessionItem) => {
  if (session.shield) {
    return '已屏蔽消息'
  }

  switch (session.muteNotification) {
    case NotificationTypeEnum.RECEPTION:
      return '允许消息提醒'
    case NotificationTypeEnum.NOT_DISTURB:
      return '接收消息但不提醒'
    default:
      return '允许消息提醒'
  }
}

// 获取下拉菜单选项
const getNotificationOptions = (session: SessionItem) => {
  return [
    {
      label: '允许消息提醒',
      key: 'allow',
      icon:
        !session.shield && session.muteNotification === NotificationTypeEnum.RECEPTION
          ? () => h('svg', { class: 'size-14px text-#13987f' }, [h('use', { href: '#check-small' })])
          : undefined
    },
    {
      label: '接收消息但不提醒',
      key: 'mute',
      icon:
        !session.shield && session.muteNotification === NotificationTypeEnum.NOT_DISTURB
          ? () => h('svg', { class: 'size-14px text-#13987f' }, [h('use', { href: '#check-small' })])
          : undefined
    },
    {
      label: '屏蔽群消息',
      key: 'shield',
      icon: session.shield
        ? () => h('svg', { class: 'size-14px text-#13987f' }, [h('use', { href: '#check-small' })])
        : undefined
    }
  ]
}

// 处理全选
const handleSelectAll = (checked: boolean) => {
  selectAll.value = checked
}

// 处理单个会话选择
const handleSessionSelect = (roomId: string, checked: boolean) => {
  if (checked) {
    if (!selectedSessions.value.includes(roomId)) {
      selectedSessions.value.push(roomId)
    }
  } else {
    const index = selectedSessions.value.indexOf(roomId)
    if (index > -1) {
      selectedSessions.value.splice(index, 1)
    }
  }
}

// 批量设置通知
const batchSetNotification = async (type: string) => {
  if (selectedSessions.value.length === 0) {
    window.$message?.warning('请先选择要设置的群聊')
    return
  }

  // 初始化进度状态
  isProcessing.value = true
  progress.value = 0
  processedCount.value = 0
  totalCount.value = selectedSessions.value.length
  processingResults.value = []

  try {
    for (let i = 0; i < selectedSessions.value.length; i++) {
      const roomId = selectedSessions.value[i]
      const session = groupSessions.value.find((s) => s.roomId === roomId)

      if (!session) {
        processingResults.value.push({
          roomId,
          name: '未知群聊',
          success: false,
          error: '找不到群聊信息'
        })
      } else {
        try {
          await handleNotificationChange(session, type)
          processingResults.value.push({
            roomId,
            name: session.name,
            success: true
          })
        } catch (error: any) {
          processingResults.value.push({
            roomId,
            name: session.name,
            success: false,
            error: error.message || '设置失败'
          })
        }
      }

      // 更新进度
      processedCount.value = i + 1
      progress.value = Math.round(((i + 1) / selectedSessions.value.length) * 100)
    }

    // 显示结果统计
    const successCount = processingResults.value.filter((r) => r.success).length
    const failCount = processingResults.value.length - successCount

    const typeText =
      {
        allow: '允许消息提醒',
        mute: '免打扰',
        shield: '屏蔽'
      }[type] || '未知'

    if (failCount === 0) {
      window.$message?.success(`批量设置完成！${successCount} 个群聊已设置为${typeText}`)
    } else {
      window.$message?.warning(`批量设置完成：${successCount} 个成功，${failCount} 个失败`)
    }

    // 清空选择
    selectedSessions.value = []
  } catch (error) {
    console.error('批量设置失败:', error)
    window.$message?.error('批量设置失败，请重试')
  } finally {
    // 延迟隐藏进度条，让用户看到完成状态
    setTimeout(() => {
      isProcessing.value = false
    }, 1500)
  }
}

// 处理通知设置变更
const handleNotificationChange = async (session: SessionItem, key: string) => {
  try {
    switch (key) {
      case 'allow':
        // 如果当前是屏蔽状态，需要先取消屏蔽
        if (session.shield) {
          await shield({
            roomId: session.roomId,
            state: false
          })
          chatStore.updateSession(session.roomId, { shield: false })
        }

        await notification({
          roomId: session.roomId,
          type: NotificationTypeEnum.RECEPTION
        })

        chatStore.updateSession(session.roomId, {
          muteNotification: NotificationTypeEnum.RECEPTION
        })

        window.$message?.success('已允许消息提醒')
        break

      case 'mute':
        // 如果当前是屏蔽状态，需要先取消屏蔽
        if (session.shield) {
          await shield({
            roomId: session.roomId,
            state: false
          })
          chatStore.updateSession(session.roomId, { shield: false })
        }

        await notification({
          roomId: session.roomId,
          type: NotificationTypeEnum.NOT_DISTURB
        })

        chatStore.updateSession(session.roomId, {
          muteNotification: NotificationTypeEnum.NOT_DISTURB
        })

        // 设置免打扰时更新全局未读数
        chatStore.updateTotalUnreadCount()
        window.$message?.success('已设置接收消息但不提醒')
        break

      case 'shield':
        await shield({
          roomId: session.roomId,
          state: !session.shield
        })

        chatStore.updateSession(session.roomId, {
          shield: !session.shield
        })

        window.$message?.success(session.shield ? '已取消屏蔽' : '已屏蔽消息')
        break
    }
  } catch (error) {
    console.error('设置群消息通知失败:', error)
    window.$message?.error('设置失败，请重试')
  }
}

// 监听搜索关键词变化，清空选择
watch(searchKeyword, () => {
  selectedSessions.value = []
})
</script>

<style scoped lang="scss">
.item {
  @apply bg-[--bg-setting-item] rounded-12px size-full box-border border-(solid 1px [--line-color]) custom-shadow;
}

.n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--vertical > .n-scrollbar-rail__scrollbar,
.n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--vertical > .n-scrollbar-rail__scrollbar {
  left: -2px;
}
</style>
