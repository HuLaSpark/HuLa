<template>
  <div class="side-navigation flex flex-col bg-[--center-bg-color] border-r border-solid border-[--line-color]">
    <!-- 导航标题 -->
    <div class="navigation-header p-20px pb-16px">
      <h2 class="text-16px font-600 text-[--text-color] m-0">文件分类</h2>
    </div>

    <!-- 导航菜单 -->
    <div class="navigation-menu flex-1 p-16px flex flex-col gap-6px">
      <div
        v-for="item in navigationItems"
        :key="item.key"
        :class="['navigation-item', { 'navigation-item--active': item.active }]"
        @click="handleNavigationClick(item.key)">
        <div class="navigation-item__icon">
          <svg class="size-16px">
            <use :href="`#${item.icon}`"></use>
          </svg>
        </div>
        <span class="text-14px">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface NavigationItem {
  key: string
  label: string
  icon: string
  active: boolean
}

interface FileManagerState {
  navigationItems: Ref<NavigationItem[]>
  setActiveNavigation: (key: string) => void
}

const fileManagerState = inject<FileManagerState>('fileManagerState')!

const { navigationItems, setActiveNavigation } = fileManagerState

const handleNavigationClick = (key: string) => {
  setActiveNavigation(key)
}
</script>

<style scoped lang="scss">
.side-navigation {
  width: 200px;
  min-width: 200px;
  flex-shrink: 0;
}

.navigation-header {
  border-bottom: 1px solid var(--line-color);
}

.navigation-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-color);
  user-select: none;

  &:hover:not(&--active) {
    background-color: rgba(19, 152, 127, 0.1);
    color: #13987f;

    .navigation-item__icon svg {
      color: #13987f;
    }
  }

  &--active {
    background-color: rgba(19, 152, 127, 0.2);
    color: #13987f;

    .navigation-item__icon svg {
      color: #13987f;
    }
  }
}

.navigation-item__icon {
  margin-right: 12px;
  display: flex;
  align-items: center;

  svg {
    color: inherit;
    transition: color 0.2s ease;
  }
}

// 响应式适配
@media (max-width: 800px) {
  .side-navigation {
    display: none;
  }
}
</style>
