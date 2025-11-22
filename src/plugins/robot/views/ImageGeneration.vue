<template>
  <main class="image-generation-container">
    <div class="content-area">
      <!-- 头部 -->
      <div data-tauri-drag-region class="header flex p-[8px_16px_10px_16px] justify-between items-center">
        <n-flex :size="10" vertical>
          <p class="leading-6 text-(18px [--chat-text-color]) font-500">AI 图片生成</p>
          <p class="text-(11px #707070)">共生成 {{ totalImages }} 张图片</p>
        </n-flex>
      </div>

      <!-- 生成区域 -->
      <div class="generation-area p-16px">
        <n-card title="生成图片" :bordered="false" class="mb-16px">
          <n-form ref="formRef" :model="formData" label-placement="left" label-width="80">
            <!-- 模型选择 -->
            <n-form-item label="选择模型" path="modelId">
              <n-select
                v-model:value="formData.modelId"
                :options="modelOptions"
                placeholder="请选择图片生成模型"
                filterable
                @update:value="handleModelChange" />
            </n-form-item>

            <!-- 提示词输入 -->
            <n-form-item label="提示词" path="prompt">
              <n-input
                v-model:value="formData.prompt"
                type="textarea"
                placeholder="请输入图片描述，例如：一只可爱的猫咪在花园里玩耍"
                :autosize="promptAutosize"
                maxlength="2000"
                show-count />
            </n-form-item>

            <n-form-item label="图片尺寸">
              <n-flex :size="12">
                <n-input-number
                  v-model:value="formData.width"
                  placeholder="宽度"
                  :min="256"
                  :max="2048"
                  :step="64"
                  style="width: 120px" />
                <span class="text-14px text-#909090">×</span>
                <n-input-number
                  v-model:value="formData.height"
                  placeholder="高度"
                  :min="256"
                  :max="2048"
                  :step="64"
                  style="width: 120px" />
              </n-flex>
            </n-form-item>

            <n-form-item>
              <n-button
                type="primary"
                :loading="isGenerating"
                :disabled="!formData.modelId || !formData.prompt"
                @click="handleGenerate">
                {{ isGenerating ? '生成中...' : '开始生成' }}
              </n-button>
            </n-form-item>
          </n-form>
        </n-card>

        <!-- 图片展示区域 -->
        <n-card title="生成历史" :bordered="false">
          <n-spin :show="isLoading">
            <div v-if="imageList.length > 0" class="image-grid">
              <div v-for="image in imageList" :key="image.id" class="image-item">
                <div class="image-wrapper">
                  <!-- 状态标签 -->
                  <n-tag v-if="image.status === 10" class="status-tag" type="info" size="small" :bordered="false">
                    生成中
                  </n-tag>
                  <n-tag v-else-if="image.status === 30" class="status-tag" type="error" size="small" :bordered="false">
                    失败
                  </n-tag>

                  <!-- 图片 -->
                  <img
                    v-if="image.status === 20 && image.picUrl"
                    :src="image.picUrl"
                    :alt="image.prompt"
                    class="image"
                    @click="handlePreview(image)" />
                  <div v-else-if="image.status === 10" class="image-placeholder">
                    <n-spin size="large" />
                  </div>
                  <div v-else-if="image.status === 30" class="image-placeholder error">
                    <Icon icon="mdi:alert-circle-outline" class="text-48px text-#d5304f" />
                    <p class="text-12px text-#d5304f mt-8px">{{ image.errorMessage || '生成失败' }}</p>
                  </div>
                </div>

                <!-- 图片信息 -->
                <div class="image-info">
                  <p class="prompt" :title="image.prompt">{{ image.prompt }}</p>
                  <n-flex justify="space-between" align="center" class="mt-8px">
                    <span class="text-11px text-#909090">{{ formatTime(image.createTime) }}</span>
                    <n-flex :size="8">
                      <n-button v-if="image.status === 20" text size="small" @click="handleDownload(image)">
                        <template #icon>
                          <Icon icon="mdi:download" />
                        </template>
                      </n-button>
                      <n-popconfirm @positive-click="handleDelete(image.id)">
                        <template #trigger>
                          <n-button text size="small" type="error">
                            <template #icon>
                              <Icon icon="mdi:delete" />
                            </template>
                          </n-button>
                        </template>
                        确定要删除这张图片吗？
                      </n-popconfirm>
                    </n-flex>
                  </n-flex>
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无生成记录" class="py-40px" />
          </n-spin>

          <!-- 分页 -->
          <n-flex justify="center" class="mt-16px" v-if="totalImages > pageSize">
            <n-pagination
              v-model:page="pageNo"
              :page-count="Math.ceil(totalImages / pageSize)"
              :page-size="pageSize"
              show-size-picker
              :page-sizes="paginationSizes"
              @update:page="handlePageChange"
              @update:page-size="handlePageSizeChange" />
          </n-flex>
        </n-card>
      </div>
    </div>

    <!-- 图片预览 -->
    <n-modal v-model:show="showPreview" preset="card" style="width: 90%; max-width: 1200px">
      <template #header>
        <span>图片预览</span>
      </template>
      <div v-if="previewImage" class="preview-container">
        <img :src="previewImage.picUrl" :alt="previewImage.prompt" class="preview-image" />
        <div class="preview-info mt-16px">
          <p class="text-14px">
            <strong>提示词：</strong>
            {{ previewImage.prompt }}
          </p>
          <p class="text-12px text-#909090 mt-8px">
            <strong>尺寸：</strong>
            {{ previewImage.width }} × {{ previewImage.height }}
          </p>
          <p class="text-12px text-#909090 mt-4px">
            <strong>模型：</strong>
            {{ previewImage.model }} ({{ previewImage.platform }})
          </p>
          <p class="text-12px text-#909090 mt-4px">
            <strong>生成时间：</strong>
            {{ formatTime(previewImage.createTime) }}
          </p>
        </div>
      </div>
    </n-modal>
  </main>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { imageMyPage, imageDraw, imageDeleteMy, modelPage } from '@/utils/ImRequestUtils'

