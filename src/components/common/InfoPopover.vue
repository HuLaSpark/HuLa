<template>
  <!-- 个人信息框 -->
  <n-flex vertical :size="26" class="size-fit box-border rounded-8px relative min-h-[300px]">
    <n-flex vertical :size="20" class="size-full p-10px box-border z-10">
      <n-flex vertical :size="20" align="center">
        <n-avatar :bordered="true" round :size="80" :src="avatarSrc" fallback-src="/logo.png" />

        <n-flex v-if="activeStatus" :size="6" align="center" style="margin-left: -4px" class="item-hover">
          <n-badge :color="activeStatus === OnlineEnum.ONLINE ? '#1ab292' : '#909090'" dot />
          <p class="text-(12px [--text-color])">
            {{ activeStatus === OnlineEnum.ONLINE ? '在线' : '离线' }}
          </p>
        </n-flex>
      </n-flex>

      <!-- 地址 -->
      <n-flex :size="26" class="select-none">
        <span class="text-[--info-text-color]">所在地</span>
        <span>中国</span>
      </n-flex>
      <!-- 获得的徽章 -->
      <n-flex v-if="isCurrentUser.itemIds && isCurrentUser.itemIds.length > 0" :size="26" class="select-none">
        <span class="text-[--info-text-color]">获得的徽章</span>
        <n-flex>
          <template v-for="id in isCurrentUser.itemIds" :key="id">
            <img class="size-38px" :src="useBadgeInfo(id).value.img" alt="" />
          </template>
        </n-flex>
      </n-flex>
      <!-- 动态 -->
      <n-flex :size="40" class="select-none">
        <span class="text-[--info-text-color]">动态</span>
        <n-image-group>
          <n-flex :size="6" :wrap="false">
            <n-image
              v-for="n in 4"
              :key="n"
              preview-disabled
              class="rounded-8px"
              width="50"
              src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg" />
          </n-flex>
        </n-image-group>
      </n-flex>

      <n-flex justify="center" align="center" :size="40">
        <n-button secondary> 发信息 </n-button>
      </n-flex>
    </n-flex>

    <!-- 背景 -->
    <img
      class="size-full rounded-8px box-border p-20px absolute top-0 left-0 blur-xl opacity-80"
      :src="avatarSrc"
      alt="" />
  </n-flex>
</template>

<script setup lang="ts">
import { useBadgeInfo, useUserInfo } from '@/hooks/useCached.ts'
import { AvatarUtils } from '@/utils/avatarUtils'
import { OnlineEnum } from '@/enums/index.ts'

const { uid } = defineProps<{
  uid: number
  activeStatus?: OnlineEnum
}>()
const isCurrentUser = computed(() => useUserInfo(uid).value)
const avatarSrc = computed(() => AvatarUtils.getAvatarUrl(useUserInfo(uid).value.avatar as string))
</script>

<style scoped lang="scss">
.item-hover {
  @apply select-none hover:bg-[--info-hover] cursor-pointer w-fit rounded-10px p-4px;
  transition: all 0.4s ease-in-out;
}
</style>
