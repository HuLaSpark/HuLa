<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-#FAFAFA"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        :room-name="title + '设置'" />
    </template>

    <template #container="{ changedHeight }">
      <img src="@/assets/mobile/chat-home/background.webp" class="w-100% relative top-0 z-1" alt="hula" />
      <div :style="{ height: changedHeight + 'px' }" class="z-2 absolute flex flex-col overflow-auto min-h-70vh w-full">
        <div class="flex flex-col gap-15px py-15px px-20px">
          <div class="flex shadow bg-white rounded-10px w-full h-60px items-center gap-10px">
            <!-- 群头像 -->
            <div class="flex justify-center">
              <div
                class="rounded-full relative bg-white w-38px h-38px overflow-hidden"
                style="margin-left: 10px"
                @click="openAvatarCropper">
                <n-avatar
                  class="absolute"
                  :size="38"
                  :src="AvatarUtils.getAvatarUrl(globalStore.currentSession.avatar!)"
                  fallback-src="/logo.png"
                  :style="{
                    'object-fit': 'cover',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }"
                  round />
              </div>
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="handleFileChange" />
              <AvatarCropper
                ref="cropperRef"
                v-model:show="showCropper"
                :image-url="localImageUrl"
                @crop="handleCrop" />
            </div>

            <div class="text-14px flex items-center h-full gap-5px">
              <span>
                {{ globalStore.currentSession.name }}
              </span>
              <span v-if="globalStore.currentSession.hotFlag === 1">
                <svg class="w-18px h-18px iconpark-icon text-#1A9B83">
                  <use href="#auth"></use>
                </svg>
              </span>
            </div>
          </div>
          <!-- 群成员  -->
          <div v-if="isGroup" class="bg-white rounded-10px max-w-full p-[5px_10px_5x_10px] shadow">
            <div class="p-[15px_15px_0px_15px] flex flex-col">
              <!-- 群号 -->
              <div class="flex justify-between items-center">
                <div class="text-14px">群聊成员</div>
                <div class="text-12px text-#6E6E6E flex flex-wrap gap-10px items-center">
                  <div>
                    有
                    <span class="text-#398D7E">{{ groupStore.countInfo?.memberNum || 0 }}</span>
                    位成员
                  </div>
                  <div>
                    <svg class="w-14px h-14px iconpark-icon">
                      <use href="#right"></use>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div class="py-15px px-5px grid grid-cols-5 gap-15px text-12px">
              <div
                v-for="i in groupMemberListSliced"
                :key="i.uid"
                class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full relative bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <!-- 蒙板 -->
                  <div
                    v-if="i.activeStatus !== OnlineEnum.ONLINE"
                    class="w-36px h-36px absolute rounded-full bg-#707070 opacity-70 z-4"></div>
                  <n-avatar class="absolute z-3" :size="36" :src="avatarSrc(i.avatar)" fallback-src="/logo.png" round />
                </div>
                <div class="truncate max-w-full text-#707070">{{ i.name }}</div>
              </div>
              <div class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <svg class="iconpark-icon h-25px w-25px">
                    <use href="#plus"></use>
                  </svg>
                </div>
                <div>邀请</div>
              </div>
            </div>
          </div>
          <!-- 群公告 -->
          <div class="flex bg-white rounded-10px w-full h-auto shadow">
            <div class="px-15px flex flex-col w-full">
              <!-- 群号 -->
              <div
                style="border-bottom: 1px solid; border-color: #ebebeb"
                @click="handleCopy(globalStore.currentSession.account)"
                class="flex justify-between py-15px items-center">
                <div class="text-14px">{{ isGroup ? '群号/二维码' : 'Hula号/二维码' }}</div>
                <div class="text-12px text-#6E6E6E flex flex-wrap gap-10px items-center">
                  <div>{{ globalStore.currentSession.account }}</div>
                  <div>
                    <svg class="w-14px h-14px iconpark-icon">
                      <use href="#saoma-i3589iic"></use>
                    </svg>
                  </div>
                </div>
              </div>

              <!-- 公告内容 -->
              <div @click="goToNotice" v-if="isGroup" class="pt-15px flex flex-col text-14px gap-10px">
                <div>群公告</div>
                <div class="text-#707070 line-clamp-2 text-12px line-height-20px">
                  {{ announList.length > 0 ? announList[0]?.content : '' }}
                </div>
              </div>

              <div v-if="groupStore.isAdminOrLord()" class="flex justify-between py-15px items-center">
                <div class="text-14px">本群昵称</div>
                <div class="text-12px text-#6E6E6E flex flex-wrap gap-10px items-center">
                  <input
                    style="
                      height: 17px;
                      border: none;
                      text-align: right;
                      outline: none;
                      font-size: 14px;
                      text-align: right;
                    "
                    v-model="nameValue"
                    @blur="handleGroupInfoUpdate"
                    placeholder="请输入群昵称" />
                </div>
              </div>

              <div v-if="isGroup" class="flex justify-between py-15px items-center">
                <div class="text-14px">我的群昵称</div>
                <div class="text-12px text-#6E6E6E flex flex-wrap gap-10px items-center">
                  <input
                    style="
                      height: 17px;
                      border: none;
                      text-align: right;
                      outline: none;
                      font-size: 14px;
                      text-align: right;
                    "
                    v-model="nicknameValue"
                    @blur="handleInfoUpdate"
                    placeholder="请输入我的群昵称" />
                </div>
              </div>
            </div>
          </div>
          <!-- 备注 -->
          <div class="w-full flex flex-col gap-15px rounded-10px">
            <div class="ps-15px text-14px">
              <span>{{ title + '备注' }}</span>
              <span class="text-#6E6E6E">（仅自己可见）</span>
            </div>
            <div class="rounded-10px flex w-full bg-white shadow">
              <div class="w-full px-15px">
                <input
                  v-model="remarkValue"
                  class="h-50px w-full"
                  style="border: none; outline: none; font-size: 14px"
                  :placeholder="'请输入' + title + '备注'"
                  @blur="handleInfoUpdate" />
              </div>
            </div>
          </div>
          <div class="flex bg-white rounded-10px w-full h-auto shadow">
            <div class="px-15px flex flex-col w-full">
              <div class="pt-15px text-14px text-#6E6E6E">{{ title }}设置</div>
              <!-- 群号 -->
              <div
                style="border-bottom: 1px solid; border-color: #ebebeb"
                class="flex justify-between py-12px items-center">
                <div class="text-14px">设置为置顶</div>
                <n-switch :value="activeItem.top" @update:value="handleTop" />
              </div>
              <div
                style="border-bottom: 1px solid; border-color: #ebebeb"
                class="flex justify-between py-12px items-center">
                <div class="text-14px">消息免打扰</div>
                <n-switch :value="activeItem.muteNotification === NotificationTypeEnum.NOT_DISTURB" />
              </div>
            </div>
          </div>
          <div class="flex shadow bg-white cursor-pointer text-red text-14px rounded-10px w-full">
            <div class="p-15px">删除聊天记录</div>
          </div>
          <!-- 解散群聊、退出群聊、删除好友按钮 -->
          <div v-if="isGroup && globalStore.currentSession.roomId !== '1'" class="mt-auto flex justify-center mb-20px">
            <n-button type="error" @click="handleExit">
              {{ isGroup ? (isLord ? '解散群聊' : '退出群聊') : '删除好友' }}
            </n-button>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { MittEnum, NotificationTypeEnum, OnlineEnum, RoleEnum, RoomTypeEnum } from '@/enums'
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import { useMitt } from '@/hooks/useMitt.ts'
import router from '@/router'
import type { UserItem } from '@/services/types'
import { useCachedStore } from '@/stores/cached'
import { useChatStore } from '@/stores/chat.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { deleteFriend, getGroupDetail, modifyFriendRemark, setSessionTop, updateRoomInfo } from '@/utils/ImRequestUtils'

