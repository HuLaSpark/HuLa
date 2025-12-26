<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        :room-name="t('mobile_edit_bio.title')" />
    </template>

    <template #container>
      <div
        class="bg-[url('@/assets/mobile/chat-home/background.webp')] bg-cover bg-center flex flex-col overflow-auto h-full">
        <div class="flex flex-col flex-1 gap-20px py-15px px-20px">
          <n-form class="bg-white rounded-15px p-10px shadow" label-placement="left" label-width="100px">
            <n-form-item>
              <n-input
                v-model:value="localBio"
                type="textarea"
                :placeholder="t('mobile_edit_bio.placeholder')"
                class="w-full"
                :autosize="bioAutosize"
                :maxlength="300"
                :show-count="true" />
            </n-form-item>
          </n-form>

          <div class="flex justify-center">
            <div
              class="w-20%"
              style="
                background: linear-gradient(145deg, #7eb7ac, #6fb0a4, #5fa89c);
                border-radius: 30px;
                padding: 10px 30px;
                color: white;
                font-weight: 500;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                text-align: center;
                display: inline-block;
              "
              @click="handleSave">
              {{ t('mobile_edit_bio.save_btn') }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user.ts'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const userStore = useUserStore()
const bioAutosize = { minRows: 5, maxRows: 20 }

const router = useRouter()
const localBio = ref(userStore.userInfo?.resume || '')

// 保存个人简介
const handleSave = () => {
  userStore.userInfo!.resume = localBio.value

  router.back()
}

onMounted(() => {
  localBio.value = userStore.userInfo?.resume || ''
})
</script>

<style lang="scss" scoped>
@use '@/styles/scss/form-item.scss';
</style>
