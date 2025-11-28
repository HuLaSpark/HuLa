<template>
  <div
    v-if="chatStore.isMsgMultiChoose && chatStore.msgMultiChooseMode !== 'forward' && !showModal"
    class="relative flex-center gap-22px h-full">
    <!-- 功能模块 -->
    <div class="flex items-start gap-14px">
      <div class="flex flex-col items-center gap-14px w-64px" v-for="opt in opts">
        <n-button :disabled="opt.disabled" secondary circle @click="opt.click" class="size-46px mx-auto">
          <template #icon>
            <svg class="size-22px">
              <use :href="opt.icon"></use>
            </svg>
          </template>
        </n-button>
        <p class="text-(12px [--text-color]) text-center w-full whitespace-normal break-words leading-tight">
          {{ opt.text }}
        </p>
      </div>
    </div>
  </div>

  <n-modal v-model:show="showModal" class="w-70% rounded-8px">
    <div class="bg-[--bg-popover] h-full p-6px box-border flex flex-col">
      <div
        v-if="isMac()"
        @click="showModal = false"
        class="mac-close z-999 size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none absolute left-6px">
        <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
          <use href="#close"></use>
        </svg>
      </div>

      <svg v-if="isWindows()" @click="showModal = false" class="size-12px ml-a cursor-pointer select-none">
        <use href="#close"></use>
      </svg>
      <div class="pt-8px flex flex-col select-none">
        <div class="flex flex-row">
          <!-- 搜索会话 -->
          <div class="flex-1 h-64vh bg-#e3e3e360 dark:bg-#222 rounded-8px px-12px mt-6px flex flex-col">
            <n-input
              id="search"
              v-model:value="searchText"
              class="rounded-6px mt-8px border-(solid 1px [--line-color]) w-full relative text-12px"
              :maxlength="20"
              :placeholder="t('message.multi_choose.search_placeholder')"
              clearable
              size="small">
              <template #prefix>
                <svg class="w-12px h-12px">
                  <use href="#search"></use>
                </svg>
              </template>
            </n-input>

            <n-scrollbar class="flex-1">
              <template v-for="session in filteredSessionList" :key="session.roomId">
                <n-flex align="center" :size="8" class="text-12px text-#303030 dark:text-#fefefe py-8px px-4px">
                  <n-checkbox v-model:checked="session.isCheck" @click.stop />
                  <n-avatar class="rounded-8px" :size="30" :src="AvatarUtils.getAvatarUrl(session.avatar)" />
                  <p>{{ session.remark ? session.remark : session.name }}</p>
                  <p class="text-(12px #909090)" v-if="session.type === RoomTypeEnum.GROUP">
                    ({{ groupStore.getGroupDetailByRoomId(session.roomId)?.memberNum }})
                  </p>
                </n-flex>
              </template>
            </n-scrollbar>
          </div>
          <!-- 已选择会话 -->
          <div class="flex-1 min-w-0 h-64vh px-12px pt-4px flex flex-col">
            <p class="text-(12px #909090) pb-10px">{{ t('message.multi_choose.send_to_separately') }}</p>
            <n-scrollbar class="flex-1">
              <template v-for="session in selectedSessions" :key="session.roomId">
                <n-flex align="center" class="p-8px">
                  <n-avatar class="rounded-8px" :size="30" :src="AvatarUtils.getAvatarUrl(session.avatar)" />
                  <p class="text-(12px [--chat-text-color])">{{ session.remark ? session.remark : session.name }}</p>
                  <n-button quaternary circle size="small" class="ml-auto" @click="handleRemoveSession(session.roomId)">
                    <template #icon>
                      <n-icon size="14">
                        <svg class="w-14px h-14px">
                          <use href="#close"></use>
                        </svg>
                      </n-icon>
                    </template>
                  </n-button>
                </n-flex>
              </template>
            </n-scrollbar>

            <span class="w-full h-1px bg-[--line-color] my-8px"></span>

            <div class="flex-1 flex-col-center">
              <ChatMultiMsg :content-list="msgContents" :msg-ids="msgIds" />
              <n-input
                class="my-12px border-(solid 1px [--line-color])"
                :placeholder="t('message.multi_choose.leave_message_placeholder')" />
              <div class="w-full flex justify-between">
                <n-button secondary class="w-100px h-30px" @click="showModal = false">
                  {{ t('message.multi_choose.cancel_button') }}
                </n-button>
                <n-button secondary type="primary" class="w-100px h-30px" @click="sendMsg">
                  {{ t('message.multi_choose.send_button') }}
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </n-modal>

  <n-modal v-model:show="showDeleteConfirm" class="w-350px border-rd-8px">
    <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
      <div
        v-if="isMac()"
        @click="showDeleteConfirm = false"
        class="mac-close z-999 size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none absolute left-6px">
        <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
          <use href="#close"></use>
        </svg>
      </div>

      <svg v-if="isWindows()" @click="showDeleteConfirm = false" class="w-12px h-12px ml-a cursor-pointer select-none">
        <use href="#close"></use>
      </svg>
      <div class="flex flex-col gap-30px p-[22px_10px_10px_22px] select-none">
        <span class="text-14px leading-normal">{{ deleteConfirmText }}</span>

        <n-flex justify="end">
          <n-button class="w-78px" secondary @click="showDeleteConfirm = false">
            {{ t('message.multi_choose.cancel_button') }}
          </n-button>
          <n-button class="w-78px" color="#13987f" :loading="isDeleting" @click="handleBatchDelete">
            {{ t('message.multi_choose.delete_action') }}
          </n-button>
        </n-flex>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ErrorType } from '@/common/exception'
