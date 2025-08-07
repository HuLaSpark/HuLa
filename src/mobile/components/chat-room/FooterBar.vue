<template>
  <div ref="root">
    <div class="w-full min-h-92px bg-#FAFAFA flex flex-col z-2 footer-bar-shadow">
      <div class="flex flex-1">
        <div class="pt-10px ms-25px max-h-40px w-full flex items-center">
          <n-input ref="footerBarInput" @focus="handleFocus" @blur="handleBlur" placeholder="输入/唤醒AI助手" />

          <n-button type="primary" size="small" class="ms-10px me-25px flex items-center">
            发送
            <svg class="h-15px w-15px iconpark-icon color-#white"><use href="#send"></use></svg>
          </n-button>
        </div>
      </div>

      <div class="flex justify-between px-25px flex-1 items-center py-10px">
        <div v-for="item in options" class="flex flex-wrap items-center" @click="clickItem(item.icon)">
          <svg class="h-24px w-24px iconpark-icon"><use :href="`#${item.icon}`"></use></svg>
          <svg
            v-if="item.showArrow"
            :class="['h-15px w-15px iconpark-icon transition-transform duration-300', item.isRotate ? 'rotate' : '']">
            <use href="#down" />
          </svg>
        </div>
      </div>

      <!-- 展开面板 -->
      <Transition @before-enter="beforeEnter" @enter="enter" @leave="leave">
        <div v-show="isPanelVisible" class="w-full overflow-hidden bg-green flex flex-col">
          <div style="height: 180px"><!-- 模拟内容高度 --></div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMobileStore } from '@/stores/mobile'

const emit = defineEmits(['focus', 'blur'])

const root = ref()

const options = ref([
  { icon: 'smiling-face', showArrow: false, isRotate: false },
  { icon: 'screenshot', showArrow: true, isRotate: false },
  { icon: 'file2', showArrow: true, isRotate: false },
  { icon: 'photo', showArrow: false, isRotate: false },
  { icon: 'voice', showArrow: false, isRotate: false },
  { icon: 'history', showArrow: true, isRotate: false }
])

const isPanelVisible = ref(false)
const isInputFocused = ref(false)

const clickItem = async (icon: string) => {
  const clickedItem = options.value.find((item) => item.icon === icon)

  if (!clickedItem || !clickedItem.showArrow) return

  if (isInputFocused.value) {
    // 输入框聚焦时点击图标 → 失焦 → 展开绿色块
    footerBarInput.value?.blur()
    await nextTick()
    isPanelVisible.value = true
    clickedItem.isRotate = true
  } else {
    // 输入框未聚焦时 → 切换绿色块显示状态
    for (let item of options.value) {
      if (item.icon === icon) {
        item.isRotate = !item.isRotate
        isPanelVisible.value = item.isRotate
      } else {
        item.isRotate = false
      }
    }
  }
}

const beforeEnter = (el: Element) => {
  const dom = el as HTMLElement
  dom.style.height = '0px'
  dom.style.opacity = '0'
}

const duration = 0.15

const enter = (el: Element, done: () => void) => {
  const dom = el as HTMLElement
  requestAnimationFrame(() => {
    dom.style.transition = `height ${duration}s ease, opacity ${duration}s ease`
    dom.style.height = '180px'
    dom.style.opacity = '1'
    dom.addEventListener('transitionend', done, { once: true })
  })
}

const leave = (el: Element, done: () => void) => {
  const dom = el as HTMLElement
  dom.style.transition = `height ${duration}s ease, opacity ${duration}s ease`
  dom.style.height = '0px'
  dom.style.opacity = '0'
  dom.addEventListener('transitionend', done, { once: true })
}

const mobileStore = useMobileStore()

const handleFocus = async () => {
  isInputFocused.value = true
  await nextTick()
  const keyboard = mobileStore.keyboardDetail
  requestAnimationFrame(() => {
    emit('focus', { keyboard })
  })

  // 如果绿色块已展开，收起它
  if (isPanelVisible.value) {
    isPanelVisible.value = false
    options.value.forEach((item) => (item.isRotate = false))
  }
}

const handleBlur = async () => {
  isInputFocused.value = false
  await nextTick()
  const keyboard = mobileStore.keyboardDetail
  requestAnimationFrame(() => {
    console.log('键盘失焦了')
    emit('blur', { keyboard })
  })
}

const footerBarInput = ref()

defineExpose({ root, footerBarInput })
</script>

<style lang="scss" scoped>
.footer-bar-shadow {
  box-shadow: 0 -3px 6px -4px rgba(0, 0, 0, 0.1);
}

.rotate {
  transform: rotate(180deg);
}

.transition-transform {
  transition: transform 0.15s ease;
}
</style>
