<template>
  <main class="size-full rounded-8px bg-[--right-bg-color]">
    <ActionBar
      :shrink="false"
      :max-w="false"
      :top-win-label="WebviewWindow.getCurrent().label"
      :current-label="WebviewWindow.getCurrent().label" />

    <!-- 头部用户信息栏 -->
    <n-flex align="center" justify="center" :size="20" class="login-box relative h-160px w-full select-none">
      <n-avatar :size="120" round bordered :src="login.accountInfo.avatar" />
      <n-flex vertical justify="center" :size="20">
        <p class="text-(24px [--chat-text-color]) font-500">{{ login.accountInfo.name }}</p>

        <n-flex align="center" justify="space-between" :size="30" class="mt-5px">
          <template v-for="item in titleList" :key="item.label">
            <n-flex vertical align="center" class="cursor-pointer">
              <p class="text-[--text-color]">{{ item.total }}</p>
              <p class="text-(16px #808080)">{{ item.label }}</p>
            </n-flex>
          </template>
        </n-flex>
      </n-flex>

      <div class="absolute top-30px right-30px cursor-pointer" @click="handleInfoTip">
        <n-badge :value="infoTip.value" :max="100" :show="infoTip.show">
          <svg class="size-24px color-[--text-color]"><use href="#remind"></use></svg>
        </n-badge>
      </div>
    </n-flex>

    <!-- 动态列表 -->
    <div class="flex flex-col items-center text-[--text-color] bg-[--right-bg-color]">
      <n-scrollbar
        style="max-height: calc(100vh - 180px)"
        class="w-full rounded-b-8px bg-[--center-bg-color] border-(solid 1px [--line-color]) p-[10px_0] box-border">
        <n-flex justify="center">
          <!--  动态内容框   -->
          <n-flex
            vertical
            v-for="item in dynamicList"
            :key="item.id"
            class="w-450px h-fit border-(solid 1px [--line-color]) custom-shadow rounded-8px bg-[--right-bg-color] p-10px box-border">
            <n-flex align="center">
              <!--  用户的头像和用户名以及个签    -->
              <img class="size-45px bg-#ccc rounded-50% select-none" :src="item.avatar" alt="" />
              <n-flex vertical style="flex: 1">
                <n-flex justify="space-between" align="center">
                  <label class="text-14px flex items-center gap-5px">
                    <span :class="item.isAuth ? 'text-#13987f' : ''">{{ item.user }}</span>
                    <n-popover trigger="hover" v-if="item.isAuth">
                      <template #trigger>
                        <svg class="size-20px color-#13987f select-none outline-none cursor-pointer">
                          <use href="#auth"></use>
                        </svg>
                      </template>
                      <span>著名歌手</span>
                    </n-popover>
                  </label>

                  <span class="text-(12px #707070)">发布于：2021-01-01</span>
                </n-flex>

                <span class="text-(12px #707070)">个性签名</span>
              </n-flex>

              <!--  个签照片墙  -->
              <n-flex vertical>
                <n-scrollbar style="max-height: 240px; user-select: none">
                  <n-image-group>
                    <n-flex>
                      <n-image
                        v-for="i in item.img"
                        :key="i.url"
                        :src="i.url"
                        alt=""
                        width="134px"
                        height="120px"
                        class="rounded-6px" />
                    </n-flex>
                  </n-image-group>
                </n-scrollbar>

                <n-input />
              </n-flex>
            </n-flex>
          </n-flex>
        </n-flex>
      </n-scrollbar>
    </div>

    <!-- 弹出框 -->
    <n-modal v-model:show="infoTip.modalShow" class="w-450px border-rd-8px">
      <div class="bg-[--bg-popover] h-full p-6px box-border flex flex-col">
        <div
          v-if="type() === 'macos'"
          @click="infoTip.modalShow = false"
          class="mac-close relative size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none">
          <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
            <use href="#close"></use>
          </svg>
        </div>

        <svg
          v-if="type() === 'windows'"
          @click="infoTip.modalShow = false"
          class="w-12px h-12px ml-a cursor-pointer select-none">
          <use href="#close"></use>
        </svg>
        <n-virtual-list
          :items="dynamicCommentList"
          :item-size="40"
          class="max-h-500px w-full p-[0_10px] box-border select-none">
          <template #default="{ item }">
            <n-flex align="center" justify="space-between" class="mt-18px">
              <n-flex align="center">
                <n-avatar :size="36" round bordered :src="item.avatar" />
                <p>{{ item.user }}</p>
                <p class="text-(12px #707070)">{{ item.content }}</p>
              </n-flex>

              <p class="text-(12px #707070)">2021-01-01</p>
            </n-flex>
          </template>
        </n-virtual-list>
      </div>
    </n-modal>
  </main>
</template>
<script setup lang="ts">
import { dynamicList, dynamicCommentList } from '@/mock'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useWindowState } from '@/hooks/useWindowState.ts'
import { setting } from '@/stores/setting.ts'
import { type } from '@tauri-apps/plugin-os'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

useWindowState(WebviewWindow.getCurrent().label)
const settingStore = setting()
const { login } = storeToRefs(settingStore)
const infoTip = ref({
  value: dynamicCommentList.length,
  show: true,
  modalShow: false
})
const titleList = [
  {
    label: '动态',
    total: 43
  },
  {
    label: '关注',
    total: 443
  },
  {
    label: '点赞',
    total: 99
  }
]

/** 处理信息提示 */
const handleInfoTip = () => {
  infoTip.value.show = false
  infoTip.value.modalShow = true
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()
})
</script>
<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';
.mac-close:hover {
  svg {
    display: block;
  }
}
</style>
