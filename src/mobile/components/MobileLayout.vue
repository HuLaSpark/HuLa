<template>
  <n-config-provider
    :theme="lightTheme"
    class="h-full flex flex-col box-border"
    :class="{
      'bg-cover bg-center bg-no-repeat': props.backgroundImage
    }"
    :style="backgroundImageStyle">
    <!-- 顶部安全区域 -->
    <div :class="[{ 'safe-area-top': safeAreaTop }, props.topSafeAreaClass]" />

    <!-- 内容区域 -->
    <div class="flex-1 min-h-0">
      <slot></slot>
    </div>

    <!-- 底部安全区域 -->
    <div :class="[{ 'safe-area-bottom': safeAreaBottom }, props.bottomSafeAreaClass]" />
  </n-config-provider>
</template>

<script setup lang="ts">
import { lightTheme } from 'naive-ui'
interface MobileLayoutProps {
  /** 是否应用顶部安全区域 */
  safeAreaTop?: boolean
  /** 是否应用底部安全区域 */
  safeAreaBottom?: boolean
  /** 背景图片URL */
  backgroundImage?: string
  /** 顶部安全区域的自定义 CSS class */
  topSafeAreaClass?: string
  /** 底部安全区域的自定义 CSS class */
  bottomSafeAreaClass?: string
}

const props = withDefaults(defineProps<MobileLayoutProps>(), {
  safeAreaTop: true,
  safeAreaBottom: true,
  backgroundImage: '',
  topSafeAreaClass: '',
  bottomSafeAreaClass: ''
})

// 计算背景图样式
const backgroundImageStyle = computed(() => {
  const styles: Record<string, string> = {}

  // 设置背景图片
  if (props.backgroundImage) {
    // 处理路径别名 @/ 转换为 /src/
    let imagePath = props.backgroundImage
    if (imagePath.startsWith('@/')) {
      imagePath = imagePath.replace('@/', '/src/')
    }
    styles.backgroundImage = `url(${imagePath})`
  }
  return styles
})
</script>

<style scoped lang="scss">
.safe-area-top {
  padding-top: var(--safe-area-inset-top);
}
.safe-area-bottom {
  padding-bottom: var(--safe-area-inset-bottom);
}
</style>
