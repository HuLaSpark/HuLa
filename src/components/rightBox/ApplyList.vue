<template>
  <n-flex vertical class="select-none">
    <n-flex align="center" justify="space-between" class="color-[--text-color] px-20px py-10px">
      <p class="text-16px">好友通知</p>
      <svg class="size-18px cursor-pointer"><use href="#delete"></use></svg>
    </n-flex>

    <n-flex
      vertical
      :size="10"
      class="p-[0_30px]"
      v-for="(item, index) in contactStore.requestFriendsList"
      :key="index">
      <n-flex
        align="center"
        justify="space-between"
        class="bg-[--center-bg-color] rounded-10px p-20px box-border border-(1px solid [--bg-popover])">
        <n-flex align="center" :size="10">
          <n-avatar round size="large" :src="useUserInfo(item.uid).value.avatar" class="mr-10px" />
          <n-flex vertical :size="12">
            <n-flex align="center" :size="10">
              <n-popover
                trigger="click"
                placement="bottom-start"
                :show-arrow="false"
                style="padding: 0; background: var(--bg-info); backdrop-filter: blur(10px)">
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
          v-if="item.status === RequestFriendAgreeStatus.Waiting"
          @click="contactStore.onAcceptFriend(item.applyId)">
          接受
        </n-button>
        <span class="text-(12px #64a29c)" v-else>已同意</span>
      </n-flex>
    </n-flex>
  </n-flex>
</template>
<script setup lang="ts">
import { useContactStore } from '@/stores/contacts.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { RequestFriendAgreeStatus } from '@/services/types.ts'

const contactStore = useContactStore()
const currentUserId = ref(0)
</script>

<style scoped lang="scss"></style>
