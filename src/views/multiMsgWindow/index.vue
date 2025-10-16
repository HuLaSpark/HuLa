<template>
  <div class="multi-msg-container">
    <!--顶部操作栏-->
    <ActionBar :shrink="false" />

    <!-- 消息列表 -->
    <n-scrollbar>
      <template v-for="item in msgs" :key="item.message.id">
        <div class="py-12px mb-16px mx-20px">
          <!-- 消息头像和信息 -->
          <div class="flex cursor-default">
            <n-avatar
              :size="32"
              :src="getAvatarSrc(item.fromUser.uid)"
              class="rounded-10px mr-12px"
              fallback-src="/default-avatar.png" />

            <div class="flex-y-center gap-12px h-fit">
              <p class="text-(14px #909090)">{{ getUserDisplayName(item.fromUser.uid) }}</p>
              <p class="text-(12px #909090)">{{ formatTimestamp(item.message.sendTime) }}</p>
            </div>
          </div>

          <ContextMenu
            :content="item"
            class="w-fit relative flex flex-col pl-44px text-(14px [--text-color]) leading-26px user-select-text"
            :data-key="item.fromUser.uid === userUid ? `U${item.message.id}` : `Q${item.message.id}`"
            :special-menu="specialMenuList(item.message.type)"
            @select="$event.click(item)">
            <div :class="{ bubble: !isSpecialMsgType(item.message.type) }">
              <RenderMessage
                :message="item"
                :from-user="item.fromUser"
                :is-group="true"
                :on-image-click="handleImageClick"
                :on-video-click="handleVideoClick"
                :history-mode="true" />
            </div>
          </ContextMenu>
        </div>
      </template>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import RenderMessage from '@/components/rightBox/renderMessage/index.vue'
import { MsgEnum } from '@/enums'
import { useChatMain } from '@/hooks/useChatMain'
import { useImageViewer } from '@/hooks/useImageViewer'
import { useVideoViewer } from '@/hooks/useVideoViewer'
import { useWindow } from '@/hooks/useWindow'
import type { MessageType, UserItem } from '@/services/types'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { getMsgList, getUserByIds } from '@/utils/ImRequestUtils'

type Msg = {
  msgId: string
  fromUid: string
}

const { getWindowPayload } = useWindow()
const userStore = useUserStore()
const groupStore = useGroupStore()
const { openImageViewer } = useImageViewer()
const { openVideoViewer } = useVideoViewer()
const { specialMenuList } = useChatMain(true, { disableHistoryActions: true })

const choosedMsgs = ref<Msg[]>([])
const msgs = ref<MessageType[]>([])
const users = ref<UserItem[]>([])
const route = useRoute()

const userUid = computed(() => userStore.userInfo?.uid)

const isSpecialMsgType = (type: number): boolean => {
  return (
    type === MsgEnum.IMAGE ||
    type === MsgEnum.EMOJI ||
    type === MsgEnum.NOTICE ||
    type === MsgEnum.VIDEO ||
    type === MsgEnum.FILE ||
    type === MsgEnum.MERGE
  )
}

// 我的群昵称
const getUserDisplayName = computed(() => (uid: string) => {
  const user = groupStore.getUserInfo(uid)
  return user?.myName || user?.name || ''
})

// 获取用户头像
const getAvatarSrc = (uid: string) => {
  const avatar = uid === userUid.value ? userStore.userInfo!.avatar : groupStore.getUserInfo(uid)?.avatar
  return AvatarUtils.getAvatarUrl(avatar as string)
}

// 获取当前页面的所有图片和表情URL
const getAllImageUrls = computed(() => {
  const imageUrls: string[] = []
  msgs.value.forEach((message) => {
    if (
      (message.message.type === MsgEnum.IMAGE || message.message.type === MsgEnum.EMOJI) &&
      message.message.body?.url
    ) {
      imageUrls.push(message.message.body.url)
    }
  })
  return imageUrls
})

// 获取当前页面的所有视频URL
const getAllVideoUrls = computed(() => {
  const videoUrls: string[] = []
  msgs.value.forEach((message) => {
    if (message.message.type === MsgEnum.VIDEO && message.message.body?.url) {
      videoUrls.push(message.message.body.url)
    }
  })
  return videoUrls
})

// 处理图片和表情点击事件
const handleImageClick = async (imageUrl: string) => {
  const imageList = getAllImageUrls.value
  await openImageViewer(imageUrl, [MsgEnum.IMAGE, MsgEnum.EMOJI], imageList)
}

// 处理视频点击事件
const handleVideoClick = async (videoUrl: string) => {
  const videoList = getAllVideoUrls.value
  const currentIndex = videoList.indexOf(videoUrl)

  if (currentIndex === -1) {
    await openVideoViewer(videoUrl, [MsgEnum.VIDEO], [videoUrl])
  } else {
    // 使用多视频模式
    await openVideoViewer(videoUrl, [MsgEnum.VIDEO], videoList)
  }
}

const getAllMsg = async () => {
  const msgIds = choosedMsgs.value.map((msg) => msg.msgId)
  msgs.value = await getMsgList({ msgIds })
}

const getAllUserInfo = async () => {
  const uids = choosedMsgs.value.map((msg) => msg.fromUid)
  users.value = await getUserByIds(uids)
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  getWindowPayload<Msg[]>(route.query.key as string)
    .then(async (data) => {
      choosedMsgs.value = data
      await getAllMsg()
      await getAllUserInfo()
    })
    .catch((e) => {
      console.error(e)
    })
})
</script>

<style scoped lang="scss">
.multi-msg-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-left-menu);
}

.user-select-text {
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  user-select: text !important;
}

.bubble {
  max-width: 70vw;
  word-wrap: break-word;
}
</style>
