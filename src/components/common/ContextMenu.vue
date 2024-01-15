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
              {{ item.label }}
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

<style scoped>
.context-menu {
  position: fixed;
  background: #eee;
  box-shadow:
    1px 1px 2px rgba(0, 0, 0, 0.2),
    1px 1px 5px rgba(0, 0, 0, 0.2);
  min-width: 100px;
  border-radius: 5px;
  font-size: 12px;
  color: #1d1d1f;
  line-height: 1.8;
  white-space: nowrap;
  overflow: hidden;
}
.menu-list {
  padding: 5px;
}
.menu-item {
  padding: 0 5px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
}
.menu-item:hover {
  background: #3477d9;
  color: #fff;
}
</style>
