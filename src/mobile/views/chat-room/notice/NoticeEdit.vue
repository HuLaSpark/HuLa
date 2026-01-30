<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        border
        :hidden-right="true"
        :room-name="isEditMode ? '编辑群公告' : '新增群公告'" />
    </template>

    <template #container>
      <n-card :bordered="false" class="h-full" content-class="p-10px!">
        <n-input
          v-model:value="announcementContent"
          type="textarea"
          placeholder="请输入公告内容..."
          class="w-full p-0! m-0!"
          :autosize="announcementAutosize"
          :maxlength="1000"
          :show-count="true" />

        <div class="upload-image-container pt-10px">
          <n-upload action="https://www.mocky.io/v2/5e4bafc63100007100d8b70f" list-type="image-card" :max="4" disabled>
            <div class="upload-trigger">
              <svg class="size-24px text-#999">
                <use href="#plus"></use>
              </svg>
              <span class="text-12px text-#999 mt-5px">点击上传</span>
            </div>
          </n-upload>
        </div>

        <template #action>
          <div class="pb-10px">
            <!-- 置顶设置区域 -->
            <div class="flex flex-col w-full">
              <div class="flex justify-between py-15px px-15px items-center border-b border-gray-200">
                <div class="flex flex-col">
                  <div class="text-14px font-medium">设为置顶</div>
                  <div class="text-12px text-gray-500 mt-5px">公告将显示在群公告列表顶部</div>
                </div>
                <n-switch v-model:value="top" />
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-center gap-15px">
              <n-button type="default" class="w-40%" strong secondary round size="large" @click="handleCancel">
                取消
              </n-button>
              <n-button
                type="primary"
                class="w-40%"
                strong
                secondary
                round
                size="large"
                @click="handleSubmit"
                :loading="submitting">
                保存
              </n-button>
            </div>
          </div>
        </template>
      </n-card>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useGlobalStore } from '@/stores/global'
import { getAnnouncementDetail, editAnnouncement, pushAnnouncement } from '@/utils/ImRequestUtils'

defineOptions({
  name: 'mobileChatNoticeEdit'
})

const route = useRoute()
const router = useRouter()
const globalStore = useGlobalStore()
const announcementAutosize = { minRows: 5, maxRows: 10 }

// 判断是编辑模式还是新增模式
const isEditMode = computed(() => !!route.params.id)

// 公告内容
const announcementContent = ref('')
const top = ref(false)
const submitting = ref(false)

// 加载公告详情
const loadAnnouncementDetail = async () => {
  // 如果是新增模式，不需要加载详情
  if (!isEditMode.value) {
    return
  }

  try {
    const data = await getAnnouncementDetail({
      roomId: globalStore.currentSessionRoomId,
      announcementId: route.params.id as string
    })

    // 填充表单数据
    announcementContent.value = data.content
    top.value = data.top || false
    console.log('announcementContent ', announcementContent)
  } catch (error) {
    console.error('加载公告详情失败:', error)
  }
}

// 处理取消
const handleCancel = () => {
  router.back()
}

// 处理提交
const handleSubmit = async () => {
  // 简单验证
  if (!announcementContent.value.trim()) {
    window.$message?.error('请输入公告内容')
    return
  }

  submitting.value = true

  try {
    if (isEditMode.value) {
      // 编辑模式
      const announcementData = {
        id: route.params.id as string,
        roomId: (route.query.roomId as string) || globalStore.currentSessionRoomId,
        content: announcementContent.value,
        top: top.value
      }

      await editAnnouncement(announcementData)
      window.$message?.success('公告修改成功')
      router.push({
        path: `/mobile/chatRoom/notice/detail/${announcementData.id}`
      })
    } else {
      // 新增模式
      const announcementData = {
        roomId: (route.query.roomId as string) || globalStore.currentSessionRoomId,
        content: announcementContent.value,
        top: top.value
      }

      await pushAnnouncement(announcementData)
      window.$message?.success('公告发布成功')
      router.back()
    }
  } catch (error) {
    console.error('保存公告失败:', error)
    window.$message?.error('保存公告失败，请重试')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadAnnouncementDetail()
})
</script>

<style scoped>
:deep(.n-card > .n-card__action) {
  padding: 0 !important;
}

/* 上传图片组件样式优化 */
.upload-image-container {
  width: 100%;
}

.upload-image-container :deep(.n-upload) {
  width: 100%;
}

.upload-image-container :deep(.n-upload-trigger) {
  width: 100px;
  height: 100px;
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  background-color: #fafafa;
  cursor: not-allowed;
}

.upload-image-container :deep(.n-upload-file-list) {
  display: grid;
  grid-template-columns: repeat(auto-fill, 100px);
  gap: 10px;
}
</style>
