<template>
  <div ref="wrap" class="relative" :style="{ height: `${height}px` }">
    <img v-if="displayImgSrc" :src="displayImgSrc" class="size-full object-cover select-none" draggable="false" />
    <div
      v-if="controls"
      class="absolute left-0 top-0 size-full"
      @wheel.prevent="onWheel"
      @mousedown.prevent="onMouseDown"></div>
    <div v-if="controls" class="absolute right-8px bottom-8px flex flex-col gap-6px">
      <button class="size-26px rounded-4px bg-#ffffff50 dark:bg-#00000040" @click="zoomIn">+</button>
      <button class="size-26px rounded-4px bg-#ffffff50 dark:bg-#00000040" @click="zoomOut">-</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getStaticMap } from '@/services/mapApi'

type LocationData = { latitude: number; longitude: number }

// 这里缩放很大的时候有问题，会出现图片显示不了；谁来修复一下
const props = withDefaults(
  defineProps<{ location: LocationData; zoom?: number; height?: number; draggable?: boolean; controls?: boolean }>(),
  { zoom: 18, height: 300, draggable: true, controls: true }
)

const emit = defineEmits<{
  'location-change': [loc: { lat: number; lng: number }]
  'map-ready': []
  'map-error': [msg: string]
}>()

const wrap = ref<HTMLElement | null>(null)
const imgSrc = ref('')
const displayImgSrc = computed(() =>
  imgSrc.value?.startsWith('data:') ? imgSrc.value : imgSrc.value ? `data:image/png;base64,${imgSrc.value}` : ''
)
const centerLat = ref(props.location.latitude)
const centerLng = ref(props.location.longitude)
const zoom = ref(props.zoom)
const controls = computed(() => !!props.controls)

const world = (z: number) => 256 * 2 ** z
const lonLatToPixels = (lon: number, lat: number, z: number) => {
  const s = world(z)
  const x = ((lon + 180) / 360) * s
  const sin = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s
  return { x, y }
}
const pixelsToLonLat = (x: number, y: number, z: number) => {
  const s = world(z)
  const lon = (x / s) * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / s))) * 180) / Math.PI
  return { lon, lat }
}

const fetchImage = async () => {
  try {
    const wRaw = wrap.value?.clientWidth || 600
    const hRaw = props.height || 300
    const w = Math.max(100, Math.min(1280, Math.round(wRaw)))
    const h = Math.max(100, Math.min(1280, Math.round(hRaw)))
    // clamp lat/lng to valid ranges
    const lat = Math.max(-85, Math.min(85, centerLat.value))
    const lng = Math.max(-180, Math.min(180, centerLng.value))
    const prev = imgSrc.value
    const next = await getStaticMap(lat, lng, w, h, zoom.value)
    imgSrc.value = next || prev
    emit('map-ready')
  } catch (e: any) {
    emit('map-error', String(e?.message || e))
  }
}

const zoomIn = () => {
  zoom.value = Math.min(zoom.value + 1, 20)
  fetchImage()
}
const zoomOut = () => {
  zoom.value = Math.max(zoom.value - 1, 3)
  fetchImage()
}
const onWheel = (ev: WheelEvent) => {
  if (!controls.value) return
  if (ev.deltaY < 0) zoomIn()
  else zoomOut()
}

let dragging = false
let lastX = 0
let lastY = 0
const onMouseDown = (ev: MouseEvent) => {
  if (!props.draggable || !controls.value) return
  dragging = true
  lastX = ev.clientX
  lastY = ev.clientY
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}
const onMouseMove = (ev: MouseEvent) => {
  if (!dragging) return
  const w = wrap.value?.clientWidth || 600
  const h = props.height || 300
  const dx = ev.clientX - lastX
  const dy = ev.clientY - lastY
  lastX = ev.clientX
  lastY = ev.clientY
  const c = lonLatToPixels(centerLng.value, centerLat.value, zoom.value)
  const scaleX = world(zoom.value) / w
  const scaleY = world(zoom.value) / h
  const nx = c.x - dx * scaleX
  const ny = c.y + dy * scaleY
  const ll = pixelsToLonLat(nx, ny, zoom.value)
  centerLng.value = Math.max(-180, Math.min(180, ll.lon))
  centerLat.value = Math.max(-85, Math.min(85, ll.lat))
}
const onMouseUp = () => {
  if (!dragging) return
  dragging = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  fetchImage()
  emit('location-change', { lat: centerLat.value, lng: centerLng.value })
}

watch(
  () => props.location,
  (val) => {
    if (!val) return
    centerLat.value = val.latitude
    centerLng.value = val.longitude
    fetchImage()
  },
  { deep: true }
)

onMounted(() => {
  fetchImage()
})
</script>

<style scoped></style>
