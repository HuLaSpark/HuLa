<template>
  <!-- 好友详情 -->
  <n-flex v-if="content.type === RoomTypeEnum.SINGLE" vertical align="center" :size="30" class="mt-60px select-none">
    <n-image
      width="146px"
      height="146px"
      style="border: 2px solid #fff"
      class="rounded-50%"
      :src="item.avatar"
      alt="" />

    <span class="text-(20px [--text-color])">{{ item.name }}</span>

    <span class="text-(14px #909090)">这个人很高冷,暂时没有留下什么</span>

    <n-flex align="center" justify="space-between" :size="30" class="text-#606060">
      <span>地区：{{ item.locPlace || '未知' }}</span>
      <n-flex align="center">
        <span>徽章：</span>
        <template v-for="badge in item.itemIds" :key="badge">
          <n-popover trigger="hover">
            <template #trigger>
              <img class="size-34px" :src="useBadgeInfo(badge).value.img" alt="" />
            </template>
            <span>{{ useBadgeInfo(badge).value.describe }}</span>
          </n-popover>
        </template>
      </n-flex>
    </n-flex>
    <!-- 选项按钮 -->
    <n-config-provider :theme="lightTheme">
      <n-flex align="center" justify="space-between" :size="60">
        <n-icon-wrapper
          v-for="(item, index) in footerOptions"
          :key="index"
          @click="item.click()"
          class="cursor-pointer"
          :size="28"
          :border-radius="10"
          :color="'#13987f'">
          <n-popover trigger="hover">
            <template #trigger>
              <n-icon :size="20">
                <svg><use :href="`#${item.url}`"></use></svg>
              </n-icon>
            </template>
            <span>{{ item.title }}</span>
          </n-popover>
        </n-icon-wrapper>
      </n-flex>
    </n-config-provider>
  </n-flex>

  <!-- 群聊详情 -->
  <div v-else class="flex flex-col flex-1 mt-60px gap-30px select-none p-[0_40px] box-border">
    <!-- 群聊头像以及简介 -->
    <n-flex align="center" justify="space-between">
      <n-flex align="center">
        <n-image
          width="120px"
          height="120px"
          style="border: 2px solid #fff"
          class="rounded-50%"
          :src="item.avatar"
          alt="" />

        <n-flex vertical :size="16" justify="space-between" class="text-(14px #909090)">
          <span class="text-(16px [--text-color])">{{ item.name }}</span>
          <span>群号：1235873897182</span>
          <span>创建时间：2021-01-01</span>
        </n-flex>
      </n-flex>

      <n-config-provider :theme="lightTheme">
        <n-icon-wrapper
          @click="footerOptions[0].click()"
          class="cursor-pointer"
          :size="40"
          :border-radius="10"
          :color="'#13987f'">
          <n-icon :size="22">
            <svg><use href="#message"></use></svg>
          </n-icon>
        </n-icon-wrapper>
      </n-config-provider>
    </n-flex>

    <n-flex vertical :size="20">
      <span class="text-[--text-color]">群成员：({{ options.length }}人)</span>

      <n-avatar-group :options="options" :size="40" :max="4" expand-on-hover>
        <template #avatar="{ option: { name, src } }">
          <n-tooltip>
            <template #trigger>
              <n-avatar :src="src" />
            </template>
            {{ name }}
          </n-tooltip>
        </template>
        <template #rest="{ options: restOptions, rest }">
          <n-dropdown :options="createDropdownOptions(restOptions)" placement="top">
            <n-avatar :color="'#52aea3'">+{{ rest }}</n-avatar>
          </n-dropdown>
        </template>
      </n-avatar-group>
    </n-flex>
  </div>
</template>
<script setup lang="ts">
import { MittEnum, RoomTypeEnum } from '@/enums'
import { lightTheme } from 'naive-ui'
import router from '@/router'
import Mitt from '@/utils/Bus.ts'
import { useMessage } from '@/hooks/useMessage.ts'
import { useBadgeInfo, useUserInfo } from '@/hooks/useCached.ts'
import apis from '@/services/apis.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useChatStore } from '@/stores/chat.ts'

const { handleMsgClick } = useMessage()
const globalStore = useGlobalStore()
const chatStore = useChatStore()
const { content } = defineProps<{
  content: any
}>()
const item = computed(() => {
  return useUserInfo(content.value.uid).value
})

const footerOptions = ref<OPT.Details[]>([
  {
    url: 'message',
    title: '发信息',
    click: () => {
      // TODO 需要增加独立窗口功能 (nyh -> 2024-03-25 16:01:23)
      router.push('/message')
      apis.sessionDetailWithFriends({ uid: item.value.uid as number }).then((res) => {
        globalStore.currentSession.roomId = res.data.roomId
        globalStore.currentSession.type = RoomTypeEnum.SINGLE
        chatStore.updateSessionLastActiveTime(res.data.roomId, res.data)
        handleMsgClick(res.data as any)
      })
      Mitt.emit(MittEnum.TO_SEND_MSG, { url: 'message' })
    }
  },
  {
    url: 'phone-telephone',
    title: '打电话',
    click: () => {
      console.log(123)
    }
  },
  {
    url: 'video-one',
    title: '打视频',
    click: () => {
      console.log(123)
    }
  }
])
const options = [
  {
    name: '张三',
    src: 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg'
  },
  {
    name: '李四',
    src: 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'
  },
  {
    name: '王五',
    src: 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg'
  },
  {
    name: '赵六',
    src: 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'
  },
  {
    name: '七仔',
    src: 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg'
  }
]

const createDropdownOptions = (options: Array<{ name: string; src: string }>) => {
  return options.map((option) => ({
    key: option.name,
    label: option.name
  }))
}
</script>

<style scoped></style>
