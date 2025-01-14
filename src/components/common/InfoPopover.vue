<template>
  <!-- 个人信息框 -->
  <n-flex vertical :size="26" class="size-fit box-border rounded-8px relative min-h-[300px]">
    <!-- 背景 -->
    <img
      class="absolute rounded-t-8px z-2 top-0 left-0 w-full h-100px object-cover"
      src="@/assets/img/dispersion-bg.png"
      alt="" />
    <div class="h-20px"></div>
    <n-flex vertical :size="20" class="size-full p-10px box-border z-10 relative">
      <n-flex vertical :size="20">
        <n-avatar
          class="border-(8px solid [--avatar-border-color])"
          :bordered="true"
          round
          :size="80"
          :src="avatarSrc"
          fallback-src="/logo.png" />

        <span
          @click="openContent('在线状态', 'onlineStatus', 320, 480)"
          :class="[activeStatus === OnlineEnum.ONLINE ? 'bg-#1ab292' : 'bg-#909090']"
          class="absolute top-72px left-72px cursor-pointer border-(6px solid [--avatar-border-color]) rounded-full size-18px"></span>

        <div
          v-if="useUserInfo(uid).value.wearingItemId === 6"
          class="absolute top-72px left-142px bg-[--bate-bg] border-(1px solid [--bate-color]) text-(12px [--bate-color] center) font-bold p-8px rounded-full">
          HuLa开发工程师
        </div>

        <p
          class="text-(18px [--text-color])"
          style="
            font-weight: bold !important;
            font-family:
              system-ui,
              -apple-system,
              sans-serif;
          ">
          {{ useUserInfo(uid).value.name }}
        </p>
      </n-flex>

      <!-- 地址 -->
      <n-flex :size="26" class="select-none">
        <span class="text-[--info-text-color]">所在地</span>
        <span>中国</span>
      </n-flex>
      <!-- 获得的徽章 -->
      <n-flex v-if="isCurrentUser.itemIds && isCurrentUser.itemIds.length > 0" :size="26" class="select-none">
        <span class="text-[--info-text-color]">获得的徽章</span>
        <n-flex>
          <template v-for="id in isCurrentUser.itemIds" :key="id">
            <img class="size-38px" :src="useBadgeInfo(id).value.img" alt="" />
          </template>
        </n-flex>
      </n-flex>
      <!-- 动态 -->
      <n-flex :size="40" class="select-none">
        <span class="text-[--info-text-color]">动态</span>
        <n-image-group>
          <n-flex :size="6" :wrap="false">
            <n-image
              v-for="n in 4"
              :key="n"
              preview-disabled
              class="rounded-8px"
              width="50"
              src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg" />
          </n-flex>
        </n-image-group>
      </n-flex>

      <n-flex justify="center" align="center" :size="40">
        <n-button v-if="isCurrentUserUid" secondary type="info" @click="openEditInfo"> 编辑资料 </n-button>
        <n-button v-else-if="isMyFriend" secondary type="primary" @click="openMsgSession(uid)"> 发信息 </n-button>
        <n-button v-else secondary @click="addFriend"> 加好友 </n-button>
      </n-flex>
    </n-flex>
  </n-flex>
</template>

<script setup lang="ts">
import { useBadgeInfo, useUserInfo } from '@/hooks/useCached.ts'
import { AvatarUtils } from '@/utils/avatarUtils'
import { MittEnum, OnlineEnum } from '@/enums/index.ts'
import { useCommon } from '@/hooks/useCommon.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { leftHook } from '@/layout/left/hook'
import { useMitt } from '@/hooks/useMitt'
import { useGlobalStore } from '@/stores/global'

const { uid } = defineProps<{
  uid: number
  activeStatus?: OnlineEnum
}>()
const { userUid, openMsgSession } = useCommon()
const globalStore = useGlobalStore()
const { openContent } = leftHook()
const contactStore = useContactStore()
const isCurrentUser = computed(() => useUserInfo(uid).value)
const avatarSrc = computed(() => AvatarUtils.getAvatarUrl(useUserInfo(uid).value.avatar as string))
/** 是否是当前登录的用户 */
const isCurrentUserUid = computed(() => userUid.value === uid)
/** 是否是我的好友 */
const isMyFriend = computed(() => !!contactStore.contactsList.find((item) => item.uid === uid))

const openEditInfo = () => {
  useMitt.emit(MittEnum.OPEN_EDIT_INFO)
}

const addFriend = () => {
  globalStore.addFriendModalInfo.show = true
  globalStore.addFriendModalInfo.uid = uid
}
</script>

<style scoped lang="scss">
.item-hover {
  @apply select-none hover:bg-[--info-hover] cursor-pointer w-fit rounded-10px p-4px;
  transition: all 0.4s ease-in-out;
}
</style>
