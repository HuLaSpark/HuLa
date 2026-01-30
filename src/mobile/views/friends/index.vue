<template>
  <div class="flex flex-col overflow-auto h-full relative">
    <img
      src="@/assets/mobile/chat-home/background.webp"
      class="absolute fixed top-0 left-0 w-full h-full z-0 dark:opacity-20" />
    <!-- 页面蒙板 -->
    <div
      v-if="showMask"
      @touchend="maskHandler.close"
      @click="maskHandler.close"
      class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999] transition-all duration-3000 ease-in-out opacity-100"></div>

    <!-- 导航条 -->
    <NavBar>
      <template #center>
        <n-text>{{ t('mobile_contact.title') }}</n-text>
      </template>
      <template #right>
        <n-dropdown
          @on-clickoutside="addIconHandler.clickOutside"
          @select="addIconHandler.select"
          trigger="click"
          :show-arrow="true"
          :options="uiViewsData.addOptions">
          <n-button round strong secondary @click="addIconHandler.open">
            <template #icon>
              <n-icon>
                <svg><use href="#plus"></use></svg>
              </n-icon>
            </template>
          </n-button>
        </n-dropdown>
      </template>
    </NavBar>

    <!-- 输入框 -->
    <div class="px-16px mt-2 mb-12px z-1">
      <n-input
        id="search"
        class="rounded-6px w-full relative text-12px"
        :maxlength="20"
        clearable
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        :placeholder="t('mobile_contact.input.search')">
        <template #prefix>
          <svg class="w-12px h-12px"><use href="#search"></use></svg>
        </template>
      </n-input>
    </div>

    <n-card
      :segmented="{ content: true, footer: 'soft' }"
      :bordered="false"
      class="custom-rounded flex-1"
      header-class="py-15px! px-16px! text-14px!"
      :title="t('mobile_contact.my_chat')">
      <template #header-extra>
        <div @click="toMessage" class="h-full flex items-center justify-end">
          <span
            v-if="contactUnreadCount > 0"
            class="px-4px py-4px rounded-999px bg-#c14053 text-white text-12px font-600 min-w-20px text-center">
            {{ contactUnreadCount > 99 ? '99+' : contactUnreadCount }}
          </span>
        </div>
        <div @click="toMessage" class="h-full flex justify-end items-center">
          <img src="@/assets/mobile/friend/right-arrow.webp" class="block h-20px dark:invert" alt="" />
        </div>
      </template>

      <n-tabs type="segment" animated class="mt-4px p-[4px_10px_0px_8px]">
        <n-tab-pane name="1" :tab="t('mobile_contact.tab.contacts')">
          <n-collapse :display-directive="'show'" accordion :default-expanded-names="['1']">
            <ContextMenu @contextmenu="showMenu($event)" @select="handleSelect($event.label)" :menu="menuList">
              <n-collapse-item :title="t('mobile_contact.friend.title')" name="1">
                <template #header-extra>
                  <span class="text-(10px #707070)">{{ onlineCount }}/{{ contactStore.contactsList.length }}</span>
                </template>
                <n-scrollbar style="max-height: calc(100vh - (340px + var(--safe-area-inset-top)))">
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
                          :src="AvatarUtils.getAvatarUrl(groupStore.getUserInfo(item.uid)?.avatar!)"
                          fallback-src="/logo.png" />

                        <n-flex vertical justify="space-between" class="h-fit flex-1 truncate">
                          <span class="text-14px leading-tight flex-1 truncate">
                            {{ groupStore.getUserInfo(item.uid)?.name }}
                          </span>

                          <div class="text leading-tight text-12px flex-y-center gap-4px flex-1 truncate">
                            [
                            <template v-if="isBotUser(item.uid)">助手</template>
                            <template v-else-if="getUserState(item.uid)">
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
        <n-tab-pane name="2" :tab="t('mobile_contact.tab.group')">
          <n-collapse :display-directive="'show'" accordion :default-expanded-names="['1']">
            <n-collapse-item :title="t('mobile_contact.group.title')" name="1">
              <template #header-extra>
                <span class="text-(10px #707070)">{{ groupChatList.length }}</span>
              </template>
              <n-scrollbar style="max-height: calc(100vh - (340px + var(--safe-area-inset-top)))">
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

                    <span class="text-14px leading-tight flex-1 truncate">{{ item.remark || item.groupName }}</span>
                  </n-flex>
                </div>
              </n-scrollbar>
            </n-collapse-item>
          </n-collapse>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>
<style scoped>
.custom-rounded {
  border-top-left-radius: 20px; /* 左上角 */
  border-top-right-radius: 20px;
  overflow: hidden;
}
</style>
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import NavBar from '#/layout/navBar/index.vue'
import addFriendIcon from '@/assets/mobile/chat-home/add-friend.webp'
import groupChatIcon from '@/assets/mobile/chat-home/group-chat.webp'
import { MittEnum, OnlineEnum, RoomTypeEnum, UserType } from '@/enums'
import { useMessage } from '@/hooks/useMessage.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import router from '@/router'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { useUserStatusStore } from '@/stores/userStatus'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
/**
 * 渲染图片图标的函数工厂
 * @param {string} src - 图标图片路径
 * @returns {() => import('vue').VNode} 返回一个渲染图片的函数组件
 */
const renderImgIcon = (src: string) => {
  return () =>
    h('img', {
      src,
      style: 'display:block; width: 24px; height: 24px; vertical-align: middle',
      class: 'dark:invert'
    })
}

/**
 * UI 视图数据，包含菜单选项及其图标
 * @type {import('vue').Ref<{ addOptions: { label: string; key: string; icon: () => import('vue').VNode }[] }>}
 */
const uiViewsData = ref({
  addOptions: [
    {
      label: t('menu.start_group_chat'),
      key: '/mobile/mobileFriends/startGroupChat',
      icon: renderImgIcon(groupChatIcon)
    },
    {
      label: t('menu.add_contact'),
      key: '/mobile/mobileFriends/addFriends',
      icon: renderImgIcon(addFriendIcon)
    }
  ]
})

const menuList = ref([
  { label: '添加分组', icon: 'plus' },
  { label: '重命名该组', icon: 'edit' },
  { label: '删除分组', icon: 'delete' }
])
/** 建议把此状态存入localStorage中 */
const activeItem = ref('')
const detailsShow = ref(false)
const shrinkStatus = ref(false)
const groupStore = useGroupStore()
const globalStore = useGlobalStore()
const contactStore = useContactStore()
const userStatusStore = useUserStatusStore()
const { stateList } = storeToRefs(userStatusStore)

const contactUnreadCount = computed(
  () => globalStore.unReadMark.newFriendUnreadCount + globalStore.unReadMark.newGroupUnreadCount
)

const toMessage = async () => {
  try {
    await Promise.all([contactStore.getApplyPage('friend', true, true), contactStore.getApplyPage('group', true, true)])
    await contactStore.getApplyUnReadCount()
  } catch (error) {
    console.error('刷新通知并标记已读失败', error)
    window.$message?.error?.('刷新通知失败，请稍后再试')
  } finally {
    router.push('/mobile/mobileMy/myMessages')
  }
}

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

const { preloadChatRoom } = useMessage()

const isBotUser = (uid: string) => groupStore.getUserInfo(uid)?.account === UserType.BOT

/**
 *
 * @param uid 群聊id或好友uid
 * @param type 1 群聊 2 单聊
 */
const handleClick = async (id: string, type: number) => {
  detailsShow.value = true
  activeItem.value = id
  const data = {
    context: {
      type: type,
      uid: id
    },
    detailsShow: detailsShow.value
  }
  useMitt.emit(MittEnum.DETAILS_SHOW, data)

  if (type === 1) {
    try {
      await preloadChatRoom(id)
      router.push(`/mobile/chatRoom/chatMain`)
    } catch (error) {
      console.error(error)
    }
  } else {
    router.push(`/mobile/mobileFriends/friendInfo/${id}`)
  }
}

// todo 需要循环数组来展示分组
const showMenu = (event: MouseEvent) => {
  console.log(event)
}

const handleSelect = (event: MouseEvent) => {
  console.log(event)
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

onMounted(async () => {
  useMitt.on(MittEnum.SHRINK_WINDOW, async (event) => {
    shrinkStatus.value = event as boolean
  })
  try {
    await contactStore.getContactList(true)
    await contactStore.getApplyPage('friend', false)
  } catch (error) {
    console.log('请求好友申请列表失败')
  }
})

onUnmounted(() => {
  detailsShow.value = false
  useMitt.emit(MittEnum.DETAILS_SHOW, detailsShow.value)
})

/**
 * 页面蒙板显示状态
 * @type {import('vue').Ref<boolean>}
 */
const showMask = ref(false)

/**
 * 当前页面滚动的纵向位置，避免打开蒙板时页面跳动
 * @type {number}
 */
let scrollY = 0

/**
 * 控制页面蒙板的对象，包含打开和关闭方法
 */
const maskHandler = {
  /**
   * 打开蒙板，并锁定滚动位置
   */
  open: () => {
    scrollY = window.scrollY
    showMask.value = true
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
  },

  /**
   * 关闭蒙板，恢复滚动状态和位置
   */
  close: () => {
    setTimeout(() => {
      showMask.value = false
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY) // 恢复滚动位置
    }, 200)
  }
}

/**
 * 添加按钮相关事件处理对象
 */
const addIconHandler = {
  /**
   * 选项选择时关闭蒙板
   */
  select: (item: string) => {
    console.log('选择的项：', item)
    router.push(item)
    maskHandler.close()
  },

  /**
   * 点击加号按钮打开蒙板
   */
  open: () => {
    maskHandler.open()
  },

  /**
   * 点击下拉菜单外部区域关闭蒙板
   */
  clickOutside: () => {
    maskHandler.close()
  }
}
</script>
