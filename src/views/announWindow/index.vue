<template>
  <main v-cloak class="size-full bg-[--right-bg-color] select-none cursor-default">
    <ActionBar :shrink="false" :max-w="false" />
    <!-- 编辑公告视图 -->
    <n-flex v-if="viewType === '0' && isAdmin" vertical class="size-full flex-center">
      <div class="text-(14px [--chat-text-color]) flex-start-center w-95% h-40px">{{ title }}</div>
      <div class="w-95%">
        <n-input
          class="max-h-480px border-(1px solid #90909080) rounded-6px bg-[--center-bg-color]"
          v-model:value="announContent"
          type="textarea"
          placeholder="填写公告，1～600字"
          :autosize="{ minRows: 20 }"
          maxlength="600"
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          show-count
          autofocus />
      </div>
      <n-flex justify="space-between" class="w-95%">
        <div class="w-40% h-42px flex-start-center">
          <!--是否置顶-->
          <n-switch
            class="bg-[--button-bg]"
            size="small"
            v-model:value="isTop"
            :true-value="true"
            :false-value="false" />
          <span class="text-(14px [--text-color]) ml-10px">置顶</span>
        </div>
        <div class="w-45% h-42px flex-end-center">
          <n-button quaternary size="small" class="bg-[--button-bg]" @click="handleCancel">取消</n-button>
          <n-button
            secondary
            type="primary"
            size="small"
            class="bg-[--button-bg] ml-5px"
            @click="handlePushAnnouncement">
            发布
          </n-button>
        </div>
      </n-flex>
    </n-flex>
    <!-- 查看公告列表视图 -->
    <n-flex v-else vertical :size="6" class="size-full flex-center">
      <div class="text-(14px [--chat-text-color]) flex-between-center w-95% pt-10px">
        <span>{{ title }}</span>
        <n-button v-if="isAdmin" size="small" secondary @click="handleNew">发布新公告</n-button>
      </div>

      <!--暂无数据-->
      <div v-if="!announList || announList.length === 0" class="flex-center">
        <n-empty style="height: calc(100vh - 100px)" class="flex-center" description="暂无公告">
          <template #icon>
            <n-icon>
              <svg>
                <use href="#explosion"></use>
              </svg>
            </n-icon>
          </template>
        </n-empty>
      </div>

      <n-scrollbar @scroll="handleScroll" v-else class="h-95%">
        <!-- 展示公告列表 -->
        <div class="w-full flex-col-x-center">
          <div
            v-for="announcement in announList"
            :key="announcement.id"
            class="w-91% h-auto bg-[--group-notice-list-bg] flex-start-center flex-col p-[0px_8px_12px_8px] border-[1px --group-notice-list-bg] mt-10px rounded-6px">
            <div class="w-full h-40px flex-start-center">
              <div class="size-full flex-between-center">
                <n-flex align="center" :size="16" class="pl-4px pt-4px">
                  <n-flex align="center" :size="6">
                    <n-avatar round :size="28" :src="avatarSrc(announcement.uid)" fallback-src="/logo.png" />
                    <n-flex vertical :size="4">
                      <div class="text-(12px [--chat-text-color])">{{ useUserInfo(announcement.uid).value.name }}</div>
                      <div class="text-(12px [#909090])">{{ announcement?.publishTime }}</div>
                    </n-flex>
                  </n-flex>
                  <div
                    v-if="announcement?.top"
                    class="p-[3px_4px] bg-[#237265] c-#fff rounded-3px text-[10px] flex-center">
                    <span>置顶</span>
                  </div>
                </n-flex>

                <n-flex align="center" :size="6">
                  <n-button class="rounded-6px" v-if="isAdmin" @click="handleEdit(announcement)" quaternary size="tiny">
                    <template #icon>
                      <svg class="size-14px">
                        <use href="#edit"></use>
                      </svg>
                    </template>
                  </n-button>
                  <n-popconfirm v-if="isAdmin" v-model:show="announcementStates[announcement.id].showDeleteConfirm">
                    <template #icon>
                      <svg class="size-22px"><use href="#explosion"></use></svg>
                    </template>
                    <template #action>
                      <n-button
                        size="small"
                        tertiary
                        @click.stop="announcementStates[announcement.id].showDeleteConfirm = false"
                        >取消</n-button
                      >
                      <n-button
                        size="small"
                        type="error"
                        :loading="announcementStates[announcement.id].deleteLoading"
                        @click="handleDel(announcement)">
                        删除
                      </n-button>
                    </template>
                    <template #trigger>
                      <n-button class="rounded-6px" quaternary size="tiny">
                        <template #icon>
                          <svg class="size-14px">
                            <use href="#delete"></use>
                          </svg>
                        </template>
                      </n-button>
                    </template>
                    你确定要删除全部会话吗？
                  </n-popconfirm>
                </n-flex>
              </div>
            </div>
            <div
              class="w-full select-text cursor-auto text-(13px [--text-color]) ws-pre-wrap line-height-tight pt-12px break-words">
              <div
                :class="[
                  'content-wrapper',
                  { 'content-collapsed': !announcement.expanded && needsExpansion(announcement.content) }
                ]">
                {{ announcement?.content }}
              </div>
              <div
                v-if="needsExpansion(announcement.content)"
                class="expand-button"
                @click.stop="toggleExpand(announcement)">
                <span>{{ announcement.expanded ? '收起' : '展开' }}</span>
                <svg class="size-12px ml-2px" :class="{ 'rotate-180': announcement.expanded }">
                  <use href="#arrow-down"></use>
                </svg>
              </div>
            </div>
          </div>
        </div>
        <!-- 加载更多 -->
        <div v-if="announList.length > 0" class="w-full h-40px flex-center mt-10px">
          <!-- <n-button v-if="!isLast" class="bg-[--button-bg]" @click="handleLoadMore">加载更多</n-button> -->
          <img v-if="isLoading" class="size-16px" src="@/assets/img/loading.svg" alt="" />
          <span v-if="isLast && !isLoading" class="text-[12px] color-[#909090]">没有更多公告了</span>
        </div>
        <div class="w-full h-40px"></div>
      </n-scrollbar>
    </n-flex>
  </main>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import apis from '@/services/apis'
