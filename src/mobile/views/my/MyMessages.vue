<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="我的消息" />
    </template>

    <template #container="{ height }">
      <div :style="{ height: height + 'px' }" class="z-2 flex flex-col absolute overflow-auto min-h-70vh w-full">
        <div class="flex flex-col p-20px gap-20px">
          <!-- <n-avatar :size="40"  fallback-src="/logo.png" round /> -->
          <MyMessageItem v-for="item in fakeData" :key="item.id" :message="item" />
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'

type MessageType = 'follow' | 'like' | 'comment' | 'thumbs' | 'system' | 'reply'

interface Message {
  id: number
  content: string
  type: MessageType
}

const fakeData: Ref<Message[]> = computed(() => [
  { id: 1, content: '关注了你，想了解更多你的动态', type: 'follow' },
  { id: 2, content: '点赞了你的动态「今天天气真好」', type: 'like' },
  {
    id: 3,
    content:
      '评论了你的动态：我觉得这个观点非常有意思评论了你的动态：我觉得这个观点非常有意思评论了你的动态：我觉得这个观点非常有意思',
    type: 'comment'
  },
  { id: 4, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 5, content: '系统消息：你有新的好友推荐', type: 'system' },
  { id: 6, content: '关注了你，快去看看他的主页吧', type: 'follow' },
  { id: 7, content: '点赞了你的动态「刚刚完成的项目分享」', type: 'like' },
  { id: 8, content: '评论了你的动态：这个方法真的可行吗？', type: 'comment' },
  { id: 9, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 10, content: '系统消息：你的设置已成功保存', type: 'system' },
  {
    id: 11,
    content:
      '回复了你的评论：我也遇到过类似问题，建议试试这个方法我也遇到过类似问题，建议试试这个方法我也遇到过类似问题，建议试试这个方法我也遇到过类似问题，建议试试这个方法',
    type: 'reply'
  },
  { id: 12, content: '回复了你的动态：哈哈，这个真的太搞笑了', type: 'reply' },
  { id: 13, content: '关注了你，希望能看到更多你的分享', type: 'follow' },
  { id: 14, content: '点赞了你的动态「新年快乐！」', type: 'like' },
  { id: 15, content: '评论了你的动态：这个思路很新颖，我很喜欢', type: 'comment' },
  { id: 16, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 17, content: '系统消息：你已达到每日活跃任务', type: 'system' },
  { id: 18, content: '回复了你的评论：你的建议我已经采纳了，谢谢！', type: 'reply' },
  { id: 19, content: '关注了你，想看看你的最近分享', type: 'follow' },
  { id: 20, content: '点赞了你的动态「今日学习笔记」', type: 'like' },
  { id: 21, content: '关注了你', type: 'follow' },
  { id: 22, content: '点赞了你的动态', type: 'like' },
  { id: 23, content: '评论了你的动态', type: 'comment' },
  { id: 24, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 25, content: '系统消息', type: 'system' },
  { id: 26, content: '关注了你', type: 'follow' },
  { id: 27, content: '点赞了你的动态', type: 'like' },
  { id: 28, content: '评论了你的动态', type: 'comment' },
  { id: 29, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 30, content: '系统消息', type: 'system' },
  { id: 31, content: '关注了你', type: 'follow' },
  { id: 32, content: '点赞了你的动态', type: 'like' },
  { id: 33, content: '评论了你的动态', type: 'comment' },
  { id: 34, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 35, content: '系统消息', type: 'system' },
  { id: 36, content: '关注了你', type: 'follow' },
  { id: 37, content: '点赞了你的动态', type: 'like' },
  { id: 38, content: '评论了你的动态', type: 'comment' },
  { id: 39, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 40, content: '系统消息', type: 'system' },
  { id: 41, content: '关注了你', type: 'follow' },
  { id: 42, content: '点赞了你的动态', type: 'like' },
  { id: 43, content: '评论了你的动态', type: 'comment' },
  { id: 44, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 45, content: '系统消息', type: 'system' },
  { id: 46, content: '关注了你', type: 'follow' },
  { id: 47, content: '点赞了你的动态', type: 'like' },
  { id: 48, content: '评论了你的动态', type: 'comment' },
  { id: 49, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 50, content: '系统消息', type: 'system' },
  { id: 51, content: '关注了你', type: 'follow' },
  { id: 52, content: '点赞了你的动态', type: 'like' },
  { id: 53, content: '评论了你的动态', type: 'comment' },
  { id: 54, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 55, content: '系统消息', type: 'system' },
  { id: 56, content: '关注了你', type: 'follow' },
  { id: 57, content: '点赞了你的动态', type: 'like' },
  { id: 58, content: '评论了你的动态', type: 'comment' },
  { id: 59, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 60, content: '系统消息', type: 'system' },
  { id: 61, content: '关注了你', type: 'follow' },
  { id: 62, content: '点赞了你的动态', type: 'like' },
  { id: 63, content: '评论了你的动态', type: 'comment' },
  { id: 64, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 65, content: '系统消息', type: 'system' },
  { id: 66, content: '关注了你', type: 'follow' },
  { id: 67, content: '点赞了你的动态', type: 'like' },
  { id: 68, content: '评论了你的动态', type: 'comment' },
  { id: 69, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 70, content: '系统消息', type: 'system' },
  { id: 71, content: '关注了你', type: 'follow' },
  { id: 72, content: '点赞了你的动态', type: 'like' },
  { id: 73, content: '评论了你的动态', type: 'comment' },
  { id: 74, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 75, content: '系统消息', type: 'system' },
  { id: 76, content: '关注了你', type: 'follow' },
  { id: 77, content: '点赞了你的动态', type: 'like' },
  { id: 78, content: '评论了你的动态', type: 'comment' },
  { id: 79, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 80, content: '系统消息', type: 'system' },
  { id: 81, content: '关注了你', type: 'follow' },
  { id: 82, content: '点赞了你的动态', type: 'like' },
  { id: 83, content: '评论了你的动态', type: 'comment' },
  { id: 84, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 85, content: '系统消息', type: 'system' },
  { id: 86, content: '关注了你', type: 'follow' },
  { id: 87, content: '点赞了你的动态', type: 'like' },
  { id: 88, content: '评论了你的动态', type: 'comment' },
  { id: 89, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 90, content: '系统消息', type: 'system' },
  { id: 91, content: '关注了你', type: 'follow' },
  { id: 92, content: '点赞了你的动态', type: 'like' },
  { id: 93, content: '评论了你的动态', type: 'comment' },
  { id: 94, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 95, content: '系统消息', type: 'system' },
  { id: 96, content: '关注了你', type: 'follow' },
  { id: 97, content: '点赞了你的动态', type: 'like' },
  { id: 98, content: '评论了你的动态', type: 'comment' },
  { id: 99, content: '给你发送了一个赞', type: 'thumbs' },
  { id: 100, content: '系统消息', type: 'system' }
])
</script>

<style scoped></style>
