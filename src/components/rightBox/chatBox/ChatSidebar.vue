<template>
  <!--! 这里最好不要使用n-flex,滚动高度会有问题  -->
  <main
    v-if="isGroup"
    :class="
      isCollapsed
        ? 'w-180px border-l-(1px solid [--right-chat-footer-line-color]) p-[12px_0_12px_6px] custom-shadow'
        : 'w-0 pr-1px'
    "
    class="item-box">
    <!-- 收缩按钮 -->
    <div
      @click.stop="isCollapsed = !isCollapsed"
      style="border-radius: 18px 0 0 18px"
      class="contraction transition-all duration-600 ease-in-out absolute top-35% left--14px cursor-pointer opacity-0 bg-#c8c8c833 h-60px w-14px">
      <svg :class="isCollapsed ? 'rotate-180' : 'rotate-0'" class="size-16px color-#909090 absolute top-38%">
        <use href="#left-arrow"></use>
      </svg>
    </div>

    <!-- 群公告 -->
    <n-flex vertical :size="14" class="px-4px py-10px">
      <n-flex
        align="center"
        justify="space-between"
        class="cursor-pointer"
        @click="handleOpenAnnoun(announNum === 0 && isAddAnnoun)">
        <p class="text-(14px --text-color) font-bold">群公告须知</p>
        <svg class="size-16px rotate-270 color-[--text-color]">
          <use v-if="announNum === 0 && isAddAnnoun" href="#plus"></use>
          <use v-else href="#down"></use>
        </svg>
      </n-flex>

      <n-scrollbar class="h-74px">
        <p class="text-(12px #909090) leading-6 line-clamp-4 max-w-99%" v-if="announNum === 0">
          请不要把重要信息发到该群，网络不是法外之地，请遵守网络规范，否则直接删除。
        </p>
        <p v-else class="announcement-text text-(12px #909090) leading-6 line-clamp-4 max-w-99% break-words">
          {{ announList.length > 0 ? announList[0]?.content : '' }}
        </p>
      </n-scrollbar>
    </n-flex>

    <n-flex v-if="!isSearch" align="center" justify="space-between" class="pr-8px pl-8px h-42px">
      <span class="text-14px">在线群聊成员&nbsp;{{ groupStore.countInfo.onlineNum }}</span>
      <svg @click="handleSelect" class="size-14px">
        <use href="#search"></use>
      </svg>
    </n-flex>
    <!-- 搜索框 -->
    <n-flex v-else align="center" class="pr-8px h-42px">
      <n-input
        :on-input="handleSearch"
        @blur="handleBlur"
        ref="inputInstRef"
        v-model:value="searchRef"
        clearable
        placeholder="搜索"
        type="text"
        size="tiny"
        class="h-26px w-95% lh-26px rounded-6px">
        <template #prefix>
          <svg class="w-12px h-12px">
            <use href="#search"></use>
          </svg>
        </template>
      </n-input>
    </n-flex>

    <!--  // TODO popover显示的时候去改变窗口的大小、当点击了半个选项的时候也会出现原生滚动条 (nyh -> 2024-03-25 05:04:37)  -->
    <!-- // TODO 如果popover显示就先暂时不让滚动，因为在n-scrollbar和n-virtual-list中使用当我点击最后一个选项时候n-popover位置不够导致出现原生滚动条 (nyh -> 2024-03-24 22:46:38) -->
    <!-- // TODO 如果直接使用n-virtual-list的滚动配上n-popover乎也没有这个bug，但是当点击倒数第二个的时候还是会出现滚动条 (nyh -> 2024-03-25 00:30:53)   -->
    <n-virtual-list
      id="image-chat-sidebar"
      style="max-height: calc(100vh - 260px)"
      item-resizable
      @scroll="handleScroll($event)"
      :item-size="46"
      :items="filteredUserList">
      <template #default="{ item }">
        <n-popover
          ref="infoPopover"
          @update:show="handlePopoverUpdate(item.uid, $event)"
          trigger="click"
          placement="left"
          :show-arrow="false"
          style="padding: 0; background: var(--bg-info)">
          <template #trigger>
            <ContextMenu
              :content="item"
              @select="$event.click(item, 'Sidebar')"
              :menu="optionsList"
              :special-menu="report">
              <n-flex
                @click="selectKey = item.uid"
                :key="item.uid"
                :size="10"
                align="center"
                justify="space-between"
                class="item">
                <n-flex align="center" :size="8" class="flex-1 truncate">
                  <n-avatar
                    round
                    class="grayscale"
                    :class="{ 'grayscale-0': item.activeStatus === OnlineEnum.ONLINE }"
                    :color="'#fff'"
                    :size="26"
                    :src="AvatarUtils.getAvatarUrl(item.avatar)" />
                  <n-flex vertical :size="2" class="flex-1 truncate">
                    <p :title="item.name" class="text-12px truncate flex-1">{{ item.name }}</p>
                    <n-flex
                      v-if="item.userStateId && getUserState(item.userStateId)"
                      align="center"
                      :size="4"
                      class="flex-1">
                      <img class="size-12px" :src="getUserState(item.userStateId)?.url" alt="" />
                      <span class="text-10px text-[--chat-text-color] truncate">
                        {{ getUserState(item.userStateId)?.title }}
                      </span>
                    </n-flex>
                  </n-flex>
                </n-flex>

                <div
                  v-if="item.roleId === RoleEnum.LORD"
                  class="flex px-4px bg-#d5304f30 py-3px rounded-4px size-fit select-none">
                  <p class="text-(10px #d5304f)">群主</p>
                </div>
                <div
                  v-if="item.roleId === RoleEnum.ADMIN"
                  class="flex px-4px bg-#1a7d6b30 py-3px rounded-4px size-fit select-none">
                  <p class="text-(10px #1a7d6b)">管理员</p>
                </div>
              </n-flex>
            </ContextMenu>
          </template>
          <!-- 用户个人信息框 -->
          <InfoPopover v-if="selectKey === item.uid" :uid="item.uid" :activeStatus="item.activeStatus" />
        </n-popover>
      </template>
    </n-virtual-list>
  </main>
