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
      class="rounded-50% select-none cursor-pointer"
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
    <!-- 群聊头像及名称 -->
    <n-flex align="center" justify="space-between" class="px-30px box-border">
      <n-flex align="center" :size="30">
        <n-image
          object-fit="cover"
          show-toolbar-tooltip
          preview-disabled
          width="106"
          height="106"
          style="border: 2px solid #fff"
          class="rounded-50% select-none cursor-pointer"
          :src="AvatarUtils.getAvatarUrl(item.avatar)"
          @dblclick="openImageViewer"
          alt="" />

        <n-flex vertical :size="16">
          <n-flex align="center" :size="12">
            <span class="text-(20px [--text-color])">{{ item.groupName }}</span>
            <n-popover trigger="hover" v-if="item.roomId === '1'">
              <template #trigger>
                <svg class="size-20px color-#13987f select-none outline-none cursor-pointer">
                  <use href="#auth"></use>
                </svg>
              </template>
              <span>官方群聊认证</span>
            </n-popover>
          </n-flex>
          <n-flex align="center" :size="12">
            <span class="text-(14px #909090)">群号 {{ item.accountCode }}</span>
            <n-tooltip trigger="hover">
              <template #trigger>
                <svg class="size-12px cursor-pointer color-#909090" @click="handleCopy(item.accountCode)">
                  <use href="#copy"></use>
                </svg>
              </template>
              <span>复制</span>
            </n-tooltip>
          </n-flex>
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

    <!-- 群信息列表 -->
    <n-flex vertical class="select-none w-full px-30px box-border">
      <n-flex align="center" justify="space-between" class="py-12px border-b text-(14px [--chat-text-color])">
        <span>备注</span>
        <span>{{ item.remark || '设置群聊备注' }}</span>
      </n-flex>

      <n-flex align="center" justify="space-between" class="py-12px border-b text-(14px [--chat-text-color])">
        <span>我的本群昵称</span>
        <span class="flex items-center cursor-pointer">
          <p class="text-#909090">{{ item.myName || '未设置' }}</p>
          <n-icon size="16" class="ml-1">
            <svg><use href="#right"></use></svg>
          </n-icon>
        </span>
      </n-flex>

      <n-flex align="center" justify="space-between" class="py-12px border-b text-(14px [--chat-text-color])">
        <span>群公告</span>
        <span class="flex items-center cursor-pointer">
          <p class="text-#909090">未设置</p>
          <n-icon size="16" class="ml-1">
            <svg><use href="#right"></use></svg>
          </n-icon>
        </span>
      </n-flex>
    </n-flex>

    <!-- 群成员 -->
    <n-flex vertical :size="10" class="px-30px box-border">
      <n-flex align="center" justify="space-between" class="text-(14px [--chat-text-color])">
        <span>群成员 ({{ item.memberNum }}人)</span>
        <span class="flex items-center">在线 {{ item.onlineNum }}人</span>
      </n-flex>

      <n-flex class="pt-16px">
        <n-avatar-group :options="options" :size="40" :max="10" expand-on-hover>
          <template #avatar="{ option: { src } }">
            <n-avatar :src="AvatarUtils.getAvatarUrl(src)" />
          </template>
        </n-avatar-group>
      </n-flex>
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
import type { UserItem } from '@/services/types'

const { openMsgSession } = useCommon()
const { createWebviewWindow } = useWindow()
const IMAGEWIDTH = 630
const IMAGEHEIGHT = 660
const { content } = defineProps<{
  content: any
}>()
const item = ref<any>(null)
const options = ref<Array<{ name: string; src: string }>>([])

watchEffect(() => {
  if (content.type === RoomTypeEnum.SINGLE) {
    item.value = useUserInfo(content.uid).value
  } else {
    apis.groupDetail({ id: content.uid }).then((response) => {
      console.log(response)
      item.value = response

      // 获取群成员列表
      if (item.value && item.value.roomId) {
        fetchGroupMembers(item.value.roomId)
      }
    })
  }
})

// 复制
const handleCopy = (accountCode: string) => {
  if (accountCode) {
    navigator.clipboard.writeText(accountCode)
    window.$message.success(`复制成功 ${accountCode}`)
  }
}

// 获取群成员列表
const fetchGroupMembers = async (roomId: string) => {
  try {
    const params = {
      roomId: roomId,
      current: 1,
      size: 10 // 获取前10个成员
    }
    const response = await apis.getGroupList(params)
    if (response && response.list) {
      console.log(response)

      // 使用每个成员的uid获取详细信息
      const memberDetails = response.list.map((member: UserItem) => {
        const userInfo = useUserInfo(member.uid).value
        return {
          name: userInfo.name || member.name || member.uid,
          src: userInfo.avatar || member.avatar
        }
      })

      options.value = memberDetails
    }
  } catch (error) {
    console.error('获取群成员失败:', error)
  }
}

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
