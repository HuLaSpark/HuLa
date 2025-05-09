<template>
  <n-flex
    @click="handleApply"
    align="center"
    justify="space-between"
    class="my-10px p-12px hover:(bg-[--list-hover-color] cursor-pointer)">
    <div class="text-(14px [--text-color])">好友通知</div>
    <n-flex align="center" :size="4">
      <n-badge :value="globalStore.unReadMark.newFriendUnreadCount" :max="15" />
      <n-badge
        v-if="hasPendingFriendRequests && globalStore.unReadMark.newFriendUnreadCount === 0"
        dot
        color="#d5304f" />
      <svg class="size-16px rotate-270 color-[--text-color]"><use href="#down"></use></svg>
    </n-flex>
  </n-flex>
  <n-tabs type="segment" animated class="mt-4px p-[4px_10px_0px_8px]">
    <n-tab-pane name="1" tab="好友">
      <n-collapse :display-directive="'show'" accordion :default-expanded-names="['1']">
        <ContextMenu @contextmenu="showMenu($event)" @select="handleSelect($event.label)" :menu="menuList">
          <n-collapse-item title="我的好友" name="1">
            <template #header-extra>
              <span class="text-(10px #707070)"> {{ onlineCount }}/{{ contactStore.contactsList.length }} </span>
            </template>
            <n-scrollbar style="max-height: calc(100vh - 220px)">
              <!-- 用户框 多套一层div来移除默认的右键事件然后覆盖掉因为margin空隙而导致右键可用 -->
              <div @contextmenu.stop="$event.preventDefault()">
                <n-flex
                  :size="10"
                  @click="handleClick(item.uid, RoomTypeEnum.SINGLE)"
                  :class="{ active: activeItem === item.uid }"
                  class="item-box w-full h-75px mb-5px"
                  v-for="item in sortedContacts"
                  :key="item.uid">
                  <n-flex align="center" :size="10" class="h-75px pl-6px pr-8px flex-1 truncate">
                    <n-avatar
                      round
                      style="border: 1px solid var(--avatar-border-color)"
                      :size="44"
                      class="grayscale"
                      :class="{ 'grayscale-0': item.activeStatus === OnlineEnum.ONLINE }"
                      :src="AvatarUtils.getAvatarUrl(useUserInfo(item.uid).value.avatar!)"
                      fallback-src="/logo.png" />

                    <n-flex vertical justify="space-between" class="h-fit flex-1 truncate">
                      <span class="text-14px leading-tight flex-1 truncate">{{
                        useUserInfo(item.uid).value.name
                      }}</span>

                      <div class="text leading-tight text-12px flex-y-center gap-4px flex-1 truncate">
                        [
                        <template v-if="getUserState(item.uid)">
                          <img class="size-12px rounded-50%" :src="getUserState(item.uid)?.url" alt="" />
                          {{ getUserState(item.uid)?.title }}
                        </template>
                        <template v-else>
                          <n-badge :color="item.activeStatus === OnlineEnum.ONLINE ? '#1ab292' : '#909090'" dot />
                          {{ item.activeStatus === OnlineEnum.ONLINE ? '在线' : '离线' }}
                        </template>
                        ]
                      </div>
                    </n-flex>
                  </n-flex>
                </n-flex>
              </div>
            </n-scrollbar>
          </n-collapse-item>
        </ContextMenu>
      </n-collapse>
    </n-tab-pane>
    <n-tab-pane name="2" tab="群聊">
      <n-collapse :display-directive="'show'" accordion :default-expanded-names="['1']">
        <n-collapse-item title="我的群聊" name="1">
          <template #header-extra>
            <span class="text-(10px #707070)">{{ groupChatList.length }} </span>
          </template>
          <n-scrollbar style="max-height: calc(100vh - 220px)">
            <div
              @click="handleClick(item.roomId, RoomTypeEnum.GROUP)"
              :class="{ active: activeItem === item.roomId }"
              class="item-box w-full h-75px mb-5px"
              v-for="item in groupChatList"
              :key="item.roomId">
              <n-flex align="center" :size="10" class="h-75px pl-6px pr-8px flex-1 truncate">
                <n-avatar
                  round
                  style="border: 1px solid var(--avatar-border-color)"
                  bordered
                  :size="44"
                  :src="AvatarUtils.getAvatarUrl(item.avatar)"
                  fallback-src="/logo.png" />

                <span class="text-14px leading-tight flex-1 truncate">{{ item.remark || item.roomName }}</span>
              </n-flex>
            </div>
          </n-scrollbar>
        </n-collapse-item>
      </n-collapse>
    </n-tab-pane>
  </n-tabs>