import { useRoute } from 'vue-router'
import { useGroupStore } from '@/stores/group.ts'
import { useCachedStore } from '@/stores/cached'
import { useUserStore } from '@/stores/user'
import { useUserInfo } from '@/hooks/useCached.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { emitTo } from '@tauri-apps/api/event'

// 定义响应式变量
const title = ref('')
const announContent = ref('')
const roomId = ref('')
const $route = useRoute()
const viewType = ref('0')
const announList = ref<any[]>([])
const isBack = ref(false)
const isTop = ref(false)
const isEdit = ref(false)
const editAnnoouncement = ref<any>({})
// 分页参数
const pageSize = 10
const pageNum = ref(1)
// 已经到底了
const isLast = ref(false)
const isLoading = ref(false)
const announcementStates = ref<Record<string, { showDeleteConfirm: boolean; deleteLoading: boolean }>>({})

// 引入 group store
const groupStore = useGroupStore()
const cachedStore = useCachedStore()
const userStore = useUserStore()
/** 判断当前用户是否拥有id为6的徽章 并且是频道 */
const hasBadge6 = computed(() => {
  // 只有当 roomId 为 "1" 时才进行徽章判断（频道）
  if (roomId.value !== '1') return false

  const currentUser = useUserInfo(userStore.userInfo?.uid).value
  return currentUser?.itemIds?.includes('6')
})
const isAdmin = computed(() => {
  let LordId = groupStore.currentLordId
  let adminUserTds = groupStore.adminUidList
  let uid = useUserStore().userInfo?.uid
  // 由于 uid 可能为 undefined，需要进行类型检查，确保其为 string 类型
  if (uid && (uid === LordId || adminUserTds.includes(uid) || hasBadge6.value)) {
    return true
  }
  return false
})

