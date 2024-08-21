<template>
  <n-modal v-model:show="editInfo.show" :mask-closable="false" class="rounded-8px" transform-origin="center">
    <div class="bg-[--bg-edit] w-480px h-fit box-border flex flex-col">
      <n-flex :size="6" vertical>
        <div
          v-if="type() === 'macos'"
          @click="editInfo.show = false"
          class="mac-close size-13px shadow-inner bg-#ed6a5eff rounded-50% mt-6px select-none absolute left-6px">
          <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
            <use href="#close"></use>
          </svg>
        </div>

        <n-flex class="text-(14px --text-color) select-none pt-6px" justify="center">编辑资料</n-flex>

        <svg
          v-if="type() === 'windows'"
          class="size-14px cursor-pointer pt-6px select-none absolute right-6px"
          @click="editInfo.show = false">
          <use href="#close"></use>
        </svg>
        <span class="h-1px w-full bg-[--line-color]"></span>
      </n-flex>
      <n-flex :size="20" class="p-22px select-none" vertical>
        <!-- 头像 -->
        <n-flex justify="center">
          <n-avatar :size="80" :src="editInfo.content.avatar" round style="border: 3px solid #fff" />
        </n-flex>
        <n-flex v-if="currentBadge" align="center" justify="center">
          <span class="text-(14px #707070)">当前佩戴的徽章:</span>
          <n-popover trigger="hover">
            <template #trigger>
              <img :src="currentBadge?.img" alt="" class="size-22px" />
            </template>
            <span>{{ currentBadge?.describe }}</span>
          </n-popover>
        </n-flex>
        <!-- 昵称编辑输入框 -->
        <n-popover placement="top-start" trigger="click">
          <template #trigger>
            <n-input
              ref="inputInstRef"
              v-model:value="editInfo.content.name"
              :count-graphemes="countGraphemes"
              :default-value="editInfo.content.name"
              :maxlength="8"
              :passively-activated="true"
              class="rounded-6px"
              clearable
              placeholder="请输入你的昵称"
              show-count
              type="text">
              <template #prefix>
                <span class="pr-6px text-#909090">昵称</span>
              </template>
            </n-input>
          </template>
          <span>剩余改名次数: {{ editInfo.content.modifyNameChance || 0 }}</span>
        </n-popover>

        <!-- 徽章列表  -->
        <n-flex :size="[56, 20]" align="center">
          <template v-for="item in editInfo.badgeList" :key="item.id">
            <div class="badge-item">
              <n-image
                :class="{ 'grayscale-0': item.obtain === IsYetEnum.YES }"
                :src="item.img"
                alt="badge"
                class="flex-center grayscale"
                width="100"
                height="100"
                preview-disabled
                round />
              <div class="tip">
                <template v-if="item.obtain === IsYetEnum.YES">
                  <n-button v-if="item.wearing === IsYetEnum.NO" color="#13987f" @click="toggleWarningBadge(item)">
                    佩戴
                  </n-button>
                </template>
                <n-popover trigger="hover">
                  <template #trigger>
                    <svg class="size-24px outline-none"><use href="#tips"></use></svg>
                  </template>
                  <span>{{ item.describe }}</span>
                </n-popover>
              </div>
            </div>
          </template>
        </n-flex>
      </n-flex>
      <n-flex class="p-12px" align="center" justify="center">
        <n-button :disabled="editInfo.content.name === login.accountInfo.name" color="#13987f" @click="saveEditInfo">
          保存
        </n-button>
      </n-flex>
    </div>
  </n-modal>
</template>
<script setup lang="ts">
import { IsYetEnum, MittEnum } from '@/enums'
import { leftHook } from '@/layout/left/hook.ts'
import Mitt from '@/utils/Bus.ts'
import apis from '@/services/apis.ts'
import { type } from '@tauri-apps/plugin-os'

const { login, editInfo, currentBadge, saveEditInfo, toggleWarningBadge, countGraphemes } = leftHook()

onMounted(() => {
  Mitt.on(MittEnum.OPEN_EDIT_INFO, () => {
    Mitt.emit(MittEnum.CLOSE_INFO_SHOW)
    editInfo.value.show = true
    /** 获取用户的徽章列表 */
    apis.getBadgeList().then((res) => {
      editInfo.value.badgeList = res.data
    })
    /** 获取用户信息 */
    apis.getUserInfo().then((res) => {
      editInfo.value.content = res.data
    })
  })
})
</script>
<style scoped lang="scss">
.badge-item {
  .tip {
    transition: opacity 0.4s ease-in-out;
    @apply absolute top-0 left-0 w-full h-full flex-center z-999 opacity-0;
  }
  @apply bg-#ccc relative rounded-50% size-fit p-4px cursor-pointer;
  &:hover .tip {
    @apply opacity-100;
  }
}
.mac-close:hover {
  svg {
    display: block;
  }
}
</style>
