<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar :isOfficial="false" class="bg-white" border :hidden-right="true" room-name="群公告" />
    </template>

    <template #container>
      <div class="flex flex-col overflow-auto h-full relative">
        <img
          src="@/assets/mobile/chat-home/background.webp"
          class="absolute t-0 l-0 w-full h-full z-0 dark:opacity-20" />
        <div class="flex flex-col flex-1 gap-15px py-15px px-20px">
          <RecycleScroller :items="announList" :item-size="15" key-field="id" class="flex flex-col gap-15px">
            <template #default="{ item }">
              <!-- 公告内容块 -->
              <n-card content-class="p-15px!" class="rounded-10px">
                <div @click="goToNoticeDetail(item.id)">
                  <div class="flex flex-col w-full gap-10px">
                    <!-- 时间/阅读人数 -->
                    <div class="flex items-center justify-between text-14px">
                      <span class="flex gap-5px">
                        <span class="text-#717171">发布人:</span>
                        <span class="text-black dark:text-white/80">{{ groupStore.getUserInfo(item.uid)?.name }}</span>
                      </span>
                      <span
                        v-if="item.isTop"
                        class="text-#13987F rounded-15px px-7px py-5px text-12px"
                        style="border: 1px solid; border-color: #13987f">
                        置顶
                      </span>
                    </div>
                    <!-- 公告内容 -->
                    <div class="text-14px line-clamp-3 line-height-20px text-#717171 max-h-60px">
                      {{ item.content }}
                    </div>

                    <div class="flex items-center justify-between text-12px">
                      <span class="flex gap-5px text-#717171">{{ formatTimestamp(item.createTime) }}</span>
                      <span class="text-#13987F">128人已读</span>
                    </div>
                  </div>
                </div>
              </n-card>
            </template>
          </RecycleScroller>
        </div>

        <!-- 右下角悬浮气泡 - 仅群主、管理员或特定徽章用户可见 -->
        <van-floating-bubble v-if="canAddAnnouncement" axis="xy" magnetic="x" @click="goToAddNotice">
          <template #default>
            <svg class="w-24px h-24px iconpark-icon text-white"><use href="#plus"></use></svg>
          </template>
        </van-floating-bubble>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { RecycleScroller } from 'vue-virtual-scroller'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { useGlobalStore } from '@/stores/global'
import { useCachedStore } from '@/stores/cached'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { onActivated } from 'vue'

defineOptions({
  name: 'mobileChatNoticeList'
})

const route = useRoute()
const router = useRouter()
const announList = ref<any[]>([])
const groupStore = useGroupStore()
const userStore = useUserStore()
const globalStore = useGlobalStore()
const cacheStore = useCachedStore()

// 判断当前用户是否有权限添加公告
const canAddAnnouncement = computed(() => {
  if (!userStore.userInfo?.uid) return false

  const isLord = groupStore.isCurrentLord(userStore.userInfo.uid) ?? false
  const isAdmin = groupStore.isAdmin(userStore.userInfo.uid) ?? false

  // 判断当前用户是否拥有id为6的徽章 并且是频道
  const hasBadge6 = () => {
    if (globalStore.currentSessionRoomId !== '1') return false

    const currentUser = groupStore.getUserInfo(userStore.userInfo!.uid)
    return currentUser?.itemIds?.includes('6') ?? false
  }

  return isLord || isAdmin || hasBadge6()
})

// 加载群公告列表
const loadAnnouncementList = async () => {
  try {
    const roomId = globalStore.currentSessionRoomId
    if (!roomId) {
      console.error('当前会话没有roomId')
      return
    }

    const data = await cacheStore.getGroupAnnouncementList(roomId, 1, 10)
    if (data && data.records) {
      announList.value = data.records
      // 处理置顶公告
      if (announList.value && announList.value.length > 0) {
        const topAnnouncement = announList.value.find((item: any) => item.top)
        if (topAnnouncement) {
          announList.value = [topAnnouncement, ...announList.value.filter((item: any) => !item.top)]
        }
      }
    }
  } catch (error) {
    console.error('加载群公告失败:', error)
  }
}

const goToNoticeDetail = (id: string) => {
  // 跳转到公告详情页面
  console.log(`跳转到公告详情页面，公告ID: ${id}`)
  router.push(`/mobile/chatRoom/notice/detail/${id}`)
}

const goToAddNotice = () => {
  // 跳转到新增公告页面
  console.log('跳转到新增公告页面')
  router.push('/mobile/chatRoom/notice/add')
}

onMounted(() => {
  // 首次加载时从路由参数获取数据
  if (route.query.announList) {
    announList.value = JSON.parse(route.query.announList as string)
  } else {
    // 如果没有路由参数，则从服务器加载
    loadAnnouncementList()
  }
})

// 当页面被激活时（从其他页面返回），重新加载数据
onActivated(() => {
  loadAnnouncementList()
})
</script>

<style scoped></style>
