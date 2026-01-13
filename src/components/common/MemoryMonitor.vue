<template>
  <div
    ref="monitorRef"
    class="memory-monitor"
    :class="{ minimized: isMinimized }"
    :style="monitorStyle"
    @click="handleContainerClick"
    @pointerdown="onPointerDown">
    <button
      v-if="!isMinimized"
      class="minimize-btn"
      type="button"
      title="最小化"
      @click.stop="toggleMinimize(true)"
      @pointerdown.stop>
      <svg class="size-16px color-#fff rotate-90"><use href="#right"></use></svg>
    </button>
    <template v-if="!isMinimized">
      <div class="title">Memory Monitor (click to toggle)</div>
      <div v-if="expanded" class="section">
        <template v-for="(value, name) in storeInfo" :key="name">
          <div v-if="String(name).startsWith('--')" class="label">{{ name }}</div>
          <div v-else class="item">
            {{ name }}:
            <span class="value">{{ value }}</span>
          </div>
        </template>
      </div>
      <div v-else class="section">
        <div class="item text-gray-400">Click to expand</div>
      </div>
    </template>

    <img v-else class="size-24px" title="点击恢复内存监控" src="/logoL.png" alt="" />
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, reactive, computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useGroupStore } from '@/stores/group'
import { useGlobalStore } from '@/stores/global'

const storeInfo = ref<Record<string, string | number>>({})
const expanded = ref(true)
const isMinimized = ref(true)
const monitorRef = ref<HTMLElement | null>(null)
const position = reactive({
  x: 0,
  y: 0
})
const dragState = reactive({
  startX: 0,
  startY: 0,
  initialX: 0,
  initialY: 0
})
const isDragging = ref(false)
const suppressClickOnce = ref(false)

let timer: ReturnType<typeof setInterval> | null = null

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

const estimateSize = (obj: any, depth = 0, seen = new WeakSet()): number => {
  if (depth > 10) return 0
  if (obj === null || obj === undefined) return 8
  if (typeof obj === 'boolean') return 4
  if (typeof obj === 'number') return 8
  if (typeof obj === 'string') return obj.length * 2 + 40
  if (typeof obj !== 'object') return 8

  if (seen.has(obj)) return 0
  seen.add(obj)

  let size = 40
  if (Array.isArray(obj)) {
    size += obj.length * 8
    for (let i = 0; i < Math.min(obj.length, 100); i++) {
      size += estimateSize(obj[i], depth + 1, seen)
    }
    if (obj.length > 100) size += (obj.length - 100) * 200
  } else if (obj instanceof Map) {
    obj.forEach((v, k) => {
      size += estimateSize(k, depth + 1, seen) + estimateSize(v, depth + 1, seen)
    })
  } else {
    const keys = Object.keys(obj)
    for (const key of keys.slice(0, 50)) {
      size += key.length * 2 + 40 + estimateSize(obj[key], depth + 1, seen)
    }
    if (keys.length > 50) size += (keys.length - 50) * 500
  }
  return size
}

const updateMemory = () => {
  try {
    const chatStore = useChatStore()
    const groupStore = useGroupStore()
    const globalStore = useGlobalStore()

    const messageMap = chatStore.messageMap || {}
    const sessionList = chatStore.sessionList || []

    let totalMsgs = 0
    let roomCount = 0
    const roomMsgCounts: string[] = []

    for (const roomId of Object.keys(messageMap)) {
      const count = Object.keys(messageMap[roomId] || {}).length
      totalMsgs += count
      roomCount++
      if (count > 0) {
        roomMsgCounts.push(`${count}`)
      }
    }

    const memberMap = (groupStore as any).memberMap || {}
    const cachedUserInfo = (groupStore as any).cachedUserInfo || {}

    let totalMembers = 0
    const memberMapRooms = Object.keys(memberMap).length
    for (const roomId of Object.keys(memberMap)) {
      const members = memberMap[roomId]
      if (members instanceof Map) {
        totalMembers += members.size
      } else if (typeof members === 'object') {
        totalMembers += Object.keys(members).length
      }
    }

    const sessionSize = estimateSize(sessionList)
    const messageSize = estimateSize(messageMap)
    const memberSize = estimateSize(memberMap)
    const userInfoSize = estimateSize(cachedUserInfo)

    storeInfo.value = {
      '-- Chat Store --': '',
      'sessionList count': sessionList.length,
      'sessionList size': formatBytes(sessionSize),
      'messageMap rooms': roomCount,
      'messageMap total msgs': totalMsgs,
      'messageMap size': formatBytes(messageSize),
      currentRoomId: globalStore.currentSessionRoomId || 'none',
      '-- Group Store --': '',
      'memberMap rooms': memberMapRooms,
      'memberMap total users': totalMembers,
      'memberMap size': formatBytes(memberSize),
      'cachedUserInfo count': Object.keys(cachedUserInfo).length,
      'cachedUserInfo size': formatBytes(userInfoSize),
      '-- Total Estimated --': '',
      'Stores Total': formatBytes(sessionSize + messageSize + memberSize + userInfoSize)
    }
  } catch (e) {
    console.warn('Memory monitor error:', e)
    storeInfo.value = { error: String(e) }
  }
}