import { MergeMessageType, MittEnum, RoomTypeEnum, TauriCommand } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import { useChatStore } from '@/stores/chat'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { mergeMsg } from '@/utils/ImRequestUtils'
import { isMessageMultiSelectEnabled } from '@/utils/MessageSelect'
import { isMac, isWindows } from '@/utils/PlatformConstants'
import { invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'
import { useI18n } from 'vue-i18n'
import type { MsgId } from '@/typings/global'
import ChatMultiMsg from './ChatMultiMsg.vue'

const { t } = useI18n()
const chatStore = useChatStore()
const groupStore = useGroupStore()
const globalStore = useGlobalStore()
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const searchText = ref('')
const isDeleting = ref(false)
const selectedSessions = computed(() => chatStore.sessionList.filter((session) => session.isCheck === true))
const selectedMsgs = computed(() =>
  chatStore.chatMessageList.filter((msg) => msg.isCheck === true && isMessageMultiSelectEnabled(msg.message.type))
)

const getMessagePreview = (msg: (typeof selectedMsgs.value)[number]) => {
  const userInfo = groupStore.getUserInfo(msg.fromUser.uid)
  const nickname = userInfo?.myName || msg.fromUser?.username || ''
  const body: any = msg.message.body || {}
  const preview =
    body.content || body.fileName || body.name || body.title || body.url || t('message.multi_choose.non_text_message')
  return nickname ? `${nickname}: ${preview}` : preview
}

const msgContents = computed(() => selectedMsgs.value.map((msg) => getMessagePreview(msg)))

const msgIds = computed((): MsgId[] => {
  return selectedMsgs.value.map((msg) => {
    return {
      msgId: msg.message.id,
      fromUid: msg.fromUser.uid
    }
  })
})

const filteredSessionList = computed(() => {
  const searchValue = searchText.value.trim().toLowerCase()
  if (!searchValue) {
    return chatStore.sessionList
  }
  return chatStore.sessionList.filter((session) => {
    const displayName = (session.remark || session.name).toLowerCase()
    return displayName.includes(searchValue)
  })
})

let mergeMessageType: MergeMessageType = MergeMessageType.SINGLE
const deleteConfirmText = computed(() => {
  const count = selectedMsgs.value.length
  if (!count) {
    return t('message.multi_choose.select_delete_prompt')
  }
  return t('message.multi_choose.delete_confirm', { count })
})

const handleDeleteClick = () => {
  if (selectedMsgs.value.length === 0) {
    window.$message?.warning(t('message.multi_choose.select_delete_prompt'))
    return
  }
  showDeleteConfirm.value = true
}

const handleBatchDelete = async () => {
  if (isDeleting.value || selectedMsgs.value.length === 0) return
  const roomId = globalStore.currentSessionRoomId
  if (!roomId) {
    window.$message?.error(t('message.multi_choose.room_missing'))
    showDeleteConfirm.value = false
    return
  }

  isDeleting.value = true
  const ids = selectedMsgs.value.map((msg) => msg.message.id)

  try {
    await Promise.all(
      ids.map((messageId) =>
        invokeWithErrorHandler(
          TauriCommand.DELETE_MESSAGE,
          {
            messageId,
            roomId
          },
          {
            customErrorMessage: t('message.multi_choose.delete_failed_short'),
            errorType: ErrorType.Client
          }
        )
      )
    )
    ids.forEach((id) => chatStore.deleteMsg(id))
    window.$message?.success(t('message.multi_choose.delete_success'))
    chatStore.clearMsgCheck()
    chatStore.resetSessionSelection()
    chatStore.setMsgMultiChoose(false)
    useMitt.emit(MittEnum.UPDATE_SESSION_LAST_MSG, { roomId })
    showDeleteConfirm.value = false
  } catch (error) {
    console.error('批量删除消息失败:', error)
    window.$message?.error(t('message.multi_choose.delete_failed_retry'))
  } finally {
    isDeleting.value = false
  }
}

const opts = computed(() => [
  {
    text: t('message.multi_choose.single_forward'),
    icon: '#share-three',
    disabled: selectedMsgs.value.length === 0,
    click: () => {
      mergeMessageType = MergeMessageType.SINGLE
      chatStore.resetSessionSelection()
      showModal.value = true
    }
  },
  {
    text: t('message.multi_choose.merge_forward'),
    icon: '#share',
    disabled: selectedMsgs.value.length === 0,
    click: () => {
      mergeMessageType = MergeMessageType.MERGE
      chatStore.resetSessionSelection()
      showModal.value = true
    }
  },
  // {
  //   text: '收藏',
  //   icon: '#collect',
  //   click: () => {
  //     window.$message.warning('暂未实现')
  //   }
  // },
  {
    text: t('message.multi_choose.save_to_pc'),
    icon: '#collect-laptop',
    click: () => {
      window.$message.warning(t('message.multi_choose.not_implemented'))
    }
  },
  {
    text: t('message.multi_choose.delete_action'),
    icon: '#delete',
    disabled: selectedMsgs.value.length === 0,
    click: handleDeleteClick
  },
  {
    text: t('message.multi_choose.exit_multi_select'),
    icon: '#close',
    click: () => {
      chatStore.clearMsgCheck()
      chatStore.resetSessionSelection()
      chatStore.setMsgMultiChoose(false)
    }
  }
])

watch(showModal, (visible, previous) => {
  if (!visible && previous) {
    if (chatStore.msgMultiChooseMode === 'forward') {
      chatStore.setMsgMultiChoose(false)
    }
    chatStore.resetSessionSelection()
    if (!chatStore.isMsgMultiChoose) {
      chatStore.clearMsgCheck()
    }
  }
})

const handleRemoveSession = (roomId: string) => {
  const session = chatStore.sessionList.find((item) => item.roomId === roomId)
  if (session) {
    session.isCheck = false
  }
}

const sendMsg = async () => {
  const selectedRoomIds = selectedSessions.value.map((item) => item.roomId)
  const selectedMsgIds = selectedMsgs.value.map((item) => item.message.id)

  await mergeMsg({
    roomIds: selectedRoomIds,
    type: mergeMessageType,
    messageIds: selectedMsgIds,
    fromRoomId: globalStore.currentSessionRoomId
  })
    .then(() => {
      window.$message.success(t('message.multi_choose.forward_success'))
    })
    .catch((e) => {
      console.error('消息转发失败', e)
      window.$message.error(t('message.multi_choose.forward_failed'))
    })
    .finally(() => {
      showModal.value = false
      chatStore.clearMsgCheck()
      chatStore.setMsgMultiChoose(false)
      chatStore.resetSessionSelection()
    })
}

useMitt.on(MittEnum.MSG_MULTI_CHOOSE, (payload?: { action?: string; mergeType?: MergeMessageType }) => {
  if (!payload) return
  if (payload.action === 'open-forward') {
    mergeMessageType = payload.mergeType ?? MergeMessageType.SINGLE
    chatStore.resetSessionSelection()
    showModal.value = true
  }
})
</script>
<style scoped>
/**! 修改naive-ui复选框的样式 */
:deep(.n-checkbox .n-checkbox-box) {
  border-radius: 50%;
  width: 16px;
  height: 16px;
}
</style>
