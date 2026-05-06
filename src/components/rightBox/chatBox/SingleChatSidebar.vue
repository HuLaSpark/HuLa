<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NotificationTypeEnum, RoomActEnum } from '@/enums'
import type { SessionItem } from '@/services/types'

const { t } = useI18n()

defineProps<{
  activeItem: Omit<SessionItem, 'roomId'> | null
  isBotUser: boolean
}>()

const emit = defineEmits<{
  top: [value: boolean]
  notification: [value: boolean]
  shield: [value: boolean]
  delete: [type: RoomActEnum]
}>()
</script>

<template>
  <!-- 置顶 & 免打扰 -->
  <div class="box-item flex-col-y-center">
    <div class="flex-between-center">
      <p>{{ t('home.chat_header.sidebar.single.pin') }}</p>
      <n-switch size="small" :value="activeItem?.top" @update:value="emit('top', $event)" />
    </div>
    <div class="h-1px bg-[--setting-item-line] m-[10px_0]"></div>
    <div class="flex-between-center">
      <p>{{ t('home.chat_header.sidebar.single.mute') }}</p>
      <n-switch
        size="small"
        :value="activeItem?.muteNotification === NotificationTypeEnum.NOT_DISTURB"
        @update:value="emit('notification', $event)" />
    </div>
  </div>

  <!-- 屏蔽消息 -->
  <div class="box-item">
    <div class="flex-between-center">
      <p>{{ t('home.chat_header.sidebar.single.shield') }}</p>
      <n-switch size="small" :value="activeItem?.shield" @update:value="emit('shield', $event)" />
    </div>
  </div>

  <!-- 删除聊天记录 -->
  <div class="box-item cursor-pointer" @click="emit('delete', RoomActEnum.DELETE_RECORD)">
    <p>{{ t('home.chat_header.sidebar.single.delete_history') }}</p>
  </div>

  <!-- 删除好友（非 bot 用户可见） -->
  <div
    v-if="!isBotUser"
    class="box-item flex-x-center cursor-pointer"
    @click="emit('delete', RoomActEnum.DELETE_FRIEND)">
    <p class="color-#d03553">{{ t('home.chat_header.sidebar.single.delete_friend') }}</p>
  </div>

  <!-- 举报 -->
  <p v-if="!isBotUser" class="m-[0_auto] text-(12px #13987f center) mt-20px cursor-pointer">
    {{ t('home.chat_header.sidebar.single.report') }}
  </p>
</template>

<style scoped>
.box-item {
  @apply border-(solid 1px [--line-color]) custom-shadow mt-20px bg-[--bg-setting-item] w-full p-12px rounded-12px box-border text-14px first:mt-0;
}
</style>
