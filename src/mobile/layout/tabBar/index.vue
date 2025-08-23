<template>
  <nav class="tab-bar">
    <div class="flex justify-around items-end h-full">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :style="{ height: tabHeight }"
        class="tab-item flex flex-col flex-1 items-center no-underline relative"
        :class="route.path === item.path ? 'color-[--tab-bar-icon-color] is-active' : 'text-#000'">
        <svg class="w-22px h-22px">
          <use :href="`#${route.path === item.path ? item.actionIcon : item.icon}`"></use>
        </svg>
        <span class="text-xs mt-1">{{ item.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useMobileStore } from '@/stores/mobile'
import { isAndroid, isIOS } from '@/utils/PlatformConstants'

const mobileStore = useMobileStore()

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

const customHeight = ref(50)

if (isAndroid()) {
  customHeight.value = mobileStore.safeArea.bottom
} else if (isIOS()) {
  customHeight.value = mobileStore.safeArea.bottom + 20
}

const tabHeight = computed(() => customHeight + 'px')
</script>

<style scoped lang="scss">
.tab-bar {
  @apply z-998 w-full bg-#fefefe90 backdrop-blur-md min-h-50px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.tab-item {
  position: relative;

  svg {
    @apply w-22px h-22px;
    position: relative;
  }

  &::after {
    content: '';
    @apply absolute bottom-8px left-1/2 w-44px h-26px opacity-0 blur-md pointer-events-none;
    z-index: -1;
    transform: translateX(-50%);
    transition:
      opacity 0.3s ease-in-out,
      filter 0.3s ease-in-out;
    will-change: opacity, filter;
  }

  &.is-active::after {
    @apply opacity-100 rounded-full;
    background: rgba(19, 152, 127, 0.46);
    filter: blur(12px);
    -webkit-filter: blur(12px);
  }
}
</style>