onMounted(() => {
  updateMemory()
  timer = setInterval(updateMemory, 3000)
  nextTick(() => {
    setInitialPosition()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('resize', handleResize)
  detachDragListeners()
})

const monitorStyle = computed(() => ({
  left: `${position.x}px`,
  top: `${position.y}px`
}))

const setInitialPosition = () => {
  const el = monitorRef.value
  if (!el) {
    return
  }
  const rect = el.getBoundingClientRect()
  position.x = window.innerWidth - rect.width - 16
  position.y = window.innerHeight - rect.height - 66
  clampPosition()
}

const clampPosition = () => {
  const el = monitorRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const maxX = Math.max(0, window.innerWidth - rect.width)
  const maxY = Math.max(0, window.innerHeight - rect.height)
  position.x = Math.min(Math.max(0, position.x), maxX)
  position.y = Math.min(Math.max(0, position.y), maxY)
}

const handleResize = () => {
  nextTick(() => clampPosition())
}

const toggleMinimize = (nextState?: boolean) => {
  const targetState = typeof nextState === 'boolean' ? nextState : !isMinimized.value
  isMinimized.value = targetState
  nextTick(() => {
    if (targetState) {
      setInitialPosition()
    } else {
      clampPosition()
    }
  })
}

const handleContainerClick = () => {
  if (suppressClickOnce.value) {
    suppressClickOnce.value = false
    return
  }
  if (isMinimized.value) {
    toggleMinimize(false)
    return
  }
  expanded.value = !expanded.value
}

const onPointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return
  if (event.target instanceof HTMLElement && event.target.closest('.minimize-btn')) return
  isDragging.value = true
  suppressClickOnce.value = false
  dragState.startX = event.clientX
  dragState.startY = event.clientY
  dragState.initialX = position.x
  dragState.initialY = position.y
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp, { once: true })
}

const onPointerMove = (event: PointerEvent) => {
  if (!isDragging.value) return
  const deltaX = event.clientX - dragState.startX
  const deltaY = event.clientY - dragState.startY
  if (!suppressClickOnce.value && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
    suppressClickOnce.value = true
  }
  position.x = dragState.initialX + deltaX
  position.y = dragState.initialY + deltaY
  clampPosition()
}

const onPointerUp = () => {
  isDragging.value = false
  detachDragListeners()
}

const detachDragListeners = () => {
  window.removeEventListener('pointermove', onPointerMove)
}
</script>
<style scoped>
.memory-monitor {
  position: fixed;
  left: 0;
  top: 0;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  font-size: 11px;
  font-family: monospace;
  z-index: 99999;
  min-width: 220px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: grab;
}
.memory-monitor:active {
  cursor: grabbing;
}
.memory-monitor.minimized {
  width: 32px;
  height: 32px;
  min-width: unset;
  padding: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.35);
}
.minimize-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;
}
.minimize-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
.title {
  font-weight: bold;
  margin-bottom: 8px;
  color: #13987f;
  border-bottom: 1px solid #333;
  padding-bottom: 4px;
}
.section {
  margin-top: 8px;
}
.label {
  color: #60a5fa;
  margin-bottom: 4px;
}
.item {
  padding: 2px 0;
}
.value {
  color: #fbbf24;
}
</style>
