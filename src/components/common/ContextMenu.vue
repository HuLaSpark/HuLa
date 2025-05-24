<template>
  <div ref="ContextMenuRef">
    <slot></slot>
    <Teleport to="body">
      <transition-group @beforeEnter="handleBeforeEnter" @enter="handleEnter" @afterEnter="handleAfterEnter">
        <!-- emoji表情菜单 -->
        <div
          v-if="showMenu && emoji && emoji.length > 0"
          class="context-menu select-none"
          style="height: fit-content"
          :style="emojiMenuPosition">
          <div class="emoji-container">
            <div v-for="(item, index) in displayedEmojis" :key="index" class="p-4px">
              <n-popover :delay="500" :duration="0" trigger="hover" :show-arrow="false" placement="top">
                <template #trigger>
                  <div class="emoji-item" @click="handleReplyEmoji(item)">
                    <img :title="item.title" class="size-18px" :src="item.url" :alt="item.title" />
                  </div>
                </template>
                <span>{{ item.title }}</span>
              </n-popover>
            </div>
            <div v-if="!showAllEmojis && emoji.length > 4" class="p-4px">
              <div class="emoji-more-btn" @click="showAllEmojis = true">更多</div>
            </div>
          </div>
        </div>
        <!-- 普通右键菜单 -->
        <div
          v-if="showMenu && !(emoji && emoji.length > 0 && showAllEmojis)"
          class="context-menu select-none"
          :style="{
            left: `${pos.posX}px`,
            top: `${pos.posY}px`
          }">
          <div v-resize="handleSize" v-if="visibleMenu && visibleMenu.length > 0" class="menu-list">
            <div v-for="(item, index) in visibleMenu" :key="index">
              <!-- 禁止的菜单选项需要禁止点击事件  -->
              <div class="menu-item-disabled" v-if="item.disabled" @click.prevent="$event.preventDefault()">
                <div class="menu-item-content">
                  <svg><use :href="`#${getMenuItemProp(item, 'icon')}`"></use></svg>
                  {{ getMenuItemProp(item, 'label') }}
                </div>
              </div>
              <div
                class="menu-item"
                v-else
                @click="handleClick(item)"
                @mouseenter="handleMouseEnter(item, index)"
                @mouseleave="handleMouseLeave">
                <div class="menu-item-content">
                  <svg><use :href="`#${getMenuItemProp(item, 'icon')}`"></use></svg>
                  {{ getMenuItemProp(item, 'label') }}
                  <svg v-if="shouldShowArrow(item)" class="arrow-icon">
                    <use href="#right"></use>
                  </svg>
                </div>
              </div>
            </div>
            <!-- 判断是否有特别的菜单项才需要分割线 -->
            <div v-if="visibleSpecialMenu.length > 0" class="flex-col-y-center gap-6px">
              <!-- 分割线 -->
              <div class="h-1px bg-[--line-color] m-[2px_8px]"></div>
              <div @click="handleClick(item)" class="menu-item" v-for="item in visibleSpecialMenu" :key="item.label">
                <svg><use :href="`#${getMenuItemProp(item, 'icon')}`"></use></svg>
                {{ getMenuItemProp(item, 'label') }}
              </div>
            </div>
          </div>
        </div>
        <!-- 二级菜单 -->
        <div v-if="showSubmenu && activeSubmenu" class="context-submenu" :style="submenuPosition">
          <div class="menu-list">
            <div v-for="(subItem, subIndex) in activeSubmenu" :key="subIndex" class="menu-item">
              <div class="menu-item-content" @click="handleSubItemClick(subItem)">
                <svg class="check-icon">
                  <use :href="`#${getMenuItemProp(subItem, 'icon')}`"></use>
                </svg>
                {{ getMenuItemProp(subItem, 'label') }}
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

type Props = {
  content?: Record<string, any>
  menu?: any[]
  emoji?: any[]
  specialMenu?: any[]
}

const props = withDefaults(defineProps<Props>(), {
  content: () => ({}),
  menu: () => [],
  emoji: () => [],
  specialMenu: () => []
})

// 控制是否显示全部表情
const showAllEmojis = ref(false)

// 计算要显示的表情列表
const displayedEmojis = computed(() => {
  return showAllEmojis.value ? props.emoji : props.emoji.slice(0, 4)
})

// 使用计算属性过滤显示的菜单项
const visibleMenu = computed(() => {
  // 检查是否有 visible 属性并作为函数调用
  return props.menu?.filter((item: any) => {
    if (typeof item.visible === 'function') {
      return item.visible(props.content) // 如果 visible 是函数，则调用它
    }
    // 如果没有 visible 属性，则默认显示
    return true
  })
})