</template>
<script setup lang="ts" name="friendsList">
import { useMitt } from '@/hooks/useMitt.ts'
import { MittEnum, OnlineEnum, RoomTypeEnum } from '@/enums'
import { useContactStore } from '@/stores/contacts.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useGlobalStore } from '@/stores/global.ts'
import { useUserStatusStore } from '@/stores/userStatus'
import { storeToRefs } from 'pinia'
import { RequestFriendAgreeStatus } from '@/services/types'
import { useUserStore } from '@/stores/user'

const menuList = ref([
  { label: '添加分组', icon: 'plus' },
  { label: '重命名该组', icon: 'edit' },
  { label: '删除分组', icon: 'delete' }
])
/** 建议把此状态存入localStorage中 */
const activeItem = ref('')
const detailsShow = ref(false)
const shrinkStatus = ref(false)
const contactStore = useContactStore()
const globalStore = useGlobalStore()
const userStatusStore = useUserStatusStore()
const userStore = useUserStore()
const { stateList } = storeToRefs(userStatusStore)

/** 是否有待处理的好友申请 */
const hasPendingFriendRequests = computed(() => {
  return contactStore.requestFriendsList.some(
    (item) => item.status === RequestFriendAgreeStatus.Waiting && item.uid !== userStore.userInfo.uid
  )
})

/** 群聊列表 */
const groupChatList = computed(() => {
  console.log(contactStore.groupChatList)
  return [...contactStore.groupChatList].sort((a, b) => {
    // 将roomId为'1'的群聊排在最前面
    if (a.roomId === '1' && b.roomId !== '1') return -1
    if (a.roomId !== '1' && b.roomId === '1') return 1
    return 0
  })
})
/** 统计在线用户人数 */
const onlineCount = computed(() => {
  return contactStore.contactsList.filter((item) => item.activeStatus === OnlineEnum.ONLINE).length
})
/** 排序好友列表 */
const sortedContacts = computed(() => {
  return [...contactStore.contactsList].sort((a, b) => {
    // 在线用户排在前面
    if (a.activeStatus === OnlineEnum.ONLINE && b.activeStatus !== OnlineEnum.ONLINE) return -1
    if (a.activeStatus !== OnlineEnum.ONLINE && b.activeStatus === OnlineEnum.ONLINE) return 1
    return 0
  })
})
/** 监听独立窗口关闭事件 */
watchEffect(() => {
  useMitt.on(MittEnum.SHRINK_WINDOW, async (event) => {
    shrinkStatus.value = event as boolean
  })
})

const handleClick = (index: string, type: number) => {
  detailsShow.value = true
  activeItem.value = index
  const data = {
    context: {
      type: type,
      uid: index
    },
    detailsShow: detailsShow.value
  }
  useMitt.emit(MittEnum.DETAILS_SHOW, data)
}
// todo 需要循环数组来展示分组
const showMenu = (event: MouseEvent) => {
  console.log(event)
}

const handleSelect = (event: MouseEvent) => {
  console.log(event)
}

const handleApply = () => {
  useMitt.emit(MittEnum.APPLY_SHOW, {
    context: {
      type: 'apply'
    }
  })
  activeItem.value = ''
}

/** 获取用户状态 */
const getUserState = (uid: string) => {
  const userInfo = useUserInfo(uid).value
  const userStateId = userInfo.userStateId

  if (userStateId && userStateId !== '1') {
    return stateList.value.find((state: { id: string }) => state.id === userStateId)
  }
  return null
}

onUnmounted(() => {
  detailsShow.value = false
  useMitt.emit(MittEnum.DETAILS_SHOW, detailsShow.value)
})
</script>

<style scoped lang="scss">
.item-box {
  color: var(--text-color);
  .text {
    color: #808080;
  }
  &:not(.active):hover {
    background: var(--bg-msg-hover);
    border-radius: 12px;
    cursor: pointer;
  }
}

.active {
  background: var(--msg-active-color);
  border-radius: 12px;
  color: #fff;
  .text {
    color: #fff;
  }
}

:deep(.n-collapse .n-collapse-item:not(:first-child)) {
  border: none;
}
:deep(.n-collapse .n-collapse-item) {
  margin: 6px 0 0;
}
</style>
