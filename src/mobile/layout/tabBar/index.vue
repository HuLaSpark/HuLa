<template>
  <n-divider class="p-0! m-0!" />
  <div class="tab-bar flex justify-around items-end pt-3">
    <RouterLink
      v-for="item in navItems"
      :key="item.path"
      :to="item.path"
      class="tab-item flex flex-col flex-1 items-center no-underline relative"
      :class="route.path === item.path ? 'color-[--tab-bar-icon-color]' : 'text-#000 dark:text-white/80'">
      <n-badge
        class="flex flex-col w-55% flex-1 relative items-center"
        :offset="[-6, 6]"
        color="#c14053"
        :value="getUnReadCount(item.label)"
        :max="99">
        <svg class="w-22px h-22px">
          <use :href="`#${route.path === item.path ? item.actionIcon : item.icon}`"></use>
        </svg>
        <span class="text-xs mt-1">{{ item.label }}</span>
      </n-badge>
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { useFeedStore } from '@/stores/feed'
import { useGlobalStore } from '@/stores/global'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

type NavItem = {
  label: string
  path: string
  icon: string
  actionIcon: string
}

const { t } = useI18n()
const route = useRoute()
const feedStore = useFeedStore()
const { unreadCount: feedUnreadCount } = storeToRefs(feedStore)
const globalStore = useGlobalStore()

const getUnReadCount = (label: string) => {
  if (label === '消息') {
    return globalStore.unReadMark.newMsgUnreadCount
  }
  if (label === t('mobile_tabbar.items.contacts')) {
    return globalStore.unReadMark.newFriendUnreadCount + globalStore.unReadMark.newGroupUnreadCount
  }
  if (label === '社区') {
    return feedUnreadCount.value
  }
  return 0

  // 其他未读计数暂时关闭
}

const navItems: NavItem[] = [
  {
    label: t('mobile_tabbar.items.messages'),
    path: '/mobile/message',
    icon: 'message',
    actionIcon: 'message-action'
  },
  {
    label: t('mobile_tabbar.items.contacts'),
    path: '/mobile/friends',
    icon: 'avatar',
    actionIcon: 'avatar-action'
  },
  {
    label: t('mobile_tabbar.items.community'),
    path: '/mobile/community',
    icon: 'fire',
    actionIcon: 'fire-action'
  },
  {
    label: t('mobile_tabbar.items.me'),
    path: '/mobile/my',
    icon: 'wode',
    actionIcon: 'wode-action'
  }
]
</script>

<style scoped lang="scss">
.tab-bar {
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}
</style>
