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
      <p class="text-(14px --text-color) font-bold">群公告须知</p>

      <p class="text-(12px #909090) leading-5 line-clamp-4">
        请不要把重要信息发到该群（功能暂时还未完善），网络不是法外之地，请遵守网络规范，否则直接删除。
      </p>
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
      :item-size="42"
      :items="filteredUserList">
      <template #default="{ item }">
        <n-popover
          @update:show="handlePopoverUpdate(item.uid)"
          trigger="click"
          placement="left"
          :show-arrow="false"
          v-model:show="infoPopover"
          style="padding: 0; background: var(--bg-info); backdrop-filter: blur(10px)">
          <template #trigger>
            <ContextMenu
              :content="item"
              @select="$event.click(item, 'Sidebar')"
              :menu="optionsList"
              :special-menu="report">
              <n-flex @click="selectKey = item.uid" :key="item.uid" :size="10" align="center" class="item">
                <n-avatar
                  lazy
                  round
                  class="grayscale"
                  :class="{ 'grayscale-0': item.activeStatus === OnlineEnum.ONLINE }"
                  :color="'#fff'"
                  :size="24"
                  :src="AvatarUtils.getAvatarUrl(item.avatar)"
                  fallback-src="/logo.png"
                  :render-placeholder="() => null"
                  :intersection-observer-options="{
                    root: '#image-chat-sidebar'
                  }" />
                <span class="text-12px truncate flex-1">{{ item.name }}</span>
                <div v-if="item.uid === 1" class="flex p-4px rounded-4px bg-#f5dadf size-fit select-none">
                  <span class="text-(10px #d5304f)">群主</span>
                </div>
                <div v-if="item.uid === 2" class="flex p-4px rounded-4px bg-#13987F66 size-fit select-none">
                  <span class="text-(10px #13987f)">管理员</span>
                </div>
              </n-flex>
            </ContextMenu>
          </template>
          <!-- 用户个人信息框 -->
          <InfoPopover v-if="selectKey === item.uid" :uid="item.uid" />
        </n-popover>
      </template>
    </n-virtual-list>
  </main>
</template>
<script setup lang="ts">
import { MittEnum, OnlineEnum, RoomTypeEnum } from '@/enums'
import { InputInst } from 'naive-ui'
import { usePopover } from '@/hooks/usePopover.ts'
import { useChatMain } from '@/hooks/useChatMain.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useGroupStore } from '@/stores/group.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { useGlobalStore } from '@/stores/global.ts'
import type { UserItem } from '@/services/types.ts'
import { useDebounceFn } from '@vueuse/core'
import { AvatarUtils } from '@/utils/avatarUtils'
import { useCachedStore } from '~/src/stores/cached'

const groupStore = useGroupStore()
const globalStore = useGlobalStore()
const cachedStore = useCachedStore()
const groupUserList = computed(() => groupStore.userList)
const userList = computed(() => {
  return groupUserList.value
    .map((item: UserItem) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { uid, ...userInfo } = item // 排除uid，获取剩余内容
      return {
        ...userInfo,
        ...useUserInfo(item.uid).value
      }
    })
    .sort((a, b) => {
      return a.activeStatus - b.activeStatus // 升序排序
    })
})
const filteredUserList = shallowRef(userList.value)
const isGroup = computed(() => globalStore.currentSession?.type === RoomTypeEnum.GROUP)
/** 是否是搜索模式 */
const isSearch = ref(false)
const searchRef = ref('')
/** 手动触发Popover显示 */
const infoPopover = ref(false)
const inputInstRef = ref<InputInst | null>(null)
const isCollapsed = ref(true)
const { optionsList, report, selectKey } = useChatMain()
const { handlePopoverUpdate } = usePopover(selectKey, 'image-chat-sidebar')

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

onMounted(() => {
  useMitt.on(`${MittEnum.INFO_POPOVER}-Sidebar`, (event: any) => {
    selectKey.value = event.uid
    infoPopover.value = true
    handlePopoverUpdate(event.uid)
  })
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/chat-sidebar';
</style>