watch(
  () => viewType.value,
  (newVal) => {
    if (newVal === '0') {
      title.value = '新增群公告'
    }
  }
)

const avatarSrc = (uid: string) => AvatarUtils.getAvatarUrl(useUserInfo(uid).value.avatar as string)

// 初始化函数，获取群公告列表
const handleInit = async () => {
  if (roomId.value) {
    try {
      pageNum.value = 1
      isLast.value = false
      const data = await cachedStore.getGroupAnnouncementList(roomId.value, pageNum.value, pageSize)
      if (data) {
        announList.value = data.records
        if (announList.value.length === 0) {
          viewType.value = '0'
          return
        }

        // 处理公告的userName getUserGroupNickname
        announList.value.forEach((item) => {
          item.userName = cachedStore.getUserGroupNickname(item.uid, roomId.value)
          // 添加展开/收起状态控制
          item.expanded = false
          announcementStates.value[item.id] = {
            showDeleteConfirm: false,
            deleteLoading: false
          }
        })

        // 处理置顶公告，置顶的公告排在列表前面
        announList.value.sort((a, b) => {
          if (a.top && !b.top) return -1
          if (!a.top && b.top) return 1
          return 0
        })
        pageNum.value++
      }
    } catch (error) {
      console.error('获取群公告列表失败:', error)
    }
  }
}

/**
 * 处理滚动事件
 * @param event 滚动事件
 */
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  const isBottom = target.scrollHeight - target.scrollTop === target.clientHeight

  if (isBottom && !isLast.value) {
    handleLoadMore()
  }
}

// 加载更多公告
const handleLoadMore = async () => {
  if (roomId.value && !isLoading.value && !isLast.value) {
    try {
      isLoading.value = true
      const data = await cachedStore.getGroupAnnouncementList(roomId.value, pageNum.value, pageSize)
      if (data) {
        // 如果没有数据，标记为最后一页
        if (!data.records) {
          isLast.value = true
          return
        }

        // 检查重复数据
        const existingIds = new Set(announList.value.map((item) => item.id))
        const newRecords = data.records.filter((newItem: any) => !existingIds.has(newItem.id))

        // 为新加载的公告添加展开/收起状态
        newRecords.forEach((item: any) => {
          item.expanded = false
          announcementStates.value[item.id] = {
            showDeleteConfirm: false,
            deleteLoading: false
          }
          // 处理公告的userName
          item.userName = cachedStore.getUserGroupNickname(item.uid, roomId.value)
        })

        // 添加新的非重复数据到列表中
        if (newRecords.length > 0) {
          announList.value.push(...newRecords)
          // 判断累计加载的数据量是否达到总数
          if (announList.value.length >= Number(data.total)) {
            isLast.value = true
            return
          }
          pageNum.value++
        } else if (pageNum.value < Number(data.pages)) {
          // 如果当前页没有新数据但还没到最后一页，尝试加载下一页
          pageNum.value++
          handleLoadMore()
          return
        } else {
          isLast.value = true
        }
      }
    } catch (error) {
      console.error('加载更多公告失败:', error)
    } finally {
      isLoading.value = false
    }
  }
}

// 切换到编辑公告视图
const handleNew = () => {
  announContent.value = ''
  viewType.value = '0'
  isBack.value = true
  isEdit.value = false
  title.value = '新增群公告'
}

// 处理取消操作
const handleCancel = () => {
  announContent.value = ''
  if (isBack.value) {
    viewType.value = '1'
    isBack.value = false
    title.value = '查看群公告'
    return
  }
  getCurrentWebviewWindow().close()
}