const promptAutosize = { minRows: 3, maxRows: 6 }
const paginationSizes = [10, 20, 30, 50]

// 表单数据
const formData = ref({
  modelId: '',
  prompt: '',
  width: 1024,
  height: 1024,
  options: {}
})

// 模型选项
const modelOptions = ref<Array<{ label: string; value: string }>>([])

// 图片列表
const imageList = ref<any[]>([])
const totalImages = ref(0)
const pageNo = ref(1)
const pageSize = ref(20)

// 状态
const isGenerating = ref(false)
const isLoading = ref(false)

// 预览
const showPreview = ref(false)
const previewImage = ref<any>(null)

// 轮询定时器
let pollingTimer: NodeJS.Timeout | null = null
// 记录已完成的图片ID,避免重复提示
const completedImageIds = new Set<string>()

// 加载模型列表
const loadModels = async () => {
  try {
    const res = await modelPage({ pageNo: 1, pageSize: 100 })
    if (res?.data?.list) {
      // 筛选图片生成模型 (type = 2)
      modelOptions.value = res.data.list
        .filter((m: any) => m.type === 2 && m.status === 0)
        .map((m: any) => ({
          label: `${m.name} (${m.platform})`,
          value: m.id
        }))
    }
  } catch (error) {
    // 移除console.error
  }
}

// 加载图片列表
const loadImages = async (showSuccessNotification = false) => {
  isLoading.value = true
  try {
    const res = await imageMyPage({
      pageNo: pageNo.value,
      pageSize: pageSize.value
    })
    if (res?.data) {
      const newList = res.data.list || []

      // 检查是否有新完成的图片
      if (showSuccessNotification) {
        newList.forEach((img: any) => {
          if (img.status === 20 && !completedImageIds.has(img.id)) {
            completedImageIds.add(img.id)
            window.$message.success('图片生成成功')
          }
        })
      }

      imageList.value = newList
      totalImages.value = res.data.total || 0
    }
  } catch (error) {
  } finally {
    isLoading.value = false
  }
}

// 生成图片
const handleGenerate = async () => {
  if (!formData.value.modelId || !formData.value.prompt) {
    window.$message.warning('请选择模型并输入提示词')
    return
  }

  isGenerating.value = true
  try {
    const res = await imageDraw({
      modelId: formData.value.modelId,
      prompt: formData.value.prompt,
      width: formData.value.width,
      height: formData.value.height,
      options: formData.value.options
    })

    if (res?.data) {
      // 只显示一次提交成功的提示
      window.$message.success('图片生成任务已提交')
      // 重新加载列表(不显示成功通知)
      await loadImages(false)
      // 开始轮询
      startPolling()
    }
  } catch (error: any) {
    // 移除console.error
    window.$message.error(error?.message || '生成图片失败')
  } finally {
    isGenerating.value = false
  }
}

// 开始轮询检查生成状态
const startPolling = () => {
  if (pollingTimer) return

  pollingTimer = setInterval(async () => {
    // 检查是否有进行中的任务
    const hasInProgress = imageList.value.some((img) => img.status === 10)
    if (hasInProgress) {
      // 轮询时启用成功通知
      await loadImages(true)
    } else {
      stopPolling()
    }
  }, 3000) // 每3秒轮询一次
}

// 停止轮询
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// 删除图片
const handleDelete = async (id: string) => {
  try {
    await imageDeleteMy({ id })
    window.$message.success('删除成功')
    await loadImages(false)
  } catch (error) {
    // 移除console.error
    window.$message.error('删除失败')
  }
}

// 预览图片
const handlePreview = (image: any) => {
  previewImage.value = image
  showPreview.value = true
}

// 下载图片
const handleDownload = (image: any) => {
  if (!image.picUrl) return
  const link = document.createElement('a')
  link.href = image.picUrl
  link.download = `ai-image-${image.id}.png`
  link.click()
}

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

// 分页处理
const handlePageChange = (page: number) => {
  pageNo.value = page
  loadImages(false)
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  pageNo.value = 1
  loadImages(false)
}

const handleModelChange = () => {
  // 模型切换时可以重置参数
}

onMounted(async () => {
  loadModels()
  await loadImages(false)
  // 检查是否有进行中的任务，如果有则开始轮询
  if (imageList.value.some((img) => img.status === 10)) {
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped lang="scss">
.image-generation-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--chat-bg-color);
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  border-bottom: 1px solid var(--line-color);
}

.generation-area {
  flex: 1;
  overflow-y: auto;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.image-item {
  border: 1px solid var(--line-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
}

.image-wrapper {
  position: relative;
  width: 100%;
  padding-top: 100%; /* 1:1 aspect ratio */
  background: var(--bg-color);
  overflow: hidden;
}

.status-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}

.image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.3s;

  &:hover {
    transform: scale(1.05);
  }
}

.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);

  &.error {
    background: rgba(213, 48, 79, 0.05);
  }
}

.image-info {
  padding: 12px;
}

.prompt {
  font-size: 13px;
  color: var(--chat-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
}

.preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
}

.preview-info {
  width: 100%;
  padding: 16px;
  background: var(--bg-color);
  border-radius: 8px;
}
</style>