</template>
<script setup lang="ts">
import { MittEnum, OnlineEnum, RoleEnum, RoomTypeEnum } from '@/enums'
import { InputInst } from 'naive-ui'
import { usePopover } from '@/hooks/usePopover.ts'
import { useChatMain } from '@/hooks/useChatMain.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useGroupStore } from '@/stores/group.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { useGlobalStore } from '@/stores/global.ts'
import type { UserItem } from '@/services/types.ts'
import { useDebounceFn } from '@vueuse/core'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useCachedStore } from '@/stores/cached.ts'
import { useUserStatusStore } from '@/stores/userStatus'
import { storeToRefs } from 'pinia'
import { useWindow } from '@/hooks/useWindow.ts'
import { useUserStore } from '@/stores/user'
import { WsResponseMessageType } from '@/services/wsType.ts'
import { useTauriListener } from '@/hooks/useTauriListener'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

const appWindow = WebviewWindow.getCurrent()
const { createWebviewWindow } = useWindow()
const groupStore = useGroupStore()
const globalStore = useGlobalStore()
const cachedStore = useCachedStore()
const userStore = useUserStore()
const { addListener } = useTauriListener()
const groupUserList = computed(() => groupStore.userList)
const userList = computed(() => {
  // 先获取所有需要的用户ID
  const userIds = groupUserList.value.map((item) => item.uid)

  // 确保所有用户信息都被加载
  if (userIds.length > 0) {
    cachedStore.getBatchUserInfo(userIds)
  }

  return groupUserList.value
    .map((item: UserItem) => {
      const cachedUser = useUserInfo(item.uid).value
      // 合并数据时保留所有需要的字段
      return {
        ...item, // 保留原始数据
        ...cachedUser, // 合并缓存的用户数据
        account: cachedUser.account || item.account, // 确保accountCode被保留
        uid: item.uid // 确保uid被保留
      }
    })
    .sort((a, b) => {
      // roleId === 1 的排在最前面
      // 首先按照roleId排序
      if (a.roleId !== b.roleId) {
        // roleId === 2 的排在第二位
        if (a.roleId === RoleEnum.LORD) return -1
        if (b.roleId === RoleEnum.LORD) return 1
        if (a.roleId === RoleEnum.ADMIN) return -1
        if (b.roleId === RoleEnum.ADMIN) return 1
      }
      // roleId相同时，按照activeStatus升序排序
      return a.activeStatus - b.activeStatus
    })
})
const filteredUserList = shallowRef(userList.value)
const isGroup = computed(() => globalStore.currentSession?.type === RoomTypeEnum.GROUP)
/** 是否是搜索模式 */
const isSearch = ref(false)
const searchRef = ref('')
/** 手动触发Popover显示 */
const infoPopover = ref()
const inputInstRef = ref<InputInst | null>(null)
const isCollapsed = ref(true)
const { optionsList, report, selectKey } = useChatMain()
const { handlePopoverUpdate, enableScroll } = usePopover(selectKey, 'image-chat-sidebar')
provide('popoverControls', { enableScroll })

