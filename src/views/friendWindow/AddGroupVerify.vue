<template>
  <div class="h-full w-full bg-[--center-bg-color] select-none cursor-default">
    <!-- 窗口头部 -->
    <ActionBar
      class="absolute right-0 w-full z-999"
      :shrink="false"
      :max-w="false"
      :current-label="WebviewWindow.getCurrent().label" />

    <!-- 标题 -->
    <p
      class="absolute-x-center h-fit pt-6px text-(13px [--text-color]) select-none cursor-default"
      data-tauri-drag-region>
      {{ t('message.group_verify.title') }}
    </p>

    <!-- 内容区域 -->
    <div class="bg-[--bg-edit] w-380px h-full box-border flex flex-col">
      <n-flex vertical justify="center" :size="20" class="p-[55px_20px]" data-tauri-drag-region>
        <n-flex align="center" justify="center" :size="20" data-tauri-drag-region>
          <n-avatar round size="large" :src="userInfo.avatar" />

          <n-flex vertical :size="10">
            <p class="text-[--text-color]">{{ userInfo.name }}</p>
            <p class="text-(12px [--text-color])">
              {{ t('message.group_verify.account', { account: userInfo.account }) }}
            </p>
          </n-flex>
        </n-flex>

        <n-input
          v-model:value="requestMsg"
          :allow-input="(value: string) => !value.startsWith(' ') && !value.endsWith(' ')"
          :autosize="requestMsgAutosize"
          :maxlength="60"
          :count-graphemes="countGraphemes"
          show-count
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          type="textarea"
          :placeholder="t('message.group_verify.placeholder')" />

        <n-button class="mt-120px" color="#13987f" @click="addFriend">
          {{ t('message.group_verify.send_btn') }}
        </n-button>
      </n-flex>
    </div>
  </div>
</template>
<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useCommon } from '@/hooks/useCommon.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useUserStore } from '@/stores/user.ts'
import { applyGroup } from '@/utils/ImRequestUtils'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const globalStore = useGlobalStore()
const userStore = useUserStore()
const { countGraphemes } = useCommon()
const requestMsgAutosize = { minRows: 3, maxRows: 3 }
const userInfo = ref(globalStore.addGroupModalInfo)
const requestMsg = ref()

watch(
  () => globalStore.addGroupModalInfo,
  (newUid) => {
    userInfo.value = { ...newUid }
  }
)

const addFriend = async () => {
  await applyGroup({
    msg: requestMsg.value,
    account: String(globalStore.addGroupModalInfo.account),
    type: 1
  })
  window.$message.success(t('message.group_verify.toast_success'))
  setTimeout(async () => {
    await getCurrentWebviewWindow().close()
  }, 2000)
}

onMounted(async () => {
  console.log(userInfo.value)

  await getCurrentWebviewWindow().show()
  requestMsg.value = t('message.group_verify.default_msg', { name: userStore.userInfo!.name })
})
</script>

<style scoped lang="scss"></style>