const dialog = useDialog()
const userStore = useUserStore()
const chatStore = useChatStore()
const globalStore = useGlobalStore()
const groupStore = useGroupStore()
const cacheStore = useCachedStore()
const contactStore = useContactStore()

const title = computed(() => (isGroup.value ? '群' : '好友'))
const isGroup = computed(() => globalStore.currentSession?.type === RoomTypeEnum.GROUP)

const isLord = computed(() => {
  const currentUser = groupStore.userList.find((user) => user.uid === useUserStore().userInfo?.uid)
  return currentUser?.roleId === RoleEnum.LORD
})
const isAdmin = computed(() => {
  const currentUser = groupStore.userList.find((user) => user.uid === useUserStore().userInfo?.uid)
  return currentUser?.roleId === RoleEnum.ADMIN
})

const groupMemberListSliced = computed(() => {
  const list = groupStore.memberList.slice(0, 9)
  for (const i of list) {
    console.log('成员：', i)
    console.log('状态：', i.activeStatus === OnlineEnum.ONLINE)
  }
  console.log('群成员信息：', list)
  return list
})

const avatarSrc = (url: string) => AvatarUtils.getAvatarUrl(url)

const announError = ref(false)
const announNum = ref(0)
const isAddAnnoun = ref(false)
const announList = ref<any[]>([])
const remarkValue = ref('')
const item = ref<any>(null)
const nameValue = ref('')
const avatarValue = ref('')
const nicknameValue = ref('')
const options = ref<Array<{ name: string; src: string }>>([])
const { currentSession: activeItem } = storeToRefs(globalStore)
const friend = contactStore.contactsList.find((item) => item.uid === globalStore.currentSession.detailId)

