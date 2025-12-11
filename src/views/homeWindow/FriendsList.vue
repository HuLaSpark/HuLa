<template>
  <n-flex
    @click="handleApply('friend')"
    align="center"
    justify="space-between"
    class="my-10px p-12px hover:(bg-[--list-hover-color] cursor-pointer)">
    <div class="text-(14px [--text-color])">{{ t('home.friends_list.notice.friend') }}</div>
    <n-flex align="center" :size="4">
      <n-badge :value="globalStore.unReadMark.newFriendUnreadCount" :max="15" />
      <!-- <n-badge v-if="globalStore.unReadMark.newFriendUnreadCount > 0" dot color="#d5304f" /> -->
      <svg class="size-16px rotate-270 color-[--text-color]"><use href="#down"></use></svg>
    </n-flex>
  </n-flex>

  <n-flex
    @click="handleApply('group')"
    align="center"
    justify="space-between"
    class="my-10px p-12px hover:(bg-[--list-hover-color] cursor-pointer)">
    <div class="text-(14px [--text-color])">{{ t('home.friends_list.notice.group') }}</div>
    <n-flex align="center" :size="4">
      <n-badge :value="globalStore.unReadMark.newGroupUnreadCount" :max="15" />
      <!-- <n-badge v-if="globalStore.unReadMark.newGroupUnreadCount === 0" dot color="#d5304f" /> -->
      <svg class="size-16px rotate-270 color-[--text-color]"><use href="#down"></use></svg>
    </n-flex>
  </n-flex>
  <n-tabs type="segment" animated class="mt-4px p-[4px_10px_0px_8px]">
    <n-tab-pane name="1" :tab="t('home.friends_list.tabs.friend')">
      <n-collapse :display-directive="'show'" accordion :default-expanded-names="['1']">
        <ContextMenu @contextmenu="showMenu($event)" @select="handleSelect($event.label)" :menu="menuList">
          <n-collapse-item :title="t('home.friends_list.collapse.friend')" name="1">
            <template #header-extra>
              <span class="text-(10px #707070)">{{ onlineCount }}/{{ contactStore.contactsList.length }}</span>
            </template>
            <n-scrollbar style="max-height: calc(100vh / var(--page-scale, 1) - 270px)">
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
                      :class="{ 'grayscale-0': item.activeStatus === OnlineEnum.ONLINE || isBotUser(item.uid) }"
                      :src="AvatarUtils.getAvatarUrl(groupStore.getUserInfo(item.uid)!.avatar!)"
                      :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
                      :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'" />

                    <n-flex vertical justify="space-between" class="h-fit flex-1 truncate">
                      <span class="text-14px leading-tight flex-1 truncate">
                        {{ groupStore.getUserInfo(item.uid)!.name }}
                      </span>

                      <div class="text leading-tight text-12px flex-y-center gap-4px flex-1 truncate">
                        [
                        <template v-if="isBotUser(item.uid)">{{ t('home.friends_list.bot_tag') }}</template>
                        <template v-else-if="getUserState(item.uid)">
                          <img class="size-12px rounded-50%" :src="getUserState(item.uid)?.url" alt="" />
                          {{ translateStateTitle(getUserState(item.uid)?.title) }}
                        </template>
                        <template v-else>
                          <n-badge :color="item.activeStatus === OnlineEnum.ONLINE ? '#1ab292' : '#909090'" dot />
                          {{
                            item.activeStatus === OnlineEnum.ONLINE
                              ? t('home.friends_list.status.online')
                              : t('home.friends_list.status.offline')
                          }}
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
    <n-tab-pane name="2" :tab="t('home.friends_list.tabs.group')">
      <n-collapse :display-directive="'show'" accordion :default-expanded-names="['1']">
        <n-collapse-item :title="t('home.friends_list.collapse.group')" name="1">
          <template #header-extra>
            <span class="text-(10px #707070)">{{ groupChatList.length }}</span>
          </template>
          <n-scrollbar style="max-height: calc(100vh / var(--page-scale, 1) - 270px)">
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
                  :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
                  :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'" />

                <span class="text-14px leading-tight flex-1 truncate">{{ item.remark || item.groupName }}</span>
              </n-flex>
            </div>
          </n-scrollbar>
        </n-collapse-item>
      </n-collapse>
    </n-tab-pane>
  </n-tabs>
</template>
<script setup lang="ts" name="friendsList">
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { MittEnum, OnlineEnum, RoomTypeEnum, ThemeEnum, UserType } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import type { DetailsContent } from '@/services/types'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useGroupStore } from '@/stores/group'
import { useSettingStore } from '@/stores/setting'
import { useUserStatusStore } from '@/stores/userStatus'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { unreadCountManager } from '@/utils/UnreadCountManager'

