<template>
  <!-- 消息为机器人消息时 -->
  <main class="w-full flex-center">
    <div
      class="chat-message-max-width dark:bg-[#fbb99020] bg-[#fbb99030] dark:border-(1px solid #fbb99020) border-(1px solid #fbb99040) flex-center chat-bot-message-gap px-12px py-4px rounded-8px">
      <n-avatar class="select-none" round :size="22" :src="getAvatarSrc(fromUserUid)" />
      <div
        v-for="(part, index) in parseMessage(body.content)"
        :key="index"
        class="text-(12px #fbb990) select-none cursor-default">
        <p v-if="part.type === 'text'">{{ part.text }}</p>
        <p v-else-if="part.type === 'bracket'" class="text-#13987f truncate max-w-20">
          {{ part.text }}
        </p>
        <p v-else-if="part.type === 'number'" class="text-#fbb160">{{ part.text }}</p>
      </div>
      <img class="size-18px" src="/emoji/party-popper.webp" alt="" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useGroupStore } from '@/stores/group'

interface Props {
  body: any
  fromUserUid: string
}

defineProps<Props>()

const userStore = useUserStore()
const groupStore = useGroupStore()

const userUid = computed(() => userStore.userInfo!.uid)

// 处理机器人消息内容，高亮[]包裹的内容
const parseMessage = (content: string) => {
  if (!content) return []

  // 安全的文本解析，无HTML注入风险
  return content
    .split(/(\[.*?\]|\d+)/)
    .map((part) => {
      if (part.match(/^\[.*\]$/)) {
        return { type: 'bracket', text: part.slice(1, -1) }
      } else if (part.match(/^\d+$/)) {
        return { type: 'number', text: part }
      }
      return { type: 'text', text: part }
    })
    .filter((part) => part.text)
}

// 获取用户头像
const getAvatarSrc = (uid: string) => {
  const avatar = uid === userUid.value ? userStore.userInfo!.avatar : groupStore.getUserInfo(uid)?.avatar
  return AvatarUtils.getAvatarUrl(avatar as string)
}
</script>
