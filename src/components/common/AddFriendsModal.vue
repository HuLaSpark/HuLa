<template>
  <n-modal
    v-model:show="globalStore.addFriendModalInfo.show"
    :mask-closable="false"
    class="rounded-8px"
    transform-origin="center">
    <div class="bg-[--bg-edit] w-380px h-fit box-border flex flex-col">
      <n-flex :size="6" vertical>
        <div
          v-if="type() === 'macos'"
          @click="close"
          class="mac-close size-13px shadow-inner bg-#ed6a5eff rounded-50% mt-6px select-none absolute left-6px">
          <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
            <use href="#close"></use>
          </svg>
        </div>

        <n-flex class="text-(14px --text-color) select-none pt-6px" justify="center">申请加好友</n-flex>

        <svg
          v-if="type() === 'windows'"
          class="size-14px cursor-pointer pt-6px select-none absolute right-6px"
          @click="close">
          <use href="#close"></use>
        </svg>
        <span class="h-1px w-full bg-[--line-color]"></span>
      </n-flex>

      <n-flex vertical justify="center" :size="20" class="p-20px">
        <n-flex align="center" justify="center" :size="20">
          <n-avatar round size="large" :src="userInfo.avatar" />
          <n-flex vertical :size="10">
            <p class="text-[--text-color]">{{ userInfo.name }}</p>
            <p class="text-(12px [--text-color])">uid: {{ userInfo.uid }}</p>
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
          type="textarea"
          placeholder="输入几句话，对TA说些什么吧" />

        <n-button color="#13987f" @click="addFriend">添加好友</n-button>
      </n-flex>
    </div>
  </n-modal>
</template>
<script setup lang="ts">
import { useGlobalStore } from '@/stores/global.ts'
import { type } from '@tauri-apps/plugin-os'
import { useUserInfo } from '@/hooks/useCached.ts'
import { leftHook } from '@/layout/left/hook.ts'
import apis from '@/services/apis.ts'

const globalStore = useGlobalStore()
const { countGraphemes } = leftHook()
const userInfo = ref(useUserInfo(globalStore.addFriendModalInfo.uid).value)
const requestMsg = ref()

const close = () => {
  globalStore.addFriendModalInfo.show = false
  globalStore.addFriendModalInfo.uid = undefined
}

const addFriend = async () => {
  await apis.sendAddFriendRequest({
    msg: requestMsg.value,
    targetUid: globalStore.addFriendModalInfo.uid as number
  })
  window.$message.success('已发送好友申请')
  close()
}

watch(globalStore.addFriendModalInfo, (val) => {
  if (val.show) {
    userInfo.value = useUserInfo(val.uid).value
  }
})
</script>

<style scoped lang="scss"></style>