const route = useRoute()
const { t } = useI18n()
const menuList = computed(() => [
  { label: t('home.friends_list.menu.add_group'), icon: 'plus' },
  { label: t('home.friends_list.menu.rename_group'), icon: 'edit' },
  { label: t('home.friends_list.menu.delete_group'), icon: 'delete' }
])
/** 建议把此状态存入localStorage中 */
const activeItem = ref('')
const detailsShow = ref(false)
const shrinkStatus = ref(false)
const contactStore = useContactStore()
const groupStore = useGroupStore()
const globalStore = useGlobalStore()
const userStatusStore = useUserStatusStore()
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
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
    const aIsBot = isBotUser(a.uid)
    const bIsBot = isBotUser(b.uid)
    if (aIsBot && !bIsBot) return -1
    if (!aIsBot && bIsBot) return 1
    if (a.activeStatus === OnlineEnum.ONLINE && b.activeStatus !== OnlineEnum.ONLINE) return -1
    if (a.activeStatus !== OnlineEnum.ONLINE && b.activeStatus === OnlineEnum.ONLINE) return 1
    return 0
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

const resetSelection = () => {
  detailsShow.value = false
  activeItem.value = ''
  useMitt.emit(MittEnum.DETAILS_SHOW, {
    context: undefined,
    detailsShow: false
  })
}

const handleApply = async (applyType: 'friend' | 'group') => {
  // 刷新好友申请列表
  await contactStore.getApplyPage(applyType, true, true)

  // 更新未读数
  if (applyType === 'friend') {
    globalStore.unReadMark.newFriendUnreadCount = 0
  } else {
    globalStore.unReadMark.newGroupUnreadCount = 0
  }
  unreadCountManager.refreshBadge(globalStore.unReadMark)

  useMitt.emit(MittEnum.APPLY_SHOW, {
    context: {
      type: 'apply',
      applyType
    } as DetailsContent
  })
  activeItem.value = ''
}

/** 获取联系人数据 */
const fetchContactData = async () => {
  try {
    // 同时获取好友列表和群聊列表
    await Promise.all([contactStore.getContactList()])
  } catch (error) {
    console.error('获取联系人数据失败:', error)
  }
}

const isBotUser = (uid: string) => groupStore.getUserInfo(uid)?.account === UserType.BOT
/** 获取用户状态 */
const getUserState = (uid: string) => {
  const userInfo = groupStore.getUserInfo(uid)
  const userStateId = userInfo?.userStateId

  if (userStateId && userStateId !== '1') {
    return stateList.value.find((state: { id: string }) => state.id === userStateId)
  }
  return null
}

const translateStateTitle = (title?: string) => {
  if (!title) return ''
  const key = `auth.onlineStatus.states.${title}`
  const translated = t(key)
  return translated === key ? title : translated
}

/** 监听路由变化，当切换到消息页面时重置选中状态 */
watch(
  () => route.path,
  (newPath) => {
    if (newPath.includes('/message')) {
      resetSelection()
    }
  },
  { immediate: false }
)

/** 组件挂载时获取数据 */
onMounted(async () => {
  useMitt.on(MittEnum.SHRINK_WINDOW, async (event) => {
    shrinkStatus.value = event as boolean
  })
  await fetchContactData()
})

onUnmounted(() => {
  resetSelection()
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