// 添加 specialMenu 的过滤功能
const visibleSpecialMenu = computed(() => {
  return props.specialMenu?.filter((item: any) => {
    if (typeof item.visible === 'function') {
      return item.visible(props.content)
    }
    return true
  })
})

/** 判断是否传入了menu */
const isNull = computed(() => props.menu === void 0)
const ContextMenuRef = useTemplateRef('ContextMenuRef')
const emit = defineEmits(['select', 'reply-emoji'])
/** 获取鼠标位置和是否显示右键菜单 */
const { x, y, showMenu } = useContextMenu(ContextMenuRef, isNull)
/** 获取视口的宽高 */
const { vw, vh } = useViewport()
/** 定义右键菜单尺寸 */
const w = ref(0)
const h = ref(0)
// 二级菜单状态
const showSubmenu = ref(false)
const activeSubmenu = ref<any[]>([])
const submenuPosition = ref({
  left: '0px',
  top: '0px'
})
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

/** 表情菜单的尺寸和位置 */
const emojiWidth = ref(180) // 表情菜单的大约宽度，根据.emoji-container的max-w-180px设置

// 根据是否展示全部表情动态计算菜单高度
const emojiHeight = computed(() => {
  return showAllEmojis.value ? 114 : 40 // 没有展示更多时为56，展开更多时为126
})

/** 计算表情菜单的位置 */
const emojiMenuPosition = computed(() => {
  // 使用普通右键菜单计算后的位置作为基础
  let posX = pos.value.posX
  let posY = pos.value.posY - emojiHeight.value // 默认在右键菜单位置上方显示

  // 判断消息是在左边还是右边（通过原始鼠标位置与屏幕中心的关系）
  const isRightSideMessage = x.value > vw.value / 2

  if (isRightSideMessage) {
    // emoji菜单的左边位置 = 右键菜单右边界 - emoji菜单宽度
    posX = pos.value.posX + w.value - emojiWidth.value

    // 确保不会超出左边界
    if (posX < 10) {
      posX = 10
    }
  } else {
    posX = pos.value.posX

    // 检查是否会超出右边界
    if (posX + emojiWidth.value > vw.value) {
      posX = vw.value - emojiWidth.value - 10
    }
  }

  // 检查垂直方向是否超出视口
  if (posY < 10) {
    // 如果上方空间不足，则在右键菜单位置下方显示
    posY = pos.value.posY + 10
  }

  return {
    left: `${posX}px`,
    top: `${posY}px`
  }
})

// 添加 watch 监听主菜单显示状态
watch(
  () => showMenu.value,
  (newVal) => {
    if (!newVal) {
      // 主菜单隐藏时,同时隐藏二级菜单
      showSubmenu.value = false
      activeSubmenu.value = []
      // 重置表情显示状态
      showAllEmojis.value = false
    }
  }
)

const handleSize = ({ width, height }: any) => {
  w.value = width
  h.value = height
}

/** 处理右键主菜单点击事件 */
const handleClick = (item: string) => {
  nextTick(() => {
    showMenu.value = false
    emit('select', item)
  })
}

/** 处理回复表情事件 */
const handleReplyEmoji = (item: string) => {
  if (!item) return
  nextTick(() => {
    showMenu.value = false
    emit('reply-emoji', item)
  })
}

// 处理子菜单项点击
const handleSubItemClick = (item: any) => {
  if (typeof item.click === 'function') {
    item.click(props.content)
  }
  showSubmenu.value = false
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
      el.style.transition = '0.2s'
    })
  })
}

const handleAfterEnter = (el: any) => {
  el.style.transition = 'none'
}

/**
 * 获取菜单项的属性值（处理函数式和静态值）
 * @param item 菜单项
 * @param prop 属性名 ('icon' | 'label')
 */
const getMenuItemProp = (item: any, prop: 'icon' | 'label') => {
  return typeof item[prop] === 'function' ? item[prop](props.content) : item[prop]
}

