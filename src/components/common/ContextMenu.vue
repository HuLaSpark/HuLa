<template>
  <div ref="containerRef">
    <slot></slot>
    <Teleport to="body">
      <transition-group @beforeEnter="handleBeforeEnter" @enter="handleEnter" @afterEnter="handleAfterEnter">
        <!-- 群聊emoji表情菜单 -->
        <div
          v-if="showMenu && emoji && emoji.length > 0"
          class="context-menu"
          style="display: flex; height: fit-content"
          :style="{
            left: `${pos.posX}px`,
            top: `${pos.posY - 42}px`
          }">
          <n-flex
            v-for="(item, index) in emoji as any[]"
            :key="index"
            align="center"
            justify="space-between"
            class="emoji-list">
            <n-popover trigger="hover" :show-arrow="false" placement="top">
              <template #trigger>
                <n-flex :size="0" align="center" justify="center" class="emoji-item" @click="handleReplyEmoji(item)">
                  {{ item.label }}
                </n-flex>
              </template>
              <span>{{ item.title }}</span>
            </n-popover>
          </n-flex>
        </div>
        <!-- 普通右键菜单 -->
        <div
          v-if="showMenu"
          class="context-menu"
          :style="{
            left: `${pos.posX}px`,
            top: `${pos.posY}px`
          }">
          <div v-resize="handleSize" v-if="menu && menu.length > 0" class="menu-list">
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
      </transition-group>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useContextMenu } from '@/hooks/useContextMenu.ts'
import { useViewport } from '@/hooks/useViewport.ts'

const { menu, emoji, specialMenu } = defineProps({
  menu: {
    type: Array
  },
  emoji: {
    type: Array
  },
  specialMenu: {
    type: Array,
    default: () => []
  }
})
/** 判断是否传入了menu */
const isNull = computed(() => menu === void 0)
const containerRef = ref(null)
const emit = defineEmits(['select', 'reply-emoji'])
/** 获取鼠标位置和是否显示右键菜单 */
const { x, y, showMenu } = useContextMenu(containerRef, isNull)
/** 获取视口的宽高 */
const { vw, vh } = useViewport()
/** 定义右键菜单尺寸 */
const w = ref(0)
const h = ref(0)
/** 计算右键菜单的位置 */
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

/** 处理右键菜单点击事件 */
const handleClick = (item: string) => {
  nextTick(() => {
    showMenu.value = false
    emit('select', item)
  })
}

/** 处理回复表情事件 */
const handleReplyEmoji = (item: string) => {
  nextTick(() => {
    showMenu.value = false
    emit('reply-emoji', item)
  })
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
  .emoji-list {
    @apply size-fit p-4px select-none;
    .emoji-item {
      @apply size-28px rounded-4px text-16px cursor-pointer hover:bg-[--emoji-hover];
    }
  }
  .menu-list {
    -webkit-backdrop-filter: blur(10px);
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