const {
  fileInput,
  localImageUrl,
  showCropper,
  cropperRef,
  openAvatarCropper,
  handleFileChange,
  handleCrop: onCrop
} = useAvatarUpload({
  onSuccess: async (downloadUrl) => {
    avatarValue.value = downloadUrl
  }
})

const handleCrop = async (cropBlob: Blob) => {
  await onCrop(cropBlob)
}

const handleCopy = (val: string) => {
  if (val) {
    navigator.clipboard.writeText(val)
    window.$message.success(`复制成功 ${val}`)
  }
}

const goToNotice = () => {
  router.push({
    path: '/mobile/chatRoom/notice',
    query: {
      announList: JSON.stringify(announList.value),
      roomId: globalStore.currentSession.roomId
    }
  })
}

// 退出登录逻辑
async function handleExit() {
  dialog.error({
    title: '提示',
    content: isGroup.value ? (isLord.value ? '确定要解散群聊吗？' : '确定要退出群聊吗？') : '删除好友',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        if (isGroup.value) {
          if (isLord.value) {
            if (activeItem.value.roomId === '1') {
              window.$message.warning('无法解散频道')
              return
            }

            groupStore.exitGroup(activeItem.value.roomId).then(() => {
              window.$message.success('已解散群聊')
              // 删除当前的会话
              useMitt.emit(MittEnum.DELETE_SESSION, activeItem.value.roomId)
            })
          } else {
            if (activeItem.value.roomId === '1') {
              window.$message.warning('无法退出频道')
              return
            }

            groupStore.exitGroup(activeItem.value.roomId).then(() => {
              window.$message.success('已退出群聊')
              // 删除当前的会话
              useMitt.emit(MittEnum.DELETE_SESSION, activeItem.value.roomId)
            })
          }
        } else {
          await deleteFriend({ targetUid: globalStore.currentSession.detailId })
          window.$message.success('删除好友成功')
        }

        router.push('/mobile/message')
      } catch (error) {
        console.error('创建登录窗口失败:', error)
      }
    },
    onNegativeClick: () => {
      console.log('用户点击了取消')
    }
  })
}