// 修改 handleMouseEnter 函数
const handleMouseEnter = (item: any, index: number) => {
  // 检查是否有子菜单（包括函数形式的 children）
  const hasChildren = typeof item.children === 'function' ? true : Array.isArray(item.children)
  if (!hasChildren) {
    showSubmenu.value = false
    return
  }

  // 获取子菜单内容
  const children = typeof item.children === 'function' ? item.children(props.content) : item.children
  if (!children || children.length === 0) {
    showSubmenu.value = false
    return
  }

  // 获取当前菜单项的位置
  const menuItem = document.querySelectorAll('.menu-item')[index]
  const rect = menuItem.getBoundingClientRect()

  // 计算子菜单的预期宽度和高度
  const submenuWidth = 120 // 子菜单的最小宽度
  const submenuHeight = children.length * 30 // 预估每项高度

  let left = rect.right + 5
  let top = rect.top

  // 判断右侧空间是否足够
  if (rect.right + submenuWidth > vw.value) {
    // 右侧空间不足，改为显示在下方
    left = rect.left
    top = rect.bottom + 5 // 添加一点间距

    // 检查下方空间是否足够，不够则向上显示
    if (top + submenuHeight > vh.value) {
      top = rect.top - submenuHeight - 5
    }
  } else {
    // 右侧空间足够，但需要检查垂直方向
    if (rect.top + submenuHeight > vh.value) {
      // 如果超出视口底部，向上偏移
      top = vh.value - submenuHeight - 10
    }
  }

  submenuPosition.value = {
    left: `${left}px`,
    top: `${top}px`
  }

  activeSubmenu.value = children
  showSubmenu.value = true
}

// 修改鼠标离开处理函数
const handleMouseLeave = (e: MouseEvent) => {
  // 增加一个状态来跟踪鼠标移动
  const relatedTarget = e.relatedTarget as HTMLElement

  // 如果鼠标是移动到子菜单或者子菜单的子元素上，则不关闭菜单
  if (relatedTarget?.closest('.context-submenu')) {
    return
  }

  // 如果既不在主菜单也不在子菜单内，则关闭子菜单
  setTimeout(() => {
    if (!isMouseInSubmenu(e) && !isMouseInMainMenu(e)) {
      showSubmenu.value = false
    }
  }, 100)
}

// 修改检查鼠标是否在子菜单内的函数
const isMouseInSubmenu = (e: MouseEvent) => {
  const submenu = document.querySelector('.context-submenu')
  if (!submenu) return false

  // 使用 document.elementFromPoint 来检查鼠标下的元素
  const elementsUnderMouse = document.elementsFromPoint(e?.clientX || 0, e?.clientY || 0)

  return elementsUnderMouse.some((el) => el.closest('.context-submenu'))
}

// 修改检查鼠标是否在主菜单内的函数
const isMouseInMainMenu = (e: MouseEvent) => {
  const mainMenu = document.querySelector('.context-menu')
  if (!mainMenu) return false

  const elementsUnderMouse = document.elementsFromPoint(e.clientX, e.clientY)
  return elementsUnderMouse.some((el) => el.closest('.context-menu'))
}

// 添加判断是否显示箭头的函数
const shouldShowArrow = (item: any) => {
  // 如果 children 是函数，先获取结果
  const children = typeof item.children === 'function' ? item.children(props.content) : item.children

  // 检查是否有有效的子菜单内容
  return Array.isArray(children) && children.length > 0
}
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/variable.scss' as *;

// 通用的menu-item样式
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
  .menu-item-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

// menu-list通用样式
@mixin menu-list {
  -webkit-backdrop-filter: blur(10px);
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .menu-item {
    @include menu-item();
    display: flex;
    align-items: center;
    &:hover {
      background-color: var(--bg-menu-hover);
      svg {
        animation: twinkle 0.3s ease-in-out;
      }
    }
  }
}

.context-menu {
  @include menu-item-style();
  .emoji-container {
    -webkit-backdrop-filter: blur(10px);
    background: var(--bg-menu);
    /* 允许放置表情符号，每个28px宽，加上间隔 */
    @apply flex flex-wrap max-w-180px px-6px select-none;
  }

  .emoji-item {
    @apply flex-center size-28px rounded-4px text-16px cursor-pointer hover:bg-[--emoji-hover];
  }

  .emoji-more-btn {
    @apply flex-center size-28px rounded-4px text-12px cursor-pointer bg-[--bg-menu-hover] hover:bg-[--emoji-hover];
  }
  .menu-list {
    @include menu-list();
    .menu-item-disabled {
      @include menu-item();
      color: var(--disabled-color);
      svg {
        color: var(--disabled-color);
      }
    }
  }
}

.context-submenu {
  position: fixed;
  z-index: 1000;
  @include menu-item-style();

  .menu-list {
    @include menu-list();
    min-width: 120px;
  }
}

.menu-item {
  .menu-item-content {
    gap: 10px;
    width: 100%;
    position: relative;

    .arrow-icon {
      position: absolute;
      right: 0;
      width: 12px;
      height: 12px;
      color: var(--text-color);
    }

    .check-icon {
      width: 14px;
      height: 14px;
    }
  }
}
</style>
