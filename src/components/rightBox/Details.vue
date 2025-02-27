<template>
  <!-- 好友详情 -->
  <n-flex v-if="content.type === RoomTypeEnum.SINGLE" vertical align="center" :size="30" class="mt-60px">
    <n-image
      object-fit="cover"
      show-toolbar-tooltip
      preview-disabled
      width="146"
      height="146"
      style="border: 2px solid #fff"
      class="rounded-50% select-none"
      :src="AvatarUtils.getAvatarUrl(item.avatar)"
      @dblclick="openImageViewer"
      alt="" />

    <span class="text-(20px [--text-color])">{{ item.name }}</span>

    <span class="text-(14px #909090)">这个人很高冷,暂时没有留下什么</span>

    <n-flex align="center" justify="space-between" :size="30" class="text-#606060 select-none cursor-default">
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
              <svg class="color-#fff"><use :href="`#${item.url}`"></use></svg>
            </n-icon>
          </template>
          <span>{{ item.title }}</span>
        </n-popover>
      </n-icon-wrapper>
    </n-flex>
  </n-flex>

  <!-- 群聊详情 -->
  <div
    v-else-if="content.type === RoomTypeEnum.GROUP && item"
    class="flex flex-col flex-1 mt-60px gap-30px select-none p-[0_40px] box-border">
    <!-- 群聊头像以及简介 -->
    <n-flex align="center" justify="space-between">
      <n-flex align="center">
        <n-image
          object-fit="cover"
          show-toolbar-tooltip
          preview-disabled
          style="border: 2px solid #fff"
          class="rounded-50% select-none size-120px"
          :src="AvatarUtils.getAvatarUrl(item.avatar)"
          @dblclick="openImageViewer"
          alt="" />

        <n-flex vertical :size="16" justify="space-between" class="text-(14px #909090)">
          <span class="text-(16px [--text-color])">{{ item.groupName }}</span>
          <span>群号：1235873897182</span>
          <span>创建时间：2021-01-01</span>
        </n-flex>
      </n-flex>

      <n-icon-wrapper
        @click="footerOptions[0].click(content.type)"
        class="cursor-pointer"
        :size="40"
        :border-radius="10"
        :color="'#13987f'">
        <n-icon :size="22">
          <svg class="color-#fff"><use href="#message"></use></svg>
        </n-icon>
      </n-icon-wrapper>
    </n-flex>

    <n-flex vertical :size="20">
      <span class="text-[--text-color]">群成员：({{ options.length }}人)</span>

      <n-avatar-group :options="options" :size="40" :max="4" expand-on-hover>
        <template #avatar="{ option: { src } }">
          <n-tooltip>
            <template #trigger>
              <n-avatar :src="AvatarUtils.getAvatarUrl(src)" />
            </template>
          </n-tooltip>
        </template>
        <template #rest="{ options: restOptions, rest }">
          <n-dropdown :options="createDropdownOptions(restOptions as any)" placement="top">
            <n-avatar :color="'#52aea3'">+{{ rest }}</n-avatar>
          </n-dropdown>
        </template>
      </n-avatar-group>
    </n-flex>
  </div>
</template>
<script setup lang="ts">
import { RoomTypeEnum } from '@/enums'
import { useBadgeInfo, useUserInfo } from '@/hooks/useCached.ts'
import { useCommon } from '@/hooks/useCommon.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import apis from '@/services/apis.ts'
import { useWindow } from '@/hooks/useWindow'
import { useImageViewer } from '@/stores/imageViewer'

const { openMsgSession } = useCommon()
const { createWebviewWindow } = useWindow()
const IMAGEWIDTH = 630
const IMAGEHEIGHT = 660
const { content } = defineProps<{
  content: any
}>()
const item = ref<any>(null)

watchEffect(() => {
  if (content.type === RoomTypeEnum.SINGLE) {
    item.value = useUserInfo(content.uid).value
  } else {
    apis.groupDetail({ id: content.uid }).then((response) => {
      item.value = response
    })
  }
})

const footerOptions = ref<OPT.Details[]>([
  {
    url: 'message',
    title: '发信息',
    click: (type) => {
      console.log(content)
      // TODO 需要增加独立窗口功能 (nyh -> 2024-03-25 16:01:23)
      //群聊传群id
      let id = '0'
      if (type === RoomTypeEnum.GROUP) {
        id = item.value.roomId
      } else {
        id = item.value.uid
      }
      openMsgSession(id, type)
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

// 打开图片查看器
const openImageViewer = async () => {
  try {
    const imageViewerStore = useImageViewer()
    // 设置为单图模式并传入图片URL
    imageViewerStore.setSingleImage(AvatarUtils.getAvatarUrl(item.value.avatar))

    // 创建窗口，使用计算后的尺寸
    await createWebviewWindow('图片查看', 'imageViewer', IMAGEWIDTH, IMAGEHEIGHT, '', true, IMAGEWIDTH, IMAGEHEIGHT)
  } catch (error) {
    console.error('打开图片查看器失败:', error)
  }
}
</script>

<style scoped></style>
