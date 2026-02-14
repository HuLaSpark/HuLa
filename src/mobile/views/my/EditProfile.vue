<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        :hidden-right="true"
        :enable-default-background="false"
        :enable-shadow="false"
        :room-name="t('mobile_edit_profile.title')" />
    </template>
    <template #container>
      <div class="flex flex-col overflow-auto h-full">
        <div class="p-20px">
          <!-- 头像 -->
          <div class="flex justify-center mb-50px">
            <div class="rounded-full relative bg-white w-86px h-86px overflow-hidden" @click="openAvatarCropper">
              <n-avatar
                class="absolute"
                :size="86"
                :src="AvatarUtils.getAvatarUrl(localUserInfo.avatar!)"
                fallback-src="/logo.png"
                round />
              <div
                class="absolute h-50% w-full bottom-0 bg-[rgb(50,50,50)] bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-15 backdrop-saturate-100 backdrop-contrast-100"></div>
              <div class="absolute bottom-25% text-center w-full text-12px text-white">
                {{ t('mobile_edit_profile.change_avatar') }}
              </div>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="handleFileChange" />
            <AvatarCropper ref="cropperRef" v-model:show="showCropper" :image-url="localImageUrl" @crop="handleCrop" />
          </div>
          <!-- 个人信息 -->
          <n-card class="p-0! rounded-16px">
            <n-form @submit="saveEditInfo" label-placement="left" label-align="left" :label-width="80">
              <n-form-item :label="t('mobile_edit_profile.nickname')">
                <n-input
                  readonly
                  v-model:value="localUserInfo.name"
                  :placeholder="t('mobile_edit_profile.placeholder.nickname')"
                  class="bg-transparent!" />
              </n-form-item>

              <n-divider class="my-3! p-0!" />

              <n-form-item
                :label="t('mobile_edit_profile.gender')"
                :placeholder="t('mobile_edit_profile.placeholder.gender')">
                <n-input
                  @click="pickerState.gender = true"
                  v-model:value="genderText"
                  readonly
                  :placeholder="t('mobile_edit_profile.placeholder.gender')"
                  class="bg-transparent!" />
              </n-form-item>

              <n-divider class="my-3! p-0!" />

              <n-form-item
                :label="t('mobile_edit_profile.brithday')"
                :placeholder="t('mobile_edit_profile.placeholder.brithday')">
                <n-input
                  @click="toEditBirthday"
                  v-model:value="birthday"
                  readonly
                  :placeholder="t('mobile_edit_profile.placeholder.brithday')"
                  class="bg-transparent!" />
              </n-form-item>

              <n-divider class="my-3! p-0!" />

              <n-form-item label="地区" :placeholder="t('mobile_edit_profile.placeholder.brithday')">
                <n-input
                  @click="pickerState.region = true"
                  v-model:value="region"
                  readonly
                  :placeholder="t('mobile_edit_profile.placeholder.brithday')"
                  class="bg-transparent!" />
              </n-form-item>

              <n-divider class="my-3! p-0!" />

              <n-form-item
                disabled
                :label="t('mobile_edit_profile.phone')"
                :placeholder="t('mobile_edit_profile.placeholder.phone')">
                <n-input
                  disabled
                  readonly
                  v-model:value="localUserInfo.phone"
                  :placeholder="t('mobile_edit_profile.placeholder.phone')"
                  class="bg-transparent!" />
              </n-form-item>

              <n-divider class="my-3! p-0!" />

              <n-form-item
                disabled
                :label="t('mobile_edit_profile.bio')"
                :placeholder="t('mobile_edit_profile.placeholder.bio')">
                <n-input
                  type="textarea"
                  v-model:value="localUserInfo.resume"
                  :placeholder="t('mobile_edit_profile.placeholder.bio')"
                  class="bg-transparent!"
                  @click="toEditBio"
                  readonly />
              </n-form-item>
              <!-- <van-cell-group class="shadow" inset> -->
              <!-- 昵称 -->
              <!-- <van-field
                    :disabled="true"
                    v-model="localUserInfo.name"
                    name="昵称"
                    :label="t('mobile_edit_profile.nickname')"
                    :placeholder="t('mobile_edit_profile.placeholder.nickname')"
                    :rules="[{ required: true, message: t('mobile_edit_profile.placeholder.nickname') }]" /> -->

              <!-- 性别 -->
              <!-- <van-field
                    v-model="genderText"
                    is-link
                    readonly
                    name="picker"
                    :label="t('mobile_edit_profile.gender')"
                    :placeholder="t('mobile_edit_profile.placeholder.gender')"
                    @click="pickerState.gender = true" /> -->

              <n-drawer
                v-model:show="pickerState.gender"
                class="rounded-t-20px! overflow-hidden"
                position="bottom"
                round
                placement="bottom"
                default-height="300px">
                <van-picker
                  :columns="pickerColumn.gender"
                  @confirm="pickerConfirm.gender"
                  @cancel="pickerState.gender = false" />
              </n-drawer>
              <!-- <van-popup v-model:show="pickerState.gender" position="bottom">
                    <van-picker
                      :columns="pickerColumn.gender"
                      @confirm="pickerConfirm.gender"
                      @cancel="pickerState.gender = false" />
                  </van-popup> -->

              <!-- 生日 -->
              <!-- <van-field
                    v-model="birthday"
                    :name="t('mobile_edit_profile.brithday')"
                    :label="t('mobile_edit_profile.brithday')"
                    :placeholder="t('mobile_edit_profile.placeholder.brithday')"
                    is-link
                    readonly
                    @click="toEditBirthday" /> -->

              <!-- 地区 -->
              <!-- <van-field
                    v-model="region"
                    is-link
                    readonly
                    name="area"
                    :label="t('mobile_edit_profile.brithday')"
                    :placeholder="t('mobile_edit_profile.placeholder.brithday')"
                    @click="pickerState.region = true" />
                  -->
              <area-drawer
                v-model:show="pickerState.region"
                @confirm="pickerConfirm.region"
                @cancel="pickerState.region = false" />

              <!-- 手机号 -->
              <!-- <van-field
                    :disabled="true"
                    v-model="localUserInfo.phone"
                    type="tel"
                    name="手机号"
                    :label="t('mobile_edit_profile.phone')"
                    :placeholder="t('mobile_edit_profile.placeholder.phone')"
                    :rules="[{ required: false, message: '请填写手机号' }]" /> -->

              <!-- 简介 -->
              <!-- <van-field
                    v-model="localUserInfo.resume"
                    name="简介"
                    :label="t('mobile_edit_profile.bio')"
                    :placeholder="t('mobile_edit_profile.placeholder.bio')"
                    type="textarea"
                    rows="3"
                    autosize
                    @click="toEditBio" /> -->
              <!-- </van-cell-group> -->

              <div class="flex justify-center mt-20px">
                <n-button block attr-type="submit" type="primary" strong secondary round>
                  {{ t('mobile_edit_profile.save_btn') }}
                </n-button>
              </div>
            </n-form>
          </n-card>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import router from '@/router'
