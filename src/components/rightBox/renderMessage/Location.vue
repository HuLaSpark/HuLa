<template>
  <main class="location-message" @dblclick.stop="handleLocationClick">
    <!-- 位置图标和标题 -->
    <n-flex align="center" justify="space-between" class="pb-8px">
      <div class="flex-y-center gap-8px">
        <svg class="size-14px color-#13987f">
          <use href="#local"></use>
        </svg>
        <p class="text-14px font-medium color-[--text-color]">位置</p>
      </div>

      <div class="text-(10px #13987f) p-4px rounded-4px border-(1px solid #13987f)">
        <p v-if="body?.precision">{{ body.precision }}</p>
      </div>
    </n-flex>

    <!-- 地址信息 -->
    <div class="text-(12px [--chat-text-color]) pb-8px leading-5 line-clamp-2">
      {{ body?.address || '位置出错' }}
    </div>

    <!-- 地图预览区域 -->
    <div class="relative rounded-6px overflow-hidden bg-gray-100 dark:bg-#202020 h-120px flex-center">
      <!-- 如果有地图API，显示地图预览 -->
      <div v-if="showMapPreview" class="size-full">
        <LocationMap
          v-if="body && apiKey"
          :location="locationData"
          :api-key="apiKey"
          :zoom="18"
          :height="120"
          :draggable="false"
          @map-error="() => (showMapPreview = false)" />
      </div>

      <!-- 否则显示静态的位置图标 -->
      <div v-else class="flex-col-center gap-8px">
        <svg class="size-32px color-[--text-color-3]">
          <use href="#cloudError"></use>
        </svg>
        <span class="text-12px color-[--text-color-3]">无法展示</span>
      </div>
    </div>
  </main>

  <!-- 位置详情弹窗 -->
  <LocationModal v-model:visible="modalVisible" />
</template>

<script setup lang="ts">
import { getSettings } from '@/services/tauriCommand'
import type { LocationBody } from '@/services/types'
import { isWindows } from '@/utils/PlatformConstants'
import LocationMap from '../location/LocationMap.vue'
import LocationModal from '../location/LocationModal.vue'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    body?: LocationBody
  }>(),
  {
    body: undefined
  }
)

// 响应式状态
const modalVisible = ref(false)
const showMapPreview = ref(true)
const apiKey = ref('')

// 计算属性
const locationData = computed(() => ({
  latitude: Number(props.body?.latitude),
  longitude: Number(props.body?.longitude),
  address: props.body?.address,
  timestamp: Number(props.body?.timestamp) || Date.now()
}))

// 获取API密钥
const loadApiKey = async () => {
  try {
    const settings = await getSettings()
    apiKey.value = settings.tencent?.map_key || ''
    if (!apiKey.value) {
      showMapPreview.value = false
    }
  } catch (error) {
    console.warn('获取地图API密钥失败:', error)
    showMapPreview.value = false
  }
}

// 点击位置消息
const handleLocationClick = () => {
  if (!isWindows()) return
  modalVisible.value = true
}

// 组件挂载时加载API密钥
onMounted(() => {
  loadApiKey()
})
</script>

<style scoped lang="scss">
.location-message {
  cursor: default;
  user-select: none;
  @apply: w-260px flex flex-col h-fit bg-[--group-notice-bg]
  border-(1px solid #e3e3e3) dark:border-(1px solid #404040)
  hover:bg-#fefefe99 dark:hover:bg-#60606040 rounded-8px p-8px box-border
  custom-shadow transition-colors duration-200;
}
</style>
