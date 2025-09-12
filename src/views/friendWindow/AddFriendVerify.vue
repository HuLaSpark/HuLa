<template>
  <div class="h-full w-full bg-[--center-bg-color] select-none cursor-default">
    <!-- 窗口头部 -->
    <ActionBar
      class="absolute right-0 w-full z-999"
      :shrink="false"
      :max-w="false"
      :current-label="WebviewWindow.getCurrent().label" />

    <!-- 标题 -->
    <p class="absolute-x-center h-fit pt-6px text-(13px [--text-color]) select-none cursor-default">申请加好友</p>

    <!-- 内容区域 -->
    <div class="bg-[--bg-edit] w-380px h-full box-border flex flex-col">
      <n-flex vertical justify="center" :size="20" class="p-[55px_20px]" data-tauri-drag-region>
        <n-flex align="center" justify="center" :size="20" data-tauri-drag-region>
          <n-avatar round size="large" :src="avatarSrc" />

          <n-flex vertical :size="10">
            <p class="text-[--text-color]">{{ userInfo.name }}</p>
            <p class="text-(12px [--text-color])">账号: {{ userInfo.account }}</p>
          </n-flex>
        </n-flex>

        <n-input
          v-model:value="requestMsg"
          :allow-input="(value: string) => !value.startsWith(' ') && !value.endsWith(' ')"
          :autosize="{
            minRows: 3,
            maxRows: 3
          }"
          :maxlength="60"
          :count-graphemes="countGraphemes"
          show-count
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          type="textarea"
          placeholder="输入几句话，对TA说些什么吧" />

        <n-button class="mt-30px" color="#13987f" @click="addFriend">添加好友</n-button>
      </n-flex>
    </div>
  </div>
</template>
<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useCommon } from '@/hooks/useCommon.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { sendAddFriendRequest } from '@/utils/ImRequestUtils'
import { useGroupStore } from '~/src/stores/group'

const globalStore = useGlobalStore()
const userStore = useUserStore()
const groupStore = useGroupStore()
const { countGraphemes } = useCommon()
const userInfo = ref(groupStore.getUserInfo(globalStore.addFriendModalInfo.uid!)!)
const avatarSrc = computed(() => AvatarUtils.getAvatarUrl(userInfo.value!.avatar as string))
const requestMsg = ref()

watch(
  () => globalStore.addFriendModalInfo.uid,
  (newUid) => {
    userInfo.value = groupStore.getUserInfo(newUid!)!
  }
)

const addFriend = async () => {
  await sendAddFriendRequest({
    msg: requestMsg.value,
    targetUid: globalStore.addFriendModalInfo.uid as string
  })
  window.$message.success('已发送好友申请')
  setTimeout(async () => {
    await getCurrentWebviewWindow().close()
  }, 2000)
}

onMounted(async () => {
  console.log(userInfo.value)

  await getCurrentWebviewWindow().show()
  requestMsg.value = `我是${userStore.userInfo!.name}`
})
</script>

<style scoped lang="scss"></style>
