<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NotificationTypeEnum, RoomActEnum, SessionOperateEnum } from '@/enums'
import { IsAllUserEnum, type UserItem, type SessionItem } from '@/services/types'
import { useGroupStore } from '@/stores/group'
import { AvatarUtils } from '@/utils/AvatarUtils'

const { t } = useI18n()
const groupStore = useGroupStore()

const props = defineProps<{
  activeItem: Omit<SessionItem, 'roomId'> | null
  userList: UserItem[]
  isGroupOwner: boolean
  isEditingGroupName: boolean
  currentSessionRoomId: string
  messageSettingOptions: { label: string; value: string }[]
}>()

const emit = defineEmits<{
  top: [value: boolean]
  notification: [value: boolean]
  shield: [value: boolean]
  delete: [type: RoomActEnum]
  copy: []
  'upload-avatar': []
  'group-name-change': []
  'start-edit-group-name': []
  'group-info-change': []
  'manage-group-member': []
  'show-qr-code': []
  'update-room-info': [payload: { id: string; allowScanEnter: boolean }]
}>()

const editingGroupName = defineModel<string>('editingGroupName', { default: '' })
const localMyName = defineModel<string>('localMyName', { default: '' })
const localRemark = defineModel<string>('localRemark', { default: '' })
const messageSettingType = defineModel<string>('messageSettingType', { default: 'notification' })

const groupNameInputRef = useTemplateRef<HTMLInputElement | null>('groupNameInputRef')

watch(
  () => props.isEditingGroupName,
  (editing) => {
    if (editing) {
      nextTick(() => {
        groupNameInputRef.value?.focus()
      })
    }
  }
)
</script>

