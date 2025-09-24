<template>
  <n-modal v-model:show="modalVisible" :mask-closable="false" class="rounded-8px" transform-origin="center">
    <div class="h-full w-480px bg-[--bg-edit] box-border flex flex-col items-center justify-between">
      <!-- 标题栏 -->
      <n-flex :size="6" vertical class="w-full">
        <div
          v-if="isMac()"
          @click="modalVisible = false"
          class="mac-close size-13px shadow-inner bg-#ed6a5eff rounded-50% mt-6px select-none absolute left-6px">
          <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
            <use href="#close"></use>
          </svg>
        </div>

        <n-flex class="text-(14px [--text-color]) select-none pt-6px" justify="center">{{ modalTitle }}</n-flex>

        <svg
          v-if="isWindows()"
          class="size-14px cursor-pointer pt-6px select-none absolute right-6px"
          @click="modalVisible = false">
          <use href="#close"></use>
        </svg>
        <span class="h-1px w-full bg-[--line-color]"></span>
      </n-flex>

      <!-- 地图加载错误 -->
      <div v-if="mapError" class="h-340px flex-center">
        <n-result status="error" title="地图加载失败" :description="mapError">
          <template #footer>
            <n-flex justify="center" :size="12">
              <n-button secondary @click="modalVisible = false">取消</n-button>
              <n-button type="primary" secondary @click="retryMapLoad">重试</n-button>
            </n-flex>
          </template>
        </n-result>
      </div>

      <!-- 位置获取失败 -->
      <div v-else-if="locationState.error && !selectedLocation" class="h-340px flex-center">
        <n-result status="warning" title="位置获取失败" :description="locationState.error">
          <template #footer>
            <n-flex justify="center" :size="12">
              <n-button secondary @click="modalVisible = false">取消</n-button>
              <n-button type="primary" secondary @click="relocate">重试</n-button>
            </n-flex>
          </template>
        </n-result>
      </div>

      <!-- 地图容器 -->
      <div v-else class="flex flex-col gap-16px p-8px">
        <!-- 地图区域 -->
        <div class="relative rounded-8px overflow-hidden flex-center h-340px">
          <!-- 地图加载中 -->
          <div v-if="locationState.loading || mapLoading" class="flex-col-center gap-42px">
            <n-spin :size="42" />
            <p class="text-(14px [--text-cplor])">{{ locationState.loading ? '正在获取位置...' : '地图加载中...' }}</p>
          </div>

          <!-- 地图组件 -->
          <LocationMap
            v-else-if="selectedLocation"
            :location="selectedLocation"
            :zoom="18"
            :height="340"
            @location-change="handleLocationChange"
            @map-ready="() => (mapLoading = false)"
            @map-error="handleMapError" />
        </div>

        <!-- 位置信息显示 -->
        <div v-if="selectedLocation" class="rounded-6px bg-#fefefe dark:bg-#303030 p-12px">
          <n-flex vertical :size="8">
            <span class="text-14px font-medium">当前位置</span>
            <div class="text-12px text-gray-500">
              {{ selectedLocation.address || '获取地址中...' }}
            </div>
            <div class="text-11px text-gray-400">
              坐标: {{ selectedLocation.latitude.toFixed(6) }}, {{ selectedLocation.longitude.toFixed(6) }}
            </div>
          </n-flex>
        </div>
      </div>

      <!-- 操作按钮 -->
      <n-flex v-if="showActionButtons" align="center" :size="24" class="py-8px">
        <n-button type="primary" secondary :loading="sendingLocation" @click="handleConfirm">发送位置</n-button>
      </n-flex>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { useGeolocation } from '@/hooks/useGeolocation'
import { reverseGeocode } from '@/services/mapApi'
import { isMac, isWindows } from '@/utils/PlatformConstants'
import LocationMap from './LocationMap.vue'

type LocationData = {
  latitude: number
  longitude: number
  address?: string
  timestamp: number
}

type LocationModalProps = {
  visible: boolean
}

type LocationModalEmits = {
  'update:visible': [visible: boolean]
  'location-selected': [location: LocationData]
  cancel: []
}

const props = withDefaults(defineProps<LocationModalProps>(), {
  visible: false
})

const emit = defineEmits<LocationModalEmits>()

// 地理位置Hook
const { state: locationState, getLocationWithTransform } = useGeolocation()

// 响应式状态
const modalVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const selectedLocation = ref<LocationData | null>(null)
const mapLoading = ref(false)
const mapError = ref<string | null>(null)
const sendingLocation = ref(false)

// 计算属性
const modalTitle = computed(() => {
  if (mapError.value) return '地图错误'
  if (locationState.error) return '位置获取失败'
  return '选择位置'
})

const showActionButtons = computed(() => {
  return !mapLoading.value && !locationState.loading && selectedLocation.value !== null && !mapError.value
})

// 获取位置
const getLocation = async () => {
  try {
    mapError.value = null

    const result = await getLocationWithTransform({
      enableHighAccuracy: true
    })

    // 获取地址信息
    const geocodeResult = await reverseGeocode(result.transformed.lat, result.transformed.lng).catch((error) => {
      console.warn('获取地址失败:', error)
      return null
    })
    const address = geocodeResult?.formatted_addresses?.recommend || geocodeResult?.address || '未知地址'

    selectedLocation.value = {
      latitude: result.transformed.lat,
      longitude: result.transformed.lng,
      address,
      timestamp: result.timestamp
    }
  } catch (error) {
    console.error('获取位置失败:', error)
  }
}

// 监听弹窗显示
watch(modalVisible, (visible) => {
  if (visible) {
    // 重置状态
    selectedLocation.value = null
    mapError.value = null
    mapLoading.value = false

    // 获取位置
    getLocation()
  }
})

// 重新定位
const relocate = async () => {
  selectedLocation.value = null
  mapError.value = null
  await getLocation()
}

// 重试地图加载
const retryMapLoad = () => {
  mapError.value = null
  mapLoading.value = true
  // 触发地图重新加载
  if (selectedLocation.value) {
    // 重新创建地图组件
    const currentLocation = selectedLocation.value
    selectedLocation.value = null
    nextTick(() => {
      selectedLocation.value = currentLocation
      mapLoading.value = false
    })
  }
}

// 地图事件处理
const handleLocationChange = async (newLocation: { lat: number; lng: number }) => {
  if (!selectedLocation.value) return

  // 获取新位置的地址
  const geocodeResult = await reverseGeocode(newLocation.lat, newLocation.lng).catch((error) => {
    console.warn('获取地址失败:', error)
    return null
  })
  const address =
    geocodeResult?.formatted_addresses?.recommend || geocodeResult?.address || selectedLocation.value.address

  selectedLocation.value = {
    ...selectedLocation.value,
    latitude: newLocation.lat,
    longitude: newLocation.lng,
    address,
    timestamp: Date.now()
  }
}

const handleMapError = (error: string) => {
  mapError.value = error
  mapLoading.value = false
}

// 确认发送位置
const handleConfirm = async () => {
  if (!selectedLocation.value) return

  sendingLocation.value = true
  emit('location-selected', selectedLocation.value)
  modalVisible.value = false
  sendingLocation.value = false
}
</script>

<style scoped lang="scss"></style>
