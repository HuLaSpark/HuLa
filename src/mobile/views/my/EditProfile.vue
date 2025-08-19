<template>
  <div class="flex flex-1 flex-col">
    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% absolute top-0 z-1" alt="hula" />
    <AutoFixHeightPage :show-footer="false">
      <template #header>
        <HeaderBar
          :isOfficial="false"
          :hidden-right="true"
          :enable-default-background="false"
          :enable-shadow="false"
          room-name="编辑资料" />
      </template>

      <template #container="{ height }">
        <div
          :style="{ height: height + 'px' }"
          class="z-2 absolute flex flex-col gap-1 overflow-auto min-h-70vh w-full">
          <div class="flex flex-col p-[0px_20px_20px_20px] gap-15px">
            <!-- 头像 -->
            <div class="flex justify-center">
              <div class="rounded-full relative bg-white w-86px h-86px overflow-hidden">
                <n-avatar class="absolute" :size="86" src="#" fallback-src="/logo.png" round />
                <div
                  class="absolute h-50% w-full bottom-0 bg-[rgb(50,50,50)] bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-15 backdrop-saturate-100 backdrop-contrast-100"></div>
                <div class="absolute bottom-25% text-center w-full text-12px text-white">更换头像</div>
              </div>
            </div>
            <!-- 个人信息 -->
            <n-form>
              <div class="shadow bg-white rounded-15px p-[10px_10px_5px_10px] flex flex-col text-14px">
                <n-form-item>
                  <!-- 昵称 -->
                  <div class="flex w-full h-45px line-height-45px custom-border-b-1">
                    <div class="w-60px self-start">昵称</div>
                    <div class="flex-1 flex bg-yellow self-center">
                      <input
                        placeholder="请输入昵称"
                        class="flex flex-1 border-none outline-none focus:outline-none"
                        type="text" />
                    </div>
                    <div class="w-50px h-45px self-end flex justify-end items-center gap-5px">
                      <span class="items-center flex">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <!-- 背景圈，无边框 -->
                          <circle cx="12" cy="12" r="12" fill="#e0e0e0" stroke="none" />
                          <!-- 叉号 -->
                          <line
                            x1="8"
                            y1="8"
                            x2="16"
                            y2="16"
                            stroke="white"
                            stroke-width="1.5"
                            stroke-linecap="round" />
                          <line
                            x1="16"
                            y1="8"
                            x2="8"
                            y2="16"
                            stroke="white"
                            stroke-width="1.5"
                            stroke-linecap="round" />
                        </svg>
                      </span>
                      <span class="text-13px">3/8</span>
                    </div>
                  </div>
                </n-form-item>

                <n-form-item>
                  <!-- 性别 -->
                  <div class="flex w-full items-center h-45px overflow-hidden custom-border-b-1">
                    <div class="w-60px self-start flex items-center h-full">性别</div>
                    <div class="flex flex-1">
                      <n-space class="w-full border-none custom-border-none" vertical>
                        <n-select
                          :bordered="false"
                          class="custom-border-none"
                          v-model:value="value"
                          :options="options" />
                      </n-space>
                    </div>
                  </div>
                </n-form-item>
                <n-form-item>
                  <!-- 生日 -->
                  <div
                    @click="toEditBirthday"
                    class="flex w-full items-center h-45px overflow-hidden custom-border-b-1">
                    <div class="w-60px self-start flex items-center h-full">生日</div>
                    <div class="flex flex-1">2000-01-01 天马座</div>
                    <svg class="w-18px h-18px text-gray iconpark-icon"><use href="#right"></use></svg>
                  </div>
                </n-form-item>
                <n-form-item>
                  <!-- 地区 -->
                  <div class="flex w-full h-45px line-height-45px custom-border-b-1">
                    <div class="w-60px self-start">地区</div>
                    <div class="flex-1 flex bg-yellow self-center">
                      <input
                        placeholder="请输入地区"
                        class="flex flex-1 border-none outline-none focus:outline-none"
                        type="text" />
                    </div>
                  </div>
                </n-form-item>
                <n-form-item>
                  <!-- 手机号 -->
                  <div class="flex w-full h-45px">
                    <div class="w-60px self-start h-full items-center flex">手机号</div>
                    <div class="flex-1 flex">
                      <input
                        placeholder="请输入手机号"
                        class="flex flex-1 border-none outline-none focus:outline-none"
                        type="text" />
                    </div>
                  </div>
                </n-form-item>
              </div>

              <n-form-item>
                <!-- 简介 -->
                <div @click="toEditBio" class="flex text-14px bg-white shadow rounded-10px w-full mt-15px min-h-45px">
                  <div class="flex flex-1 h-full py-10px">
                    <div class="w-60px ms-10px self-start flex h-full self-center self-center">简介</div>
                    <div class="flex-1 flex self-end items-center h-full">
                      <div class="pr-10px">
                        这是一个简介这是一个简介这是一个简介这是一个简介这是一个简介这是一个简介这是一个简介这是一个简介
                        这是一个简介这是一个简介这是一个简介这是一个简介这是一个简介这是一个简介这是一个简介这是一个简介
                        这是一个简介这是一个简介这是一个简介这是一个简介这是一个简介这是一个简介这是一个简介这是一个简介
                      </div>
                      <div class="flex items-center me-10px">
                        <svg class="w-18px h-18px text-gray iconpark-icon"><use href="#right"></use></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </n-form-item>

              <div class="flex justify-center mt-20px">
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
                  ">
                  保存
                </div>
              </div>
            </n-form>
          </div>
        </div>
      </template>
    </AutoFixHeightPage>
  </div>
</template>

<script setup lang="ts">
import router from '@/router'

const toEditBirthday = () => {
  router.push('/mobile/mobileMy/editBirthday')
}

const toEditBio = () => {
  router.push('/mobile/mobileMy/editBio')
}

const value = ref(null)
const options = ref([
  {
    label: '未知',
    value: 'none'
  },
  {
    label: '男',
    value: 'male'
  },
  {
    label: '女',
    value: 'female'
  }
])
</script>

<style lang="scss" scoped>
@use '@/styles/scss/form-item.scss';

.custom-border-b-1 {
  border-bottom: 1px solid;
  border-color: #d9d9d9;
}
</style>