/** 判断当前用户是否拥有id为6的徽章 并且是频道 */
const hasBadge6 = computed(() => {
  // 只有当 roomId 为 "1" 时才进行徽章判断（频道）
  if (globalStore.currentSession?.roomId !== '1') return false

  const currentUser = groupStore.getUserInfo(userStore.userInfo!.uid!)!
  return currentUser?.itemIds?.includes('6')
})

/**
 * 初始化群公告所需要的信息
 */
const handleInitAnnoun = async () => {
  // 初始化时获取群公告
  if (isGroup.value) {
    const roomId = globalStore.currentSession?.roomId
    if (roomId) {
      await handleLoadGroupAnnoun(roomId)
    }
  }
}

/**
 * 加载群公告
 */
const handleLoadGroupAnnoun = async (roomId: string) => {
  try {
    // 设置是否可以添加公告
    isAddAnnoun.value = isLord.value || isAdmin.value || hasBadge6.value!
    // 获取群公告列表
    const data = await cacheStore.getGroupAnnouncementList(roomId, 1, 10)
    if (data) {
      announList.value = data.records
      // 处理置顶公告
      if (announList.value && announList.value.length > 0) {
        const topAnnouncement = announList.value.find((item: any) => item.top)
        if (topAnnouncement) {
          announList.value = [topAnnouncement, ...announList.value.filter((item: any) => !item.top)]
        }
      }
      announNum.value = parseInt(data.total, 10)
      announError.value = false
    } else {
      announError.value = false
    }
  } catch (error) {
    console.error('加载群公告失败:', error)
    announError.value = true
  }
}

/** 置顶 */
const handleTop = (value: boolean) => {
  setSessionTop({ roomId: activeItem.value.roomId, top: value })
    .then(() => {
      // 更新本地会话状态
      chatStore.updateSession(activeItem.value.roomId, { top: value })
      window.$message.success(value ? '已置顶' : '已取消置顶')
    })
    .catch(() => {
      window.$message.error('置顶失败')
    })
}

// 处理群备注更新
const handleInfoUpdate = async () => {
  if (isGroup.value) {
    await cacheStore.updateMyRoomInfo({
      id: globalStore.currentSession.roomId,
      remark: remarkValue.value,
      myName: nicknameValue.value
    })
  } else {
    await modifyFriendRemark({
      targetUid: globalStore.currentSession.detailId,
      remark: remarkValue.value
    })

    friend!.remark = remarkValue.value
  }
  window.$message.success(title.value + '备注更新成功')
}

// 处理群名称更新
const handleGroupInfoUpdate = async () => {
  await updateRoomInfo({
    id: activeItem.value.roomId,
    name: nameValue.value,
    avatar: avatarValue.value
  })
  activeItem.value.avatar = avatarValue.value
}

// 获取群组详情和成员信息
const fetchGroupMembers = async (roomId: string) => {
  try {
    // 使用每个成员的uid获取详细信息
    const userList = groupStore.getUserListByRoomId(roomId)
    const memberDetails = userList.map((member: UserItem) => {
      const userInfo = groupStore.getUserInfo(member.uid)!
      return {
        name: userInfo.name || member.name || member.uid,
        src: userInfo.avatar || member.avatar
      }
    })

    options.value = memberDetails
  } catch (error) {
    console.error('获取群成员失败:', error)
  }
}

/**
 * 这里直接监听状态的值
 */
onMounted(async () => {
  await handleInitAnnoun()
  if (isGroup.value) {
    await getGroupDetail(globalStore.currentSession.roomId)
      .then((response: any) => {
        item.value = response
        nameValue.value = response.groupName || ''
        avatarValue.value = response.avatar
        nicknameValue.value = response.myName || ''
        remarkValue.value = response.remark || ''
        if (item.value && item.value.roomId) {
          fetchGroupMembers(item.value.roomId)
        }
      })
      .catch((e: any) => {
        console.error('获取群组详情失败:', e)
      })
  } else {
    // 这里需要拿到好友的信息
    remarkValue.value = friend?.remark || ''
  }
})
</script>

<style scoped></style>