const isLord = computed(() => {
  const currentUser = groupUserList.value.find((user) => user.uid === useUserStore().userInfo?.uid)
  return currentUser?.roleId === RoleEnum.LORD
})
const isAdmin = computed(() => {
  const currentUser = groupUserList.value.find((user) => user.uid === useUserStore().userInfo?.uid)
  return currentUser?.roleId === RoleEnum.ADMIN
})

/** 判断当前用户是否拥有id为6的徽章 并且是频道 */
const hasBadge6 = computed(() => {
  // 只有当 roomId 为 "1" 时才进行徽章判断（频道）
  if (globalStore.currentSession?.roomId !== '1') return false

  const currentUser = useUserInfo(userStore.userInfo?.uid).value
  return currentUser?.itemIds?.includes('6')
})

/** 群公告相关 */
const announList = ref<any[]>([])
const announNum = ref(0)
const isAddAnnoun = ref(false)

// 添加一个新的计算属性来合并用户列表
const mergedUserList = computed(() => {
  // 创建一个Map用于去重，使用uid作为key
  const userMap = new Map()

  // 首先添加在线用户列表
  userList.value.forEach((user) => {
    userMap.set(user.uid, user)
  })

  // 添加缓存的用户列表
  cachedStore.currentAtUsersList.forEach((cachedUser) => {
    if (!userMap.has(cachedUser.uid)) {
      // 如果用户不在在线列表中，添加到Map中
      // 为缓存用户添加默认的activeStatus
      userMap.set(cachedUser.uid, {
        ...cachedUser,
        activeStatus: OnlineEnum.OFFLINE
      })
    }
  })

  // 转换回数组并按在线状态排序
  return Array.from(userMap.values()).sort((a, b) => a.activeStatus - b.activeStatus)
})

// 修改watch监听器
watch(
  [userList, () => cachedStore.currentAtUsersList],
  () => {
    // 如果正在搜索，则应用搜索过滤
    if (searchRef.value) {
      filteredUserList.value = mergedUserList.value.filter((user) =>
        user.name.toLowerCase().includes(searchRef.value.toLowerCase())
      )
    } else {
      filteredUserList.value = userList.value
    }
  },
  { immediate: true }
)

/**
 * 监听搜索输入过滤用户
 * @param value 输入值
 */
const handleSearch = useDebounceFn((value: string) => {
  if (!value) {
    // 如果搜索框为空，只显示在线用户列表
    filteredUserList.value = userList.value
    return
  }

  // 从合并后的用户列表中搜索
  filteredUserList.value = mergedUserList.value.filter((user) => user.name.toLowerCase().includes(value.toLowerCase()))
}, 10)

/**
 * 重置搜索状态
 */
const handleBlur = () => {
  if (searchRef.value) return
  isSearch.value = false
  searchRef.value = ''
  // 重置为只显示在线用户列表
  filteredUserList.value = userList.value
}

