<template>
  <div ref="containerRef">
    <slot></slot>
    <Teleport to="body">
      <Transition @beforeEnter="handleBeforeEnter" @enter="handleEnter" @afterEnter="handleAfterEnter">
        <div
          v-if="showMenu"
          class="context-menu"
          :style="{
            left: `${x}px`,
            top: `${y}px`
          }">
          <div class="menu-list">
            <div @click="handleClick(item)" class="menu-item" v-for="item in menu as any[]" :key="item.label">
              <svg><use :href="`#${item.icon}`"></use></svg>
              {{ item.label }}
            </div>
            <!-- 判断是否有特别的菜单项才需要分割线 -->
            <div v-if="specialMenu.length > 0" class="flex-col-y-center gap-6px">
              <div class="h-1px bg-#f1f1f1 m-[2px_8px]"></div>
              <div @click="handleClick(item)" class="menu-item" v-for="item in specialMenu as any[]" :key="item.label">
                <svg><use :href="`#${item.icon}`"></use></svg>
                {{ item.label }}
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useContextMenu } from '@/hooks/useContextMenu.ts'

const { menu } = defineProps({
  menu: {
    type: Array,
    default: () => []
  },
  specialMenu: {
    type: Array,
    default: () => []
  }
})
const containerRef = ref(null)
const emit = defineEmits(['select'])
const { x, y, showMenu } = useContextMenu(containerRef)

const handleClick = (item: string) => {
  showMenu.value = false
  emit('select', item)
}

const handleBeforeEnter = (el: any) => {
  el.style.height = 0
}

const handleEnter = (el: any) => {
  el.style.height = 'auto'
  const h = el.clientHeight
  el.style.height = 0
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.height = `${h}px`
      el.style.transition = '0.5s'
    })
  })
}

const handleAfterEnter = (el: any) => {
  el.style.transition = 'none'
}
</script>

<style scoped lang="scss">
.context-menu {
  position: fixed;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.65) 80%, rgba(255, 255, 255, 0.95) 100%);
  border-radius: 6px;
  backdrop-filter: blur(10px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 2px 2px rgb(0 0 0 / 3%),
    0 4px 4px rgb(0 0 0 / 4%),
    0 10px 8px rgb(0 0 0 / 5%),
    0 15px 15px rgb(0 0 0 / 6%),
    0 30px 30px rgb(0 0 0 / 7%),
    0 70px 65px rgb(0 0 0 / 9%);
  z-index: 999;
  min-width: 100px;
  font-size: 14px;
  line-height: 1.8;
  white-space: nowrap;
  overflow: hidden;
  .menu-list {
    padding: 5px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    .menu-item {
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 10px;
      svg {
        width: 16px;
        height: 16px;
      }
      &:hover {
        background-color: rgba(10, 20, 28, 0.1);
      }
    }
  }
}
</style>
