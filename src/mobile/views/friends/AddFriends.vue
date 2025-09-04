<template>
  <div class="flex w-full flex-col gap-3">
    <!-- 键盘蒙板 -->
    <div
      v-if="showKeyboardMask"
      class="keyboard-mask flex-1"
      @touchstart.stop.prevent="closeKeyboardMask"
      @click.stop.prevent="closeKeyboardMask"></div>

    <div class="px-16px mt-5px flex gap-3">
      <div class="flex-1 py-5px shrink-0">
        <n-input
          id="search"
          class="rounded-10px w-full bg-gray-100 relative text-14px"
          :maxlength="20"
          clearable
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="输入用户名字/账号搜索~"
          @focus="lockScroll"
          @blur="unlockScroll">
          <template #prefix>
            <svg class="w-12px h-12px"><use href="#search"></use></svg>
          </template>
        </n-input>
      </div>

      <div class="flex justify-end items-center">
        <n-button class="py-5px">搜索</n-button>
      </div>
    </div>

    <div
      ref="scrollArea"
      id="scrollArea"
      :style="{ height: scrollHeight + 'px' }"
      class="px-16px overflow-y-auto scroll-auto h-100px">
      <div class="flex flex-1 flex-col gap-2">
        <n-tabs type="segment" animated class="mt-4px">
          <!-- 用户 -->
          <n-tab-pane name="1" tab="用户">
            <div class="flex justify-between items-center mb-2">
              <span class="font-bold"></span>
              <span class="text-(10px #707070)">{{ onlineCount }}/{{ contactStore.contactsList.length }}</span>
            </div>
            <n-scrollbar style="max-height: calc(100vh - 220px)">
              <div @contextmenu.stop="$event.preventDefault()">
                <n-flex
                  :size="10"
                  @click="handleClick(item.uid, RoomTypeEnum.SINGLE)"
                  :class="{ active: activeItem === item.uid }"
                  class="item-box w-full h-75px mb-5px"
                  v-for="item in sortedContacts"
                  :key="item.uid">
                  <n-flex
                    align="center"
                    justify="space-between"
                    :size="10"
                    class="h-75px pl-6px pr-8px flex-1 truncate">
                    <!-- 左边用户信息 -->
                    <n-flex align="center" :size="10" class="flex-1 truncate">
                      <n-avatar
                        round
                        style="border: 1px solid var(--avatar-border-color)"
                        :size="44"
                        class="grayscale"
                        :class="{ 'grayscale-0': item.activeStatus === OnlineEnum.ONLINE }"
                        :src="AvatarUtils.getAvatarUrl(groupStore.getUserInfo(item.uid)?.avatar!)"
                        fallback-src="/logo.png" />

                      <n-flex vertical justify="space-between" class="h-fit flex-1 truncate">
                        <span class="text-14px leading-tight flex-1 truncate">
                          {{ groupStore.getUserInfo(item.uid)?.name }}
                        </span>
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

                    <!-- 右边操作按钮 -->
                    <n-button size="small" @click.stop="addFriend(item.uid)">添加</n-button>
                  </n-flex>
                </n-flex>
              </div>
            </n-scrollbar>
          </n-tab-pane>

          <!-- 群聊 -->
          <n-tab-pane name="2" tab="群聊">
            <div class="flex justify-between items-center mb-2">
              <span class="font-bold"></span>
              <span class="text-(10px #707070)">{{ groupChatList.length }}</span>
            </div>
            <n-scrollbar style="max-height: calc(100vh - 220px)">
              <div
                @click="handleClick(item.roomId, RoomTypeEnum.GROUP)"
                :class="{ active: activeItem === item.roomId }"
                class="item-box w-full h-75px mb-5px"
                v-for="item in groupChatList"
                :key="item.roomId">
                <n-flex align="center" justify="space-between" :size="10" class="h-75px pl-6px pr-8px flex-1 truncate">
                  <!-- 左边群聊信息 -->
                  <n-flex align="center" :size="10" class="flex-1 truncate">
                    <n-avatar
                      round
                      style="border: 1px solid var(--avatar-border-color)"
                      bordered
                      :size="44"
                      :src="AvatarUtils.getAvatarUrl(item.avatar)"
                      fallback-src="/logo.png" />
                    <span class="text-14px leading-tight flex-1 truncate">{{ item.remark }}</span>
                  </n-flex>

                  <!-- 右边操作按钮 -->
                  <n-button size="small" @click.stop="joinGroup(item.roomId)">添加</n-button>
                </n-flex>
              </div>
            </n-scrollbar>
          </n-tab-pane>
        </n-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { MittEnum, OnlineEnum, RoomTypeEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useGroupStore } from '@/stores/group'
import { useMobileStore } from '@/stores/mobile'
import { useUserStatusStore } from '@/stores/userStatus'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { calculateElementPosition } from '@/utils/DomCalculate'

const scrollArea = ref<HTMLDivElement>()

const mobileStore = useMobileStore()

const scrollHeight = ref(700) // 默认高度

onMounted(async () => {
  try {
    const scrollAreaRect = await calculateElementPosition(scrollArea)
    scrollHeight.value = window.innerHeight - scrollAreaRect!.y - mobileStore.safeArea.bottom
  } catch (error) {
    console.log('计算[scrollArea]高度失败:', error)
  }
})

// 锁滚动（和蒙板一样）
const lockScroll = () => {
  const scrollEl = document.querySelector('#scrollArea') as HTMLElement
  if (scrollEl) {
    scrollEl.style.overflow = 'hidden'
  }
}

const unlockScroll = () => {
  const scrollEl = document.querySelector('#scrollArea') as HTMLElement
  if (scrollEl) {
    scrollEl.style.overflow = 'auto'
  }
}

// 键盘蒙板显示状态
const showKeyboardMask = ref(false)

const closeKeyboardMask = () => {
  showKeyboardMask.value = false
  document.body.style.overflow = ''
  document.body.style.position = ''
  // 让 input 失焦
  const activeEl = document.activeElement as HTMLElement
  if (activeEl && typeof activeEl.blur === 'function') {
    activeEl.blur()
  }
}

const addFriend = (_item: any) => {}

const joinGroup = (_item: any) => {}

/** 建议把此状态存入localStorage中 */
const activeItem = ref('')
const detailsShow = ref(false)
const shrinkStatus = ref(false)
const contactStore = useContactStore()
const groupStore = useGroupStore()
const userStatusStore = useUserStatusStore()
const { stateList } = storeToRefs(userStatusStore)

/** 群聊列表 */
const groupChatList = computed(() => {
  return [...groupStore.groupDetails].sort((a, b) => {
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

/** 获取用户状态 */
const getUserState = (uid: string) => {
  const userInfo = groupStore.getUserInfo(uid)!
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

const chatStore = useChatStore()

const getSessionList = async () => {
  await chatStore.getSessionList(true)
}

onMounted(() => {
  getSessionList()
})
</script>

<style lang="scss" scoped></style>