/**
 * 处理滚动事件
 * @param event 滚动事件
 */
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  const isBottom = target.scrollHeight - target.scrollTop === target.clientHeight

  if (isBottom && !groupStore.userListOptions.loading) {
    groupStore.loadMoreGroupMembers()
  }
}

/**
 * 切换搜索模式并自动聚焦输入框
 */
const handleSelect = () => {
  isSearch.value = !isSearch.value
  nextTick(() => {
    inputInstRef.value?.select()
  })
}

/**
 * 打开群公告
 */
const handleOpenAnnoun = (isAdd: boolean) => {
  nextTick(async () => {
    const roomId = globalStore.currentSession?.roomId
    await createWebviewWindow(isAdd ? '新增群公告' : '查看群公告', `announList/${roomId}/${isAdd ? 0 : 1}`, 420, 620)
  })
}

/**
 * 加载群公告
 */
const handleLoadGroupAnnoun = async (roomId: string, reload: boolean) => {
  // 设置是否可以添加公告
  isAddAnnoun.value = isLord.value || isAdmin.value || hasBadge6.value!
  // 获取群公告列表
  const data = await cachedStore.getGroupAnnouncementList(roomId, 1, 10, reload)
  if (data) {
    announList.value = data.records
    // 处理置顶公告
    if (announList.value && announList.value.length > 0) {
      const topAnnouncement = announList.value.find((item: any) => item.top)
      if (topAnnouncement) {
        announList.value = [topAnnouncement, ...announList.value.filter((item: any) => !item.top)]
      }
    }
    announNum.value = parseInt(data.total || 0)
  }
}

/**
 * 初始化群公告所需要的信息
 */
const handleInitAnnoun = async (reload: boolean) => {
  // 初始化时获取群公告
  if (isGroup.value) {
    if (globalStore.currentSession?.roomId) {
      await groupStore.getGroupUserList(true, globalStore.currentSession.roomId)
    }
    const roomId = globalStore.currentSession?.roomId
    if (roomId) {
      await handleLoadGroupAnnoun(roomId, reload)
    }
  }
}

const userStatusStore = useUserStatusStore()
const { stateList } = storeToRefs(userStatusStore)

const getUserState = (stateId: string) => {
  return stateList.value.find((state: { id: string }) => state.id === stateId)
}

onMounted(async () => {
  useMitt.on(`${MittEnum.INFO_POPOVER}-Sidebar`, (event: any) => {
    selectKey.value = event.uid
    infoPopover.value.setShow(true)
    handlePopoverUpdate(event.uid)
  })

  addListener(
    appWindow.listen('announcementClear', async () => {
      announNum.value = 0
    })
  )

  addListener(
    appWindow.listen('announcementUpdated', async (event: any) => {
      if (event.payload) {
        const { hasAnnouncements, topAnnouncement } = event.payload
        if (hasAnnouncements && topAnnouncement) {
          // 更新公告列表显示
          announList.value = [topAnnouncement, ...(announList.value.filter((a) => a.id !== topAnnouncement.id) || [])]
          announNum.value = announList.value.length
        }
      }
    })
  )

  // 初始化时获取当前群组用户的信息
  if (groupUserList.value.length > 0) {
    await cachedStore.getBatchUserInfo(groupUserList.value.map((item) => item.uid))
    const handleAnnounInitOnEvent = (shouldReload: boolean) => {
      return async (event: any) => {
        if (shouldReload || event) {
          await handleInitAnnoun(shouldReload)
        }
      }
    }

    // 为不同事件注册处理函数
    // useMitt.on(MittEnum.MSG_BOX_SHOW, handleAnnounInitOnEvent(false))
    // 监听群公告消息
    useMitt.on(WsResponseMessageType.ROOM_GROUP_NOTICE_MSG, handleAnnounInitOnEvent(true))
    useMitt.on(WsResponseMessageType.ROOM_EDIT_GROUP_NOTICE_MSG, handleAnnounInitOnEvent(true))

    await handleInitAnnoun(true)
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/chat-sidebar';
</style>
