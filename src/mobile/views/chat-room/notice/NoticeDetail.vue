<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="公告详情" />
    </template>

    <template #container>
      <div
        class="bg-[url('@/assets/mobile/chat-home/background.webp')] bg-cover bg-center flex flex-col overflow-auto h-full">
        <div class="flex flex-col flex-1 gap-15px py-15px px-20px">
          <div v-if="loading" class="flex justify-center items-center h-200px">
            <n-spin size="large" />
          </div>

          <div v-else-if="announcement" class="bg-white flex flex-col shadow p-10px gap-15px text-14px rounded-15px">
            <!-- 公告头部信息 -->
            <div
              style="border-bottom: 1px solid; border-color: #ebebeb"
              class="grid grid-cols-[2.2rem_1fr_4rem] items-start px-2 py-3 gap-1">
              <!-- 头像 -->
              <div class="self-center h-38px">
                <n-badge>
                  <n-avatar :size="40" :src="publisherAvatar" :fallback-src="getFallbackAvatar()" round />
                </n-badge>
              </div>

              <!-- 发布人信息 -->
              <div class="truncate pl-4 flex gap-10px flex-col">
                <div class="text-14px leading-tight font-bold flex-1 truncate text-#333">
                  {{ publisherName }}
                </div>
                <div class="text-12px text-#333">
                  {{ formatTimestamp(announcement.createTime) }}
                </div>
              </div>

              <!-- 阅读统计 -->
              <div class="justify-self-end self-center text-12px text-right flex gap-1 items-center">
                <span class="text-#13987F">{{ announcement.readCount || 0 }}人已读</span>
              </div>
            </div>

            <!-- 公告内容 -->
            <div class="announcement-content whitespace-pre-wrap break-words text-14px leading-6 text-#333">
              {{ announcement.content }}
            </div>

            <!-- 编辑按钮（仅管理员/群主可见） -->
            <div v-if="canEdit" class="flex justify-center mb-10px">
              <div
                @click="goToNoticeEdit"
                style="
                  background: linear-gradient(145deg, #7eb7ac, #6fb0a4, #5fa89c);
                  border-radius: 30px;
                  padding: 10px 30px;
                  color: white;
                  font-weight: 500;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                  text-align: center;
                  display: inline-block;
                  cursor: pointer;
                ">
                编辑公告
              </div>
            </div>
          </div>

          <div v-else class="flex justify-center items-center h-200px text-#909090">公告不存在或已被删除</div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useGroupStore } from '@/stores/group'
import { useGlobalStore } from '@/stores/global'
import { useUserStore } from '@/stores/user'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { getAnnouncementDetail } from '@/utils/ImRequestUtils'

defineOptions({
  name: 'mobileChatNoticeDetail'
})

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const globalStore = useGlobalStore()
const userStore = useUserStore()

const announcement = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// 获取发布者信息
const publisherName = computed(() => {
  if (!announcement.value) return '未知用户'
  const userInfo = groupStore.getUserInfo(announcement.value.uid)
  return userInfo?.name || userInfo?.myName || '未知用户'
})

const publisherAvatar = computed(() => {
  if (!announcement.value) return ''
  const userInfo = groupStore.getUserInfo(announcement.value.uid)
  return userInfo?.avatar || ''
})

// 获取默认头像
const getFallbackAvatar = () => {
  return '/logo.png'
}

const canEdit = computed(() => {
  if (!announcement.value) return false

  // 当前用户是公告发布者
  const isPublisher = announcement.value.uid === userStore.userInfo?.uid

  // 当前用户是群主或管理员
  const isLord = groupStore.isCurrentLord(userStore.userInfo?.uid!)
  const isAdmin = groupStore.isAdmin(userStore.userInfo?.uid!)
  return isPublisher || isLord || isAdmin
})

// 获取公告详情
const fetchAnnouncementDetail = async () => {
  try {
    loading.value = true

    const data = await getAnnouncementDetail({
      roomId: globalStore.currentSessionRoomId,
      announcementId: route.params.id as string
    })
    announcement.value = data
  } catch (err) {
    console.error('获取公告详情失败:', err)
    error.value = '获取公告详情失败，请重试'
  } finally {
    loading.value = false
  }
}

// 跳转到编辑页面
const goToNoticeEdit = () => {
  if (announcement.value) {
    router.push(`/mobile/chatRoom/notice/edit/${announcement.value.id}`)
  }
}

onMounted(() => {
  fetchAnnouncementDetail()
})
</script>

<style scoped>
.announcement-content {
  line-height: 1.6;
  max-height: none; /* 移除高度限制，让内容自然滚动 */
  overflow-y: auto;
}

/* 确保长文本和换行显示正常 */
.whitespace-pre-wrap {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
