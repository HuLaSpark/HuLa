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
        <n-result status="error" :title="t('message.location.modal.result.map_error_title')" :description="mapError">
          <template #footer>
            <n-flex justify="center" :size="12">
              <n-button secondary @click="modalVisible = false">
                {{ t('message.location.modal.buttons.cancel') }}
              </n-button>
              <n-button type="primary" secondary @click="retryMapLoad">
                {{ t('message.location.modal.buttons.retry') }}
              </n-button>
            </n-flex>
          </template>
        </n-result>
      </div>

      <!-- 位置获取失败 -->
      <div v-else-if="locationState.error && !selectedLocation" class="h-340px flex-center">
        <n-result
          status="warning"
          :title="t('message.location.modal.result.location_error_title')"
          :description="locationState.error">
          <template #footer>
            <n-flex justify="center" :size="12">
              <n-button secondary @click="modalVisible = false">
                {{ t('message.location.modal.buttons.cancel') }}
              </n-button>
              <n-button type="primary" secondary @click="relocate">
                {{ t('message.location.modal.buttons.retry') }}
              </n-button>
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
            <p class="text-(14px [--text-cplor])">
              {{
                locationState.loading
                  ? t('message.location.modal.loading.locating')
                  : t('message.location.modal.loading.map')
              }}
            </p>
          </div>

          <!-- 地图组件 -->
          <LocationMap
            v-else-if="selectedLocation && apiKey"
            :location="selectedLocation"
            :api-key="apiKey"
            :zoom="18"
            :height="340"
            @location-change="handleLocationChange"
            @map-ready="() => (mapLoading = false)"
            @map-error="handleMapError" />
        </div>

        <!-- 位置信息显示 -->
        <div v-if="selectedLocation" class="rounded-6px bg-#fefefe dark:bg-#303030 p-12px">
          <n-flex vertical :size="8">
            <span class="text-14px font-medium">{{ t('message.location.modal.info.current') }}</span>
            <div class="text-12px text-gray-500">
              {{ selectedLocation.address || t('message.location.modal.info.fetching_address') }}
            </div>
            <div class="text-11px text-gray-400">
              {{
                t('message.location.modal.info.coordinate', {
                  lat: selectedLocation.latitude.toFixed(6),
                  lng: selectedLocation.longitude.toFixed(6)
                })
              }}
            </div>
          </n-flex>
        </div>
      </div>

      <!-- 操作按钮 -->
      <n-flex v-if="showActionButtons" align="center" :size="24" class="py-8px">
        <n-button type="primary" secondary :loading="sendingLocation" @click="handleConfirm">
          {{ t('message.location.modal.buttons.send') }}
        </n-button>
      </n-flex>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { useGeolocation } from '@/hooks/useGeolocation'
import { reverseGeocode } from '@/services/mapApi'
import { getSettings } from '@/services/tauriCommand'
import { isMac, isWindows } from '@/utils/PlatformConstants'
import LocationMap from './LocationMap.vue'
import { useI18n } from 'vue-i18n'

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
const apiKey = ref('')

const { t } = useI18n()

// 计算属性
const modalTitle = computed(() => {
  if (mapError.value) return t('message.location.modal.title.map_error')
  if (locationState.error) return t('message.location.modal.title.location_error')
  return t('message.location.modal.title.default')
})

const showActionButtons = computed(() => {
  return !mapLoading.value && !locationState.loading && selectedLocation.value !== null && !mapError.value
})

// 获取位置
const getLocation = async () => {
  try {
    mapError.value = null

    // 并行获取 API key 和位置信息
    const [settings, result] = await Promise.all([
      getSettings(),
      getLocationWithTransform({
        enableHighAccuracy: true
      })
    ])

    // 设置 API key
    apiKey.value = settings.tencent?.map_key || ''
    if (!apiKey.value) {
      const missingKeyMsg = t('message.location.modal.errors.missing_api_key')
      mapError.value = missingKeyMsg
      throw new Error(missingKeyMsg)
    }

    // 获取地址信息
    const geocodeResult = await reverseGeocode(result.transformed.lat, result.transformed.lng).catch((error) => {
      console.warn(t('message.location.modal.errors.geocode_failed'), error)
      return null
    })
    const address =
      geocodeResult?.formatted_addresses?.recommend ||
      geocodeResult?.address ||
      t('message.location.modal.info.unknown_address')

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
const retryMapLoad = async () => {
  mapError.value = null
  await getLocation()
}

// 地图事件处理
const handleLocationChange = async (newLocation: { lat: number; lng: number }) => {
  if (!selectedLocation.value) return

  // 获取新位置的地址
  const geocodeResult = await reverseGeocode(newLocation.lat, newLocation.lng).catch((error) => {
    console.warn(t('message.location.modal.errors.geocode_failed'), error)
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
