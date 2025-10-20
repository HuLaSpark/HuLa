<template>
  <div class="tab-bar flex justify-around items-end pt-3">
    <RouterLink
      v-for="item in navItems"
      :key="item.path"
      :to="item.path"
      class="tab-item flex flex-col flex-1 items-center no-underline relative"
      :class="route.path === item.path ? 'color-[--tab-bar-icon-color]' : 'text-#000'">
      <n-badge
        class="flex flex-col w-55% flex-1 relative items-center"
        :offset="[-6, 6]"
        color="red"
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
import { useGlobalStore } from '@/stores/global'

type NavItem = {
  label: string
  path: string
  icon: string
  actionIcon: string
}

const route = useRoute()
const globalStore = useGlobalStore()

const unReadMark = computed(() => globalStore.unReadMark)

const getUnReadCount = (label: string) => {
  if (label === '消息') {
    return unReadMark.value.newMsgUnreadCount
  } else if (label === '联系人') {
    return unReadMark.value.newFriendUnreadCount
  } else if (label === '社区') {
    return unReadMark.value.newGroupUnreadCount
  } else {
    return 0
  }
}

const navItems: NavItem[] = [
  {
    label: '消息',
    path: '/mobile/message',
    icon: 'message',
    actionIcon: 'message-action'
  },
  {
    label: '联系人',
    path: '/mobile/friends',
    icon: 'avatar',
    actionIcon: 'avatar-action'
  },
  {
    label: '社区',
    path: '/mobile/community',
    icon: 'fire',
    actionIcon: 'fire-action'
  },
  {
    label: '我的',
    path: '/mobile/my',
    icon: 'wode',
    actionIcon: 'wode-action'
  }
]
</script>

<style scoped lang="scss">
.tab-bar {
  border-top: 0.5px solid #e3e3e3;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}
</style>
