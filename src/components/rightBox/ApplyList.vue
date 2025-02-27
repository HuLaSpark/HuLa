<template>
  <n-flex vertical class="select-none">
    <n-flex align="center" justify="space-between" class="color-[--text-color] px-20px py-10px">
      <p class="text-16px">好友通知</p>
      <svg class="size-18px cursor-pointer"><use href="#delete"></use></svg>
    </n-flex>

    <n-scrollbar id="friend-request-scrollbar" style="max-height: calc(100vh - 80px)">
      <n-flex
        vertical
        :size="10"
        class="p-[10px_30px] box-border"
        v-for="(item, index) in contactStore.requestFriendsList"
        :key="index">
        <n-flex
          align="center"
          justify="space-between"
          class="bg-[--center-bg-color] rounded-10px p-20px box-border border-(1px solid [--bg-popover])">
          <n-flex align="center" :size="10">
            <n-avatar round size="large" :src="avatarSrc(useUserInfo(item.uid).value.avatar!)" class="mr-10px" />
            <n-flex vertical :size="12">
              <n-flex align="center" :size="10">
                <n-popover
                  @update:show="handlePopoverUpdate(currentUserId, $event)"
                  trigger="click"
                  placement="bottom-start"
                  :show-arrow="false"
                  style="padding: 0; background: var(--bg-info)">
                  <template #trigger>
                    <p @click="currentUserId = item.uid" class="text-(14px #13987f) cursor-pointer">
                      {{ useUserInfo(item.uid).value.name }}
                    </p>
                  </template>
                  <!-- 用户个人信息框 -->
                  <InfoPopover v-if="currentUserId === item.uid" :uid="item.uid" />
                </n-popover>

                <p class="text-(14px [--text-color])">请求加为好友</p>
              </n-flex>
              <p v-show="item.msg" class="text-(12px [--text-color])">留言：{{ item.msg }}</p>
            </n-flex>
          </n-flex>

          <n-button
            secondary
            :loading="loading"
            v-if="item.status === RequestFriendAgreeStatus.Waiting"
            @click="handleAgree(item.applyId)">
            接受
          </n-button>
          <span class="text-(12px #64a29c)" v-else>已同意</span>
        </n-flex>
      </n-flex>
    </n-scrollbar>
  </n-flex>
</template>
<script setup lang="ts">
import { useContactStore } from '@/stores/contacts.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { RequestFriendAgreeStatus } from '@/services/types.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { usePopover } from '@/hooks/usePopover'

const contactStore = useContactStore()
const currentUserId = ref('0')
const loading = ref(false)
const { handlePopoverUpdate, enableScroll } = usePopover(currentUserId, 'friend-request-scrollbar')
provide('popoverControls', { enableScroll })

const avatarSrc = (url: string) => AvatarUtils.getAvatarUrl(url)

const handleAgree = async (applyId: string) => {
  loading.value = true
  contactStore.onAcceptFriend(applyId).then(() => {
    setTimeout(() => {
      loading.value = false
    }, 600)
  })
}
</script>

<style scoped lang="scss"></style>
