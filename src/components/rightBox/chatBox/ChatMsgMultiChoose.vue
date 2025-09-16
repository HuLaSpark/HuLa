<template>
  <div class="relative flex-center gap-22px h-full">
    <!-- 功能模块 -->
    <div class="flex flex-col flex-y-center gap-14px" v-for="opt in opts">
      <n-button :disabled="opt.disabled" secondary circle @click="opt.click" class="size-46px">
        <template #icon>
          <svg class="size-22px">
            <use :href="opt.icon"></use>
          </svg>
        </template>
      </n-button>
      <p class="text-(12px [--text-color])">{{ opt.text }}</p>
    </div>
  </div>

  <n-modal v-model:show="showModal" class="w-fit min-w-620px rounded-8px">
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
      <div class="flex flex-col select-none">
        <div class="flex flex-row">
          <!-- 搜索会话 -->
          <div class="flex-1 h-64vh bg-#f3f3f3 dark:bg-#222 rounded-8px px-12px pt-12px flex flex-col">
            <n-input
              id="search"
              v-model:value="searchText"
              class="rounded-6px w-full relative text-12px"
              style="background: var(--search-bg-color)"
              :maxlength="20"
              clearable
              size="small">
              <template #prefix>
                <svg class="w-12px h-12px">
                  <use href="#search"></use>
                </svg>
              </template>
            </n-input>

            <n-scrollbar class="flex-1">
              <template v-for="session in chatStore.sessionList" :key="session.roomId">
                <n-flex align="center" :size="8" class="text-(12px #909090) py-8px px-4px">
                  <n-checkbox v-model:checked="session.isCheck" @click.stop />
                  <n-avatar class="rounded-8px" :size="30" :src="AvatarUtils.getAvatarUrl(session.avatar)" />
                  <p>{{ session.remark ? session.remark : session.name }}</p>
                  <p v-if="session.type === RoomTypeEnum.GROUP">
                    ({{ groupStore.getGroupDetailByRoomId(session.roomId)?.memberNum }})
                  </p>
                </n-flex>
              </template>
            </n-scrollbar>
          </div>
          <!-- 已选择会话 -->
          <div class="flex-1 h-64vh px-12px flex flex-col">
            <p class="text-(12px #909090) pb-10px">分别发送给</p>
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

            <div class="flex-1 flex flex-col">
              <div class="flex-1 bg-#f3f3f3 dark:bg-#222 rounded-8px">待实现</div>
              <n-input class="my-12px" placeholder="给朋友留言" />
              <div class="flex justify-between">
                <n-button quaternary class="w-100px h-30px" @click="showModal = false">取消</n-button>
                <n-button secondary type="primary" class="w-100px h-30px" @click="sendMsg">发送</n-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { MittEnum, RoomTypeEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import { useChatStore } from '@/stores/chat'
import { useGroupStore } from '@/stores/group'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { isMac, isWindows } from '@/utils/PlatformConstants'

const chatStore = useChatStore()
const groupStore = useGroupStore()
const showModal = ref(false)
const searchText = ref('')
const selectedSessions = computed(() => {
  return chatStore.sessionList.filter((session) => session.isCheck === true)
})
const selectedMsgs = computed(() => {
  return chatStore.chatMessageList.filter((msg) => msg.isCheck === true)
})

const opts = computed(() => [
  {
    text: '逐条转发',
    icon: '#share-three',
    disabled: selectedMsgs.value.length === 0,
    click: () => {
      console.log(selectedMsgs)
    }
  },
  {
    text: '合并转发',
    icon: '#share',
    disabled: selectedMsgs.value.length === 0,
    click: () => {
      if (selectedMsgs.value.length > 0) {
        showModal.value = true
      }
    }
  },
  {
    text: '收藏',
    icon: '#collect'
  },
  {
    text: '保存至电脑',
    icon: '#collect-laptop'
  },
  {
    text: '删除',
    icon: '#delete'
  },
  {
    text: '',
    icon: '#close',
    click: () => {
      chatStore.chatMessageList.forEach((msg) => (msg.isCheck = false))
      useMitt.emit(MittEnum.MSG_MULTI_CHOOSE, false)
    }
  }
])

const handleRemoveSession = (roomId: string) => {
  const session = chatStore.sessionList.find((session) => session.roomId === roomId)
  if (session) {
    session.isCheck = false
  }
}

const sendMsg = () => {}
</script>
<style scoped>
/**! 修改naive-ui复选框的样式 */
:deep(.n-checkbox .n-checkbox-box) {
  border-radius: 50%;
  width: 16px;
  height: 16px;
}
</style>
