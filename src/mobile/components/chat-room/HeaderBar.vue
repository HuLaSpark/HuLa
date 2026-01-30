<template>
  <div class="w-full h-[56px] grid grid-cols-[100px_1fr_100px] z-2 bg-background text-foreground">
    <div @click="handleBack" class="w-full h-full flex items-center">
      <svg class="iconpark-icon w-24px h-24px ms-16px p-5px">
        <use href="#fanhui" class="text-foreground"></use>
      </svg>
      <div
        v-show="props.msgCount ? (props.msgCount > 0 ? true : false) : false"
        class="rounded-15px flex items-center bg-#C7DBD9 px-7px text-14px min-h-20px">
        {{ formattedMsgCount }}
      </div>
    </div>
    <div class="w-full h-full overflow-hidden flex items-center justify-center">
      <div @click="handleRoomNameClick" :class="props.isOfficial ? ['chat-room-name-official'] : ['chat-room-name']">
        <div class="truncate whitespace-nowrap overflow-hidden text-foreground text-ellipsis w-full text-center">
          {{ props.roomName }}
        </div>
        <svg v-if="props.isOfficial" class="w-18px h-18px iconpark-icon text-#1A9B83"><use href="#auth"></use></svg>
      </div>
    </div>
    <div class="w-full h-full flex items-center">
      <div v-if="!props.hiddenRight" class="w-full justify-end flex pe-16px">
        <svg class="w-24px h-24px iconpark-icon p-5px"><use href="#diannao"></use></svg>
        <svg @click="handleMoreClick" class="w-24px h-24px iconpark-icon p-5px"><use href="#more"></use></svg>
      </div>
    </div>
  </div>

  <n-divider v-if="props.border" class="m-0!" />
</template>

<script setup lang="ts">
import router from '@/router'

export interface HeaderBarProps {
  msgCount?: number
  isOfficial?: boolean
  hiddenRight?: boolean
  enableDefaultBackground?: boolean
  enableShadow?: boolean
  roomName?: string | false
  border?: boolean
}

const props = withDefaults(defineProps<HeaderBarProps>(), {
  isOfficial: true,
  hiddenRight: false,
  enableDefaultBackground: true,
  enableShadow: true,
  roomName: false,
  border: false
})

const emits = defineEmits<(e: 'roomNameClick', payload: HeaderBarProps) => void>()

const handleRoomNameClick = () => {
  emits('roomNameClick', props)
}

const formattedMsgCount = computed(() => {
  if (!props.msgCount) return ''
  return props.msgCount > 100 ? '99+' : `${props.msgCount}`
})

const handleBack = async () => {
  router.back()
}

const handleMoreClick = () => {
  router.push(`/mobile/chatRoom/setting`)
}
</script>

<style lang="scss" scoped>
.chat-room-name {
  @apply grid items-center;
}

.chat-room-name-official {
  @apply grid grid-cols-[1fr_20px] items-center gap-5px;
}
</style>
