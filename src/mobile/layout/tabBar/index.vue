<template>
  <div class="flex justify-around items-end pt-3">
    <RouterLink
      v-for="item in navItems"
      :key="item.path"
      :to="item.path"
      class="tab-item flex flex-col flex-1 items-center no-underline relative"
      :class="route.path === item.path ? 'color-[--tab-bar-icon-color]' : 'text-#000'">
      <svg class="w-22px h-22px">
        <use :href="`#${route.path === item.path ? item.actionIcon : item.icon}`"></use>
      </svg>
      <span class="text-xs mt-1">{{ item.label }}</span>
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
type NavItem = {
  label: string
  path: string
  icon: string
  actionIcon: string
}

const route = useRoute()
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

<style scoped lang="scss"></style>
