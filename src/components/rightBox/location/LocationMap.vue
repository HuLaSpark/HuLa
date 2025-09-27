<template>
  <div class="relative size-full">
    <!-- 地图容器 -->
    <TlbsMap
      ref="mapRef"
      :api-key="apiKey"
      :center="mapCenter"
      :zoom="zoom"
      :map-type-id="'vector'"
      :control="mapControl"
      :options="mapOptions"
      :style="{ height: `${height}px` }"
      @map_inited="() => emit('map-ready')">
      <!-- 位置标记 -->
      <TlbsMultiMarker
        id="location-marker"
        :styles="markerStyles"
        :geometries="markerGeometries"
        @click="props.draggable ? handleMarkerClick : undefined"
        @dragend="props.draggable ? handleMarkerDragEnd : undefined" />
    </TlbsMap>
  </div>
</template>

<script setup lang="ts">
type LocationData = {
  latitude: number
  longitude: number
  address?: string
  timestamp: number
}

type LocationMapProps = {
  location: LocationData
  apiKey: string
  zoom?: number
  height?: number
  draggable?: boolean
}

type LocationMapEmits = {
  'location-change': [location: { lat: number; lng: number }]
  'map-ready': []
  'map-error': [error: string]
}

const props = withDefaults(defineProps<LocationMapProps>(), {
  zoom: 15,
  height: 300,
  draggable: true
})

const emit = defineEmits<LocationMapEmits>()

// 地图实例和状态
const mapRef = ref()

// 计算属性
const mapCenter = computed(() => ({
  lat: props.location.latitude,
  lng: props.location.longitude
}))

// 地图配置
const mapControl = {
  scale: true,
  zoom: false,
  mapType: false,
  rotation: false // 禁用指南针
}

// 地图交互选项 - 根据draggable属性决定是否禁用交互
const mapOptions = computed(() => ({
  draggable: props.draggable, // 禁用拖拽
  scrollWheelZoom: props.draggable, // 禁用滚轮缩放
  doubleClickZoom: props.draggable, // 禁用双击缩放
  clickable: props.draggable // 禁用点击
}))

const markerStyles = {
  'current-location': {
    width: 25,
    height: 35,
    anchor: { x: 12, y: 35 },
    color: '#FF4444'
  }
}

const markerGeometries = computed(() => [
  {
    id: 'current',
    styleId: 'current-location',
    position: mapCenter.value,
    properties: { title: '当前位置' },
    draggable: props.draggable
  }
])

// 事件处理
const handleMarkerClick = (event: any) => {
  if (props.draggable) {
    emit('location-change', {
      lat: event.latLng.lat,
      lng: event.latLng.lng
    })
  }
}

const handleMarkerDragEnd = (event: any) => {
  if (props.draggable) {
    emit('location-change', {
      lat: event.geometry.position.lat,
      lng: event.geometry.position.lng
    })
  }
}

// 响应式监听
watch(
  () => props.location,
  (newLocation) => {
    if (mapRef.value?.map && newLocation) {
      mapRef.value.map.setCenter({
        lat: newLocation.latitude,
        lng: newLocation.longitude
      })
    }
  },
  { deep: true }
)

watch(
  () => props.zoom,
  (newZoom) => {
    if (mapRef.value?.map) {
      mapRef.value.map.setZoom(newZoom)
    }
  }
)
</script>

<style scoped lang="scss"></style>
