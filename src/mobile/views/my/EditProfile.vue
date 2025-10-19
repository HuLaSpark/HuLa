<template>
  <div class="flex flex-1 flex-col">
    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% fixed z-0 top-0" alt="hula" />
    <AutoFixHeightPage :show-footer="false" class="z-1">
      <template #header>
        <HeaderBar
          :isOfficial="false"
          :hidden-right="true"
          :enable-default-background="false"
          :enable-shadow="false"
          room-name="编辑资料" />
      </template>

      <template #container>
        <div class="flex flex-col gap-1 overflow-auto h-full">
          <div class="flex flex-col p-[0px_20px_20px_20px] gap-15px">
            <!-- 头像 -->
            <div class="flex justify-center">
              <div class="rounded-full relative bg-white w-86px h-86px overflow-hidden" @click="openAvatarCropper">
                <n-avatar
                  class="absolute"
                  :size="86"
                  :src="AvatarUtils.getAvatarUrl(localUserInfo.avatar!)"
                  fallback-src="/logo.png"
                  round />
                <div
                  class="absolute h-50% w-full bottom-0 bg-[rgb(50,50,50)] bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-15 backdrop-saturate-100 backdrop-contrast-100"></div>
                <div class="absolute bottom-25% text-center w-full text-12px text-white">更换头像</div>
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
            <!-- 个人信息 -->
            <van-form @submit="saveEditInfo">
              <van-cell-group class="shadow" inset>
                <!-- 昵称 -->
                <van-field
                  :disabled="true"
                  v-model="localUserInfo.name"
                  name="昵称"
                  label="昵称"
                  placeholder="请输入昵称"
                  :rules="[{ required: true, message: '请填写昵称' }]" />

                <!-- 性别 -->
                <van-field
                  v-model="genderText"
                  is-link
                  readonly
                  name="picker"
                  label="性别"
                  placeholder="点击选择性别"
                  @click="pickerState.gender = true" />

                <van-popup v-model:show="pickerState.gender" position="bottom">
                  <van-picker
                    :columns="pickerColumn.gender"
                    @confirm="pickerConfirm.gender"
                    @cancel="pickerState.gender = false" />
                </van-popup>

                <!-- 生日 -->
                <van-field
                  v-model="birthday"
                  name="生日"
                  label="生日"
                  placeholder="请选择生日"
                  is-link
                  readonly
                  @click="toEditBirthday" />

                <!-- 地区 -->
                <van-field
                  v-model="region"
                  is-link
                  readonly
                  name="area"
                  label="地区选择"
                  placeholder="点击选择省市区"
                  @click="pickerState.region = true" />
                <van-popup v-model:show="pickerState.region" position="bottom">
                  <van-area
                    :area-list="areaList"
                    @confirm="pickerConfirm.region"
                    @cancel="pickerState.region = false" />
                </van-popup>

                <!-- 手机号 -->
                <van-field
                  :disabled="true"
                  v-model="localUserInfo.phone"
                  type="tel"
                  name="手机号"
                  label="手机号"
                  placeholder="请输入手机号"
                  :rules="[{ required: false, message: '请填写手机号' }]" />

                <!-- 简介 -->
                <van-field
                  v-model="localUserInfo.resume"
                  name="简介"
                  label="简介"
                  type="textarea"
                  placeholder="请输入个人简介"
                  rows="3"
                  autosize
                  @click="toEditBio" />
              </van-cell-group>

              <div class="flex justify-center mt-20px">
                <button
                  class=""
                  style="
                    background: linear-gradient(145deg, #7eb7ac, #6fb0a4, #5fa89c);
                    border-radius: 30px;
                    padding: 10px 30px;
                    color: white;
                    font-weight: 500;
                    border: none;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                    text-align: center;
                    display: inline-block;
                  "
                  type="submit">
                  保存
                </button>
              </div>
            </van-form>
          </div>
        </div>
      </template>
    </AutoFixHeightPage>
  </div>
</template>

<script setup lang="ts">
import { areaList } from '@vant/area-data'
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import router from '@/router'
import type { ModifyUserInfoType, UserInfoType } from '@/services/types.ts'
import { useGroupStore } from '@/stores/group'
import { useLoginHistoriesStore } from '@/stores/loginHistory'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { ModifyUserInfo } from '@/utils/ImRequestUtils'

const genderText = computed(() => {
  const item = pickerColumn.value.gender.find((i) => i.value === localUserInfo.value.sex)
  return item ? item.text : ''
})

const region = ref('')

const birthday = ref('')

const pickerColumn = ref({
  gender: [
    { text: '男', value: 1 },
    { text: '女', value: 2 }
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