// 删除公告
const handleDel = async (announcement: any) => {
  try {
    announcementStates.value[announcement.id].deleteLoading = true

    // 同时处理删除请求和最小延迟时间
    await Promise.all([apis.deleteAnnouncement(announcement.id), new Promise((resolve) => setTimeout(resolve, 600))])

    // 重置该公告的确认框状态
    announcementStates.value[announcement.id].showDeleteConfirm = false
    announcementStates.value[announcement.id].deleteLoading = false

    // 重新获取公告列表
    await handleInit()

    // 找出新的置顶公告
    let newTopAnnouncement = null
    if (announList.value.length > 0) {
      newTopAnnouncement = announList.value.find((item: any) => item.top)
    }

    // 发送刷新消息通知其他组件
    if (announList.value.length === 0) {
      // 如果没有公告了，发送清空事件
      emitTo('home', 'announcementClear')
    }

    // 无论如何都要发送更新事件，携带最新状态
    emitTo('home', 'announcementUpdated', {
      hasAnnouncements: announList.value.length > 0,
      topAnnouncement: newTopAnnouncement
    })
  } catch (error) {
    console.error('删除公告失败:', error)
    announcementStates.value[announcement.id].deleteLoading = false
  }
}

// 编辑公告
const handleEdit = (announcement: any) => {
  isEdit.value = true
  editAnnoouncement.value = announcement
  announContent.value = announcement.content
  isTop.value = announcement.top
  viewType.value = '0'
  isBack.value = true
  title.value = '编辑群公告'
}

// 验证公告内容
const validateAnnouncement = (content: string) => {
  if (content.length < 1) {
    window.$message.error('公告内容不能为空')
    return false
  }
  if (content.length > 600) {
    window.$message.error('公告内容不能超过600字')
    return false
  }
  return true
}

// 发布公告
const handlePushAnnouncement = async () => {
  if (!validateAnnouncement(announContent.value)) {
    return
  }

  const apiCall = isEdit.value
    ? () =>
        apis.editAnnouncement({
          id: editAnnoouncement.value.id,
          roomId: roomId.value,
          content: announContent.value,
          top: isTop.value
        })
    : () =>
        apis.pushAnnouncement({
          roomId: roomId.value,
          content: announContent.value,
          top: isTop.value
        })

  const successMessage = isEdit.value ? '公告修改成功' : '公告发布成功'
  const errorMessage = isEdit.value ? '公告修改失败' : '公告发布失败'

  try {
    await apiCall()
    window.$message.success(successMessage)

    // 重新获取公告列表
    await handleInit()

    // 找出新的置顶公告
    let newTopAnnouncement = null
    if (announList.value.length > 0) {
      newTopAnnouncement = announList.value.find((item: any) => item.top)
    }

    // 发送更新事件通知其他组件
    emitTo('home', 'announcementUpdated', {
      hasAnnouncements: announList.value.length > 0,
      topAnnouncement: newTopAnnouncement
    })

    if (!isEdit.value) {
      setTimeout(() => {
        getCurrentWebviewWindow().close()
      }, 1000)
    } else {
      viewType.value = '1'
      isBack.value = false
    }
  } catch (error) {
    console.error(errorMessage, error)
    window.$message.error(errorMessage)
  }
}

// 控制内容展开/收起
const needsExpansion = (content: string) => {
  return content && content.length > 80 // 根据实际情况调整，大约200px的文本量
}

// 切换展开/收起状态
const toggleExpand = (announcement: any) => {
  announcement.expanded = !announcement.expanded
}

// 组件挂载时执行初始化操作
onMounted(async () => {
  try {
    await nextTick()
    roomId.value = $route.params.roomId as string
    viewType.value = $route.params.type as string

    await handleInit()

    setTimeout(async () => {
      const currentWindow = getCurrentWebviewWindow()
      await currentWindow.show()
      await currentWindow.setFocus()
      title.value = await currentWindow.title()
    }, 200)
  } catch (error) {
    console.error('组件挂载初始化失败:', error)
  }
})
</script>
<style scoped lang="scss">
[v-cloak] {
  display: none;
}

.content-wrapper {
  position: relative;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.content-collapsed {
  max-height: 100px; // 设置为约200px的显示高度
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0));
  -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0));
}

.expand-button {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 4px;
  color: var(--msg-active-color, #13987f);
  cursor: pointer;
  font-size: 12px;

  svg {
    transition: transform 0.3s ease;
  }
}
</style>