<template>
  <!-- 群头像 & 基本信息 -->
  <div class="box-item cursor-default">
    <n-flex
      align="center"
      :justify="groupStore.countInfo!.allowScanEnter ? 'space-between' : ''"
      :size="groupStore.countInfo!.allowScanEnter ? 0 : 12">
      <!-- 群头像 -->
      <div class="relative group">
        <div v-if="isGroupOwner" class="group/avatar cursor-pointer relative" @click="emit('upload-avatar')">
          <n-avatar round :size="40" :src="AvatarUtils.getAvatarUrl(activeItem?.avatar || '')" />
          <div
            class="absolute size-full rounded-50% flex-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-400 ease-in-out backdrop-blur-4px top-0 left-0">
            <svg class="size-14px color-#fefefe">
              <use href="#Export"></use>
            </svg>
          </div>
        </div>
        <n-avatar v-else round :size="40" :src="AvatarUtils.getAvatarUrl(activeItem?.avatar || '')" />
      </div>

      <n-flex vertical :size="6">
        <!-- 群名称 -->
        <n-flex :size="10" align="center">
          <div v-if="isGroupOwner && isEditingGroupName">
            <n-input
              ref="groupNameInputRef"
              v-model:value="editingGroupName"
              @blur.stop="emit('group-name-change')"
              @keydown.enter.stop="emit('group-name-change')"
              size="tiny"
              style="width: 100px; height: 22px"
              maxlength="12"
              spellCheck="false"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              class="border-(solid 1px [--line-color])"
              :placeholder="t('home.chat_header.sidebar.group.name_placeholder')" />
          </div>
          <div
            v-else
            class="text-(14px --text-color) leading-loose cursor-default h-22px flex-center"
            :class="{ 'cursor-pointer': isGroupOwner }"
            @click="isGroupOwner && emit('start-edit-group-name')">
            <p :title="activeItem?.name" class="max-w-100px truncate">{{ activeItem?.name }}</p>
            <svg v-if="isGroupOwner" class="size-14px ml-1 inline-block color-[--icon-color]">
              <use href="#edit"></use>
            </svg>
          </div>

          <n-popover trigger="hover" v-if="activeItem?.hotFlag === IsAllUserEnum.Yes && !isEditingGroupName">
            <template #trigger>
              <svg class="size-20px select-none outline-none cursor-pointer color-#13987f">
                <use href="#auth"></use>
              </svg>
            </template>
            <span>{{ t('home.chat_header.sidebar.group.official_badge') }}</span>
          </n-popover>
        </n-flex>

        <n-flex align="center" :size="8">
          <!-- hula号 -->
          <p class="text-(12px center [--chat-text-color]) rounded-4px w-100px py-2px bg-[#e3e3e3] dark:bg-[#505050]">
            {{ activeItem?.account }}
          </p>
          <n-tooltip trigger="hover">
            <template #trigger>
              <svg class="size-12px cursor-pointer hover:color-#909090 hover:transition-colors" @click="emit('copy')">
                <use href="#copy"></use>
              </svg>
            </template>
            <span>{{ t('home.chat_header.sidebar.group.copy') }}</span>
          </n-tooltip>
        </n-flex>
      </n-flex>

      <div
        v-if="groupStore.countInfo!.allowScanEnter"
        class="flex-center cursor-pointer bg-#e3e3e380 dark:bg-#303030 border-(1px solid #90909080) gap-6px px-4px py-6px rounded-6px"
        @click="emit('show-qr-code')">
        <svg class="size-16px"><use href="#pay-code-one"></use></svg>
        <p class="text-(12px [--chat-text-color])">{{ t('home.chat_header.sidebar.group.qr') }}</p>
      </div>
    </n-flex>
  </div>

  <!-- 群聊成员列表 -->
  <div class="box-item cursor-default">
    <n-flex vertical justify="center" :size="16">
      <p class="text-(14px --text-color)">
        {{
          activeItem?.hotFlag !== IsAllUserEnum.Yes
            ? t('home.chat_header.sidebar.group.members')
            : t('home.chat_header.sidebar.group.channel_members')
        }}
      </p>
      <n-flex align="center" justify="start" :size="[24, 20]">
        <template v-for="(item, index) in userList" :key="index">
          <n-flex vertical justify="center" align="center" :size="10">
            <n-avatar round :size="30" :src="AvatarUtils.getAvatarUrl(item.avatar)" />
            <p class="text-(10px --text-color center) w-30px truncate">
              {{ item.name }}
            </p>
          </n-flex>
        </template>
      </n-flex>
    </n-flex>
  </div>

  <!-- 我本群的昵称 -->
  <p class="text-(12px [--chat-text-color]) mt-20px mb-10px">
    {{ t('home.chat_header.sidebar.group.my_name') }}
  </p>
  <n-input
    class="border-(solid 1px [--line-color]) custom-shadow"
    spellCheck="false"
    autoComplete="off"
    autoCorrect="off"
    autoCapitalize="off"
    :maxlength="12"
    clearable
    v-model:value="localMyName"
    @blur.stop="emit('group-info-change')" />

  <!-- 群备注 -->
  <p class="flex-start-center gap-10px text-(12px [--chat-text-color]) mt-20px mb-10px">
    {{ t('home.chat_header.sidebar.group.remark') }}
    <span class="text-(10px #909090)">{{ t('home.chat_header.sidebar.group.remark_desc') }}</span>
  </p>
  <n-input
    class="border-(solid 1px [--line-color]) custom-shadow"
    v-model:value="localRemark"
    spellCheck="false"
    autoComplete="off"
    autoCorrect="off"
    autoCapitalize="off"
    clearable
    @blur.stop="emit('group-info-change')" />

  <!-- 群设置选项 -->
  <div class="box-item cursor-default">
    <n-flex vertical justify="center" :size="4">
      <p class="text-(12px #909090) pb-14px">{{ t('home.chat_header.sidebar.group.settings.title') }}</p>

      <div class="flex-between-center">
        <p>{{ t('home.chat_header.sidebar.group.settings.pin') }}</p>
        <n-switch size="small" :value="activeItem?.top" @update:value="emit('top', $event)" />
      </div>

      <div class="h-1px bg-[--setting-item-line] m-[10px_0]"></div>

      <div class="flex-between-center">
        <p>{{ t('home.chat_header.sidebar.group.settings.mute') }}</p>
        <n-switch
          size="small"
          :value="activeItem?.muteNotification === NotificationTypeEnum.NOT_DISTURB"
          @update:value="emit('notification', $event)" />
      </div>

      <template v-if="groupStore.isAdminOrLord()">
        <div class="h-1px bg-[--setting-item-line] m-[10px_0]"></div>
        <div class="flex-between-center">
          <p>{{ t('home.chat_header.sidebar.group.settings.scan') }}</p>
          <n-switch
            size="small"
            :value="groupStore.countInfo!.allowScanEnter"
            @update:value="
              (val: any) => {
                emit('update-room-info', {
                  id: groupStore.countInfo!.roomId,
                  allowScanEnter: val
                })
              }
            " />
        </div>
      </template>
    </n-flex>
  </div>

  <!-- 群消息设置（仅在消息免打扰开启时显示） -->
  <div v-if="activeItem?.muteNotification === NotificationTypeEnum.NOT_DISTURB" class="box-item cursor-default">
    <n-flex vertical justify="center" :size="4">
      <p class="text-(12px #909090) pb-14px">
        {{ t('home.chat_header.sidebar.group.message_settings.title') }}
      </p>
      <div class="flex-between-center">
        <n-select v-model:value="messageSettingType" :options="messageSettingOptions" />
      </div>
    </n-flex>
  </div>

  <!-- 管理群成员（仅管理员和群主可见） -->
  <div
    v-if="groupStore.isAdminOrLord() && activeItem?.hotFlag !== IsAllUserEnum.Yes && currentSessionRoomId !== '1'"
    class="box-item cursor-pointer mb-20px"
    @click="emit('manage-group-member')">
    <p>{{ t('home.chat_header.sidebar.group.manage_members') }}</p>
  </div>

  <!-- 删除聊天记录 -->
  <div class="box-item cursor-pointer mb-20px" @click="emit('delete', RoomActEnum.DELETE_RECORD)">
    <p>{{ t('home.chat_header.sidebar.group.delete_history') }}</p>
  </div>

  <!-- 退出/解散群聊 -->
  <div
    v-if="activeItem?.hotFlag !== IsAllUserEnum.Yes"
    class="box-item flex-x-center cursor-pointer mb-20px"
    @click="
      emit(
        'delete',
        activeItem?.operate === SessionOperateEnum.DISSOLUTION_GROUP
          ? RoomActEnum.DISSOLUTION_GROUP
          : RoomActEnum.EXIT_GROUP
      )
    ">
    <p class="color-#d03553">
      {{
        activeItem?.operate === SessionOperateEnum.DISSOLUTION_GROUP
          ? t('home.chat_header.sidebar.group.dissolve')
          : t('home.chat_header.sidebar.group.exit')
      }}
    </p>
  </div>

  <!-- 举报 -->
  <p v-if="activeItem?.hotFlag !== IsAllUserEnum.Yes" class="text-(12px #13987f center) my-20px cursor-pointer">
    {{ t('home.chat_header.sidebar.group.report') }}
  </p>
</template>

<style scoped>
.box-item {
  @apply border-(solid 1px [--line-color]) custom-shadow mt-20px bg-[--bg-setting-item] w-full p-12px rounded-12px box-border text-14px first:mt-0;
}
</style>
