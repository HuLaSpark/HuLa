<template>
  <div class="w-full h-[56px] grid grid-cols-[100px_1fr_100px] z-2 header-bar-shadow">
    <div @click="handleBack" class="w-full h-full flex items-center">
      <svg class="iconpark-icon w-24px h-24px ms-16px p-5px"><use href="#fanhui"></use></svg>
      <div
        v-show="props.msgCount ? (props.msgCount > 0 ? true : false) : false"
        class="rounded-15px flex items-center bg-#C7DBD9 px-7px text-14px min-h-20px">
        {{ formattedMsgCount }}
      </div>
    </div>
    <div class="w-full h-full overflow-hidden flex items-center justify-center">
      <div :class="props.isOfficial ? ['chat-room-name-official'] : ['chat-room-name']">
        <div class="truncate whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
          {{ props.roomName }}
        </div>
        <svg v-if="props.isOfficial" class="w-18px h-18px iconpark-icon text-#1A9B83"><use href="#auth"></use></svg>
      </div>
    </div>
    <div class="w-full h-full flex items-center">
      <div class="w-full justify-end flex pe-16px">
        <svg class="w-24px h-24px iconpark-icon p-5px"><use href="#diannao"></use></svg>
        <svg class="w-24px h-24px iconpark-icon p-5px"><use href="#more"></use></svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'

const props = defineProps({
  roomName: {
    type: String,
    required: true
  },
  msgCount: {
    type: Number,
    required: false
  },
  isOfficial: {
    type: Boolean,
    default: true
  }
})

const formattedMsgCount = computed(() => {
  if (props.msgCount && props.msgCount > 100) {
    return '99+'
  } else {
    return `${props.msgCount}`
  }
})

const handleBack = async () => {
  const result = await invoke('plugin:hula|ping', {
    payload: { value: 'hello world' }
  })
  console.log('插件测试结果：', result)
  console.log('返回')
}
</script>

<style lang="scss" scoped>
.chat-room-name {
  @apply grid items-center;
}

.chat-room-name-official {
  @apply grid grid-cols-[1fr_20px] items-center gap-5px;
}

.header-bar-shadow {
  box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.1);
}
</style>
