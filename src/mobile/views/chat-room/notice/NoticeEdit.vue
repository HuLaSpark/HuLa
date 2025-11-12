<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        :room-name="isEditMode ? '编辑群公告' : '新增群公告'" />
    </template>

    <template #container>
      <div
        class="bg-[url('@/assets/mobile/chat-home/background.webp')] bg-cover bg-center flex flex-col overflow-auto h-full">
        <div class="flex flex-col flex-1 gap-20px py-15px px-20px">
          <!-- 公告内容编辑区域 -->
          <div class="bg-white rounded-15px p-15px shadow">
            <n-form label-placement="top" size="medium">
              <n-form-item label="公告内容" required>
                <n-input
                  v-model:value="announcementContent"
                  type="textarea"
                  placeholder="请输入公告内容..."
                  class="w-full"
                  :autosize="announcementAutosize"
                  :maxlength="1000"
                  :show-count="true" />
              </n-form-item>

              <n-form-item label="上传图片（暂不支持）">
                <div class="upload-image-container">
                  <n-upload
                    action="https://www.mocky.io/v2/5e4bafc63100007100d8b70f"
                    list-type="image-card"
                    :max="4"
                    disabled>
                    <div class="upload-trigger">
                      <svg class="size-24px text-#999">
                        <use href="#plus"></use>
                      </svg>
                      <span class="text-12px text-#999 mt-5px">点击上传</span>
                    </div>
                  </n-upload>
                </div>
              </n-form-item>
            </n-form>
          </div>

          <!-- 置顶设置区域 -->
          <div class="bg-white rounded-15px shadow">
            <div class="flex flex-col w-full">
              <div class="flex justify-between py-15px px-15px items-center border-b border-gray-200">
                <div class="flex flex-col">
                  <div class="text-14px font-medium">设为置顶</div>
                  <div class="text-12px text-gray-500 mt-5px">公告将显示在群公告列表顶部</div>
                </div>
                <n-switch v-model:value="top" />
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-center gap-15px">
            <n-button type="default" class="w-40%" size="large" @click="handleCancel">取消</n-button>
            <n-button type="primary" class="w-40%" size="large" @click="handleSubmit" :loading="submitting">
              保存
            </n-button>
          </div>
        </div>
      </div>
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
/* 按钮样式优化 */
.n-button {
  border-radius: 30px;
  font-weight: 500;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.n-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.n-button--primary {
  background: linear-gradient(145deg, #7eb7ac, #6fb0a4, #5fa89c);
  border: none;
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
