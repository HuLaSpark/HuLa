<template>
  <div>
    <div class="flex justify-around px-18">
      <!-- 功能模块 -->
      <div class="flex flex-col flex-y-center" v-for="opt in opts">
        <n-button quaternary circle strong @click="opt.click" class="size-70px !p-0">
          <template #icon>
            <n-icon size="40">
              <svg class="iconpark-icon w-70px h-70px">
                <use :href="opt.icon"></use>
              </svg>
            </n-icon>
          </template>
        </n-button>
        <p class="text-12px">{{ opt.text }}</p>
      </div>
    </div>

    <n-modal v-model:show="showModal">
      <n-card class="w-60%" content-style="padding: 0">
        <div class="flex flex-row">
          <!-- 搜索会话 -->
          <div class="flex-1 h-60vh bg-#F7F7F7 px-4 pt-4 flex flex-col">
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
              <div v-for="session in chatStore.sessionList" class="flex m-4">
                <n-checkbox v-model:checked="session.isCheck" class="flex items-center mr-3 select-none" @click.stop />
                <n-avatar round :src="AvatarUtils.getAvatarUrl(session.avatar)" />
                <div class="flex items-center ml-2">{{ session.remark ? session.remark : session.name }}</div>
                <div class="flex items-center" v-if="session.type === RoomTypeEnum.GROUP">
                  ({{ groupStore.getGroupDetailByRoomId(session.roomId)?.memberNum }})
                </div>
              </div>
            </n-scrollbar>
          </div>
          <!-- 已选择会话 -->
          <div class="flex-1 h-60vh px-4 pt-4 flex flex-col">
            <p class="mb-4">分别发送给</p>
            <n-scrollbar class="flex-1">
              <div v-for="session in selectedSessions" class="flex items-center m-4">
                <n-avatar round :src="AvatarUtils.getAvatarUrl(session.avatar)" />
                <div class="flex items-center ml-2">{{ session.remark ? session.remark : session.name }}</div>
                <n-button
                  quaternary
                  circle
                  size="small"
                  class="ml-2 hover:bg-red-50 hover:text-red-500 transition-colors ml-auto"
                  @click="handleRemoveSession(session.roomId)">
                  <template #icon>
                    <n-icon size="14">
                      <svg class="w-14px h-14px">
                        <use href="#close"></use>
                      </svg>
                    </n-icon>
                  </template>
                </n-button>
              </div>
            </n-scrollbar>
            <n-divider />
            <div class="flex-1 flex flex-col">
              <div class="flex-1 bg-#DADADA"></div>
              <n-input class="w-30 my-3" style="background: var(--search-bg-color)" />
              <div class="flex justify-between mb-2">
                <n-button type="default" class="w-30" @click="showModal = false">取消</n-button>
                <n-button type="primary" class="w-30" @click="sendMsg">发送</n-button>
              </div>
            </div>
          </div>
        </div>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { MittEnum, RoomTypeEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import { useChatStore } from '@/stores/chat'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useGroupStore } from '~/src/stores/group'

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

const opts = [
  {
    text: '逐条转发',
    icon: '#smiling-face',
    click: () => {
      console.log(selectedMsgs)
    }
  },
  {
    text: '合并转发',
    icon: '#smiling-face',
    click: () => {
      if (selectedMsgs.value.length > 0) {
        showModal.value = true
      }
    }
  },
  {
    text: '收藏',
    icon: '#smiling-face'
  },
  {
    text: '保存至电脑',
    icon: '#smiling-face'
  },
  {
    text: '删除',
    icon: '#smiling-face'
  },
  {
    text: '',
    icon: '#close',
    click: () => {
      chatStore.chatMessageList.forEach((msg) => (msg.isCheck = false))
      useMitt.emit(MittEnum.MSG_MULTI_CHOOSE, false)
    }
  }
]

const handleRemoveSession = (roomId: string) => {
  const session = chatStore.sessionList.find((session) => session.roomId === roomId)
  if (session) {
    session.isCheck = false
  }
}

const sendMsg = () => {}
</script>
<style>
.n-divider:not(.n-divider--vertical) {
  margin: 10px 0;
}
</style>
