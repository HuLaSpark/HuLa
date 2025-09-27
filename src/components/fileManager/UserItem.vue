<template>
  <div :class="['user-item', { 'user-item--selected': isSelected }]" @click="handleClick">
    <!-- 头像 -->
    <div class="user-avatar">
      <img
        :src="itemData.avatar || getDefaultAvatar()"
        :alt="itemData.name"
        @error="handleAvatarError"
        class="avatar-img" />
      <!-- 在线状态指示器 -->
      <div v-if="itemData.isOnline" class="online-indicator"></div>
    </div>

    <!-- 信息 -->
    <div class="user-info">
      <div class="user-name" :title="itemData.name">{{ itemData.name }}</div>
      <div v-if="itemData.subtitle" class="user-subtitle" :title="itemData.subtitle">
        {{ itemData.subtitle }}
      </div>
    </div>

    <!-- 额外信息 -->
    <div v-if="itemData.count !== undefined" class="item-count">
      {{ itemData.count }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  user?: any
  room?: any
  contact?: any
  isSelected?: boolean
}

type Emits = (e: 'click', item: any) => void

const props = withDefaults(defineProps<Props>(), {
  isSelected: false
})

const emit = defineEmits<Emits>()

// 统一的数据格式
const itemData = computed(() => {
  const item = props.user || props.room || props.contact || {}

  return {
    name: item.name || item.roomName || item.groupName || item.nickname || item.userName || item.remark || '未知',
    avatar: item.avatar || item.roomAvatar || '',
    isOnline: item.isOnline || item.activeStatus === 1,
    subtitle: getSubtitle(item),
    count: item.memberCount || item.unreadCount,
    ...item
  }
})

const getSubtitle = (item: any) => {
  if (item.roomName) {
    // 群聊显示成员数量
    return item.memberCount ? `${item.memberCount}人` : ''
  }
  if (item.lastMessage) {
    // 会话显示最后一条消息
    return item.lastMessage
  }
  return ''
}

const getDefaultAvatar = () => {
  // 统一使用 logoD.png 作为默认头像，避免闪烁问题
  return '/logoD.png'
}

const handleClick = () => {
  emit('click', itemData.value)
}

const handleAvatarError = (event: Event) => {
  const target = event.target as HTMLImageElement
  const defaultAvatar = getDefaultAvatar()

  // 防止无限循环：如果当前已经是默认头像，就不再尝试更换
  if (target.src.includes('logoD.png') || target.src === defaultAvatar) {
    return
  }

  target.src = defaultAvatar
}
</script>

<style scoped lang="scss">
.user-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover:not(&--selected) {
    background-color: #f5f5f5;
  }

  &--selected {
    background-color: #e8f4f1;
    border: 1px solid #13987f;
  }
}

.user-avatar {
  position: relative;
  margin-right: 12px;
  flex-shrink: 0;
}

.avatar-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--avatar-border-color);
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  background-color: #52c41a;
  border-radius: 50%;
  border: 2px solid var(--center-bg-color);
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-subtitle {
  font-size: 12px;
  color: var(--text-color);
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.item-count {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-color);
  opacity: 0.6;
  padding: 2px 6px;
  background-color: var(--line-color);
  border-radius: 10px;
  margin-left: 8px;
}

// 深色主题适配
html[data-theme='dark'] {
  .user-item {
    &:hover:not(&--selected) {
      background-color: #2d2d2d;
    }

    &--selected {
      background-color: rgba(19, 152, 127, 0.2);
      border-color: #13987f;
    }
  }
}
</style>
