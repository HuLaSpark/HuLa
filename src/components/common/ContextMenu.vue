<template>
  <div ref="containerRef">
    <slot></slot>
    <Teleport to="body">
      <Transition @beforeEnter="handleBeforeEnter" @enter="handleEnter" @afterEnter="handleAfterEnter">
        <div
          v-if="showMenu"
          class="context-menu"
          :style="{
            left: `${pos.posX}px`,
            top: `${pos.posY}px`
          }">
          <div v-resize="handleSize" v-if="menu.length > 0" class="menu-list">
            <div v-for="(item, index) in menu as any[]" :key="index">
              <!-- 禁止的菜单选项需要禁止点击事件  -->
              <div class="menu-item-disabled" v-if="item.disabled" @click.prevent="$event.preventDefault()">
                <svg><use :href="`#${item.icon}`"></use></svg>
                {{ item.label }}
              </div>
              <div class="menu-item" v-else @click="handleClick(item)">
                <svg><use :href="`#${item.icon}`"></use></svg>
                {{ item.label }}
              </div>
            </div>
            <!-- 判断是否有特别的菜单项才需要分割线 -->
            <div v-if="specialMenu.length > 0" class="flex-col-y-center gap-6px">
              <!-- 分割线 -->
              <div class="h-1px bg-[--line-color] m-[2px_8px]"></div>
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
import { useViewport } from '@/hooks/useViewport.ts'

const { menu, specialMenu } = defineProps({
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
/* 获取鼠标位置和是否显示右键菜单 */
const { x, y, showMenu } = useContextMenu(containerRef)
/* 获取视口的宽高 */
const { vw, vh } = useViewport()
/* 定义右键菜单尺寸 */
const w = ref(0)
const h = ref(0)
/* 计算右键菜单的位置 */
const pos = computed(() => {
  let posX = x.value
  let posY = y.value
  // x坐标
  if (x.value > vw.value - w.value) {
    posX -= w.value
  }
  // y坐标
  if (y.value > vh.value - h.value) {
    posY -= y.value - vh.value + h.value
  }
  return {
    posX,
    posY
  }
})

const handleSize = ({ width, height }: any) => {
  w.value = width
  h.value = height
}

/* 处理右键菜单点击事件 */
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
@mixin menu-item {
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
}
.context-menu {
  @include menu-item-style();
  .menu-list {
    padding: 5px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    .menu-item {
      @include menu-item();
      &:hover {
        background-color: var(--bg-menu-hover);
        svg {
          animation: twinkle 0.3s ease-in-out;
        }
      }
    }
    .menu-item-disabled {
      @include menu-item();
      color: var(--disabled-color);
      svg {
        color: var(--disabled-color);
      }
    }
  }
}
</style>