import type { ModifyUserInfoType, UserInfoType } from '@/services/types.ts'
import { useGroupStore } from '@/stores/group'
import { useLoginHistoriesStore } from '@/stores/loginHistory'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { ModifyUserInfo } from '@/utils/ImRequestUtils'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const genderText = computed(() => {
  const item = pickerColumn.value.gender.find((i) => i.value === localUserInfo.value.sex)
  return item ? item.text : ''
})

const region = ref('')

const birthday = ref('')

const pickerColumn = ref({
  gender: [
    { text: t('mobile_edit_profile.genders.male'), value: 1 },
    { text: t('mobile_edit_profile.genders.female'), value: 2 }
  ]
})

const pickerConfirm = {
  gender: (data: { selectedOptions: any }) => {
    const selected = data.selectedOptions[0].value
    localUserInfo.value.sex = selected
    pickerState.value.gender = false
  },
  region: (data: { selectedOptions: any }) => {
    const selected = data.selectedOptions
    region.value = selected.map((item: { text: any }) => item.text).join('/')
    pickerState.value.region = false
  }
}

const pickerState = ref({
  gender: false,
  region: false,
  date: false
})

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
    // 更新编辑信息
    localUserInfo.value.avatar = downloadUrl
    // 更新用户信息
    userStore.userInfo!.avatar = downloadUrl
    // 更新头像更新时间
    userStore.userInfo!.avatarUpdateTime = Date.now()
    // 更新登录历史记录
    loginHistoriesStore.loginHistories.filter((item) => item.uid === userStore.userInfo!.uid)[0].avatar = downloadUrl
    // 更新缓存里面的用户信息
    updateCurrentUserCache('avatar', downloadUrl)
  }
})

// 处理裁剪，调用hook中的方法
const handleCrop = async (cropBlob: Blob) => {
  await onCrop(cropBlob)
}

const groupStore = useGroupStore()
const userStore = useUserStore()
const loginHistoriesStore = useLoginHistoriesStore()
const localUserInfo = ref<Partial<ModifyUserInfoType>>({
  name: '',
  sex: 1,
  phone: '',
  avatar: '',
  resume: '',
  modifyNameChance: 0
} as ModifyUserInfoType)

const toEditBirthday = () => {
  router.push('/mobile/mobileMy/editBirthday')
}

const toEditBio = () => {
  router.push('/mobile/mobileMy/editBio')
}

const updateCurrentUserCache = (key: 'name' | 'wearingItemId' | 'avatar', value: any) => {
  const currentUser = userStore.userInfo!.uid && groupStore.getUserInfo(userStore.userInfo!.uid)
  if (currentUser) {
    currentUser[key] = value // 更新缓存里面的用户信息
  }
}

const saveEditInfo = () => {
  if (!localUserInfo.value.name || localUserInfo.value.name.trim() === '') {
    window.$message.error('昵称不能为空')
    return
  }
  // if (localUserInfo.value.modifyNameChance === 0) {
  //   window.$message.error('改名次数不足')
  //   return
  // }

  ModifyUserInfo({
    name: localUserInfo.value.name!,
    sex: localUserInfo.value.sex!,
    phone: localUserInfo.value.phone ?? '',
    avatar: localUserInfo.value.avatar ?? '',
    resume: localUserInfo.value.resume ?? '',
    modifyNameChance: localUserInfo.value.modifyNameChance!
  }).then(() => {
    // 更新本地缓存的用户信息
    userStore.userInfo!.name = localUserInfo.value.name!
    userStore.userInfo!.sex = localUserInfo.value.sex!
    userStore.userInfo!.phone = localUserInfo.value.phone!
    loginHistoriesStore.updateLoginHistory(<UserInfoType>userStore.userInfo) // 更新登录历史记录
    updateCurrentUserCache('name', localUserInfo.value.name) // 更新缓存里面的用户信息
    if (!localUserInfo.value.modifyNameChance) return
    localUserInfo.value.modifyNameChance -= 1
    window.$message.success('修改成功')
  })
}

onMounted(async () => {
  localUserInfo.value = { ...userStore.userInfo! }
})
</script>

<style lang="scss" scoped>
@use '@/styles/scss/form-item.scss';

@use 'vant/lib/index.css';

.custom-border-b-1 {
  border-bottom: 1px solid;
  border-color: #d9d9d9;
}
</style>
