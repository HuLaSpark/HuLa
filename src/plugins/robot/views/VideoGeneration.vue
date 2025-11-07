<template>
  <main class="video-generation-container">
    <div class="content-area">
      <!-- 头部 -->
      <div data-tauri-drag-region class="header flex p-[8px_16px_10px_16px] justify-between items-center">
        <n-flex :size="10" vertical>
          <p class="leading-6 text-(18px [--chat-text-color]) font-500">AI 视频生成</p>
          <p class="text-(11px #707070)">共生成 {{ totalVideos }} 个视频</p>
        </n-flex>
      </div>

      <!-- 生成区域 -->
      <div class="generation-area p-16px">
        <n-card title="生成视频" :bordered="false" class="mb-16px">
          <n-form ref="formRef" :model="formData" label-placement="left" label-width="80">
            <!-- 模型选择 -->
            <n-form-item label="选择模型" path="modelId">
              <n-select
                v-model:value="formData.modelId"
                :options="modelOptions"
                placeholder="请选择视频生成模型"
                filterable
                @update:value="handleModelChange" />
            </n-form-item>

            <!-- 提示词输入 -->
            <n-form-item label="提示词" path="prompt">
              <n-input
                v-model:value="formData.prompt"
                type="textarea"
                placeholder="请输入视频描述，例如：一只可爱的猫咪在花园里追逐蝴蝶"
                :autosize="{ minRows: 3, maxRows: 6 }"
                maxlength="2000"
                show-count />
            </n-form-item>

            <!-- 参数设置 -->
            <n-form-item label="视频尺寸">
              <n-flex :size="12">
                <n-input-number
                  v-model:value="formData.width"
                  placeholder="宽度"
                  :min="256"
                  :max="1920"
                  :step="64"
                  style="width: 120px" />
                <span class="text-14px text-#909090">×</span>
                <n-input-number
                  v-model:value="formData.height"
                  placeholder="高度"
                  :min="256"
                  :max="1080"
                  :step="64"
                  style="width: 120px" />
              </n-flex>
            </n-form-item>

            <n-form-item label="视频时长">
              <n-input-number
                v-model:value="formData.duration"
                placeholder="时长（秒）"
                :min="1"
                :max="60"
                :step="1"
                style="width: 120px" />
              <span class="text-12px text-#909090 ml-8px">秒</span>
            </n-form-item>

            <!-- 生成按钮 -->
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

        <!-- 视频展示区域 -->
        <n-card title="生成历史" :bordered="false">
          <n-spin :show="isLoading">
            <div v-if="videoList.length > 0" class="video-grid">
              <div v-for="video in videoList" :key="video.id" class="video-item">
                <div class="video-wrapper">
                  <!-- 状态标签 -->
                  <n-tag v-if="video.status === 10" class="status-tag" type="info" size="small" :bordered="false">
                    生成中
                  </n-tag>
                  <n-tag v-else-if="video.status === 30" class="status-tag" type="error" size="small" :bordered="false">
                    失败
                  </n-tag>

                  <!-- 视频播放器 -->
                  <div v-if="video.status === 20 && video.videoUrl" class="video-player">
                    <video :src="video.videoUrl" :poster="video.coverUrl" controls class="video" @click.stop></video>
                  </div>
                  <div v-else-if="video.status === 10" class="video-placeholder">
                    <n-spin size="large" />
                    <p class="text-12px text-#909090 mt-12px">视频生成中，请稍候...</p>
                  </div>
                  <div v-else-if="video.status === 30" class="video-placeholder error">
                    <Icon icon="mdi:alert-circle-outline" class="text-48px text-#d5304f" />
                    <p class="text-12px text-#d5304f mt-8px">{{ video.errorMessage || '生成失败' }}</p>
                  </div>
                </div>

                <!-- 视频信息 -->
                <div class="video-info">
                  <p class="prompt" :title="video.prompt">{{ video.prompt }}</p>
                  <n-flex justify="space-between" align="center" class="mt-8px">
                    <span class="text-11px text-#909090">
                      {{ formatTime(video.createTime) }}
                      <span v-if="video.duration" class="ml-4px">· {{ video.duration }}s</span>
                    </span>
                    <n-flex :size="8">
                      <n-button v-if="video.status === 20" text size="small" @click="handleDownload(video)">
                        <template #icon>
                          <Icon icon="mdi:download" />
                        </template>
                      </n-button>
                      <n-popconfirm @positive-click="handleDelete(video.id)">
                        <template #trigger>
                          <n-button text size="small" type="error">
                            <template #icon>
                              <Icon icon="mdi:delete" />
                            </template>
                          </n-button>
                        </template>
                        确定要删除这个视频吗？
                      </n-popconfirm>
                    </n-flex>
                  </n-flex>
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无生成记录" class="py-40px" />
          </n-spin>

          <!-- 分页 -->
          <n-flex justify="center" class="mt-16px" v-if="totalVideos > pageSize">
            <n-pagination
              v-model:page="pageNo"
              :page-count="Math.ceil(totalVideos / pageSize)"
              :page-size="pageSize"
              show-size-picker
              :page-sizes="[10, 20, 30, 50]"
              @update:page="handlePageChange"
              @update:page-size="handlePageSizeChange" />
          </n-flex>
        </n-card>
      </div>
    </div>

    <!-- 视频详情预览 -->
    <n-modal v-model:show="showPreview" preset="card" style="width: 90%; max-width: 1200px">
      <template #header>
        <span>视频详情</span>
      </template>
      <div v-if="previewVideo" class="preview-container">
        <video :src="previewVideo.videoUrl" :poster="previewVideo.coverUrl" controls class="preview-video"></video>
        <div class="preview-info mt-16px">
          <p class="text-14px">
            <strong>提示词：</strong>
            {{ previewVideo.prompt }}
          </p>
          <p class="text-12px text-#909090 mt-8px">
            <strong>尺寸：</strong>
            {{ previewVideo.width }} × {{ previewVideo.height }}
          </p>
          <p class="text-12px text-#909090 mt-4px">
            <strong>时长：</strong>
            {{ previewVideo.duration }} 秒
          </p>
          <p class="text-12px text-#909090 mt-4px">
            <strong>模型：</strong>
            {{ previewVideo.model }} ({{ previewVideo.platform }})
          </p>
          <p class="text-12px text-#909090 mt-4px">
            <strong>生成时间：</strong>
            {{ formatTime(previewVideo.createTime) }}
          </p>
        </div>
      </div>
    </n-modal>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { videoMyPage, videoGenerate, videoDeleteMy, modelPage } from '@/utils/ImRequestUtils'
import { useMessage } from 'naive-ui'

const message = useMessage()

// 表单数据
const formData = ref({
  modelId: '',
  prompt: '',
  width: 1280,
  height: 720,
  duration: 5,
  options: {}
})

// 模型选项
const modelOptions = ref<Array<{ label: string; value: string }>>([])

// 视频列表
const videoList = ref<any[]>([])
const totalVideos = ref(0)
const pageNo = ref(1)
const pageSize = ref(12)

// 状态
const isGenerating = ref(false)
const isLoading = ref(false)

// 预览
const showPreview = ref(false)
const previewVideo = ref<any>(null)

// 轮询定时器
let pollingTimer: NodeJS.Timeout | null = null

// 加载模型列表
const loadModels = async () => {
  try {
    const res = await modelPage({ pageNo: 1, pageSize: 100 })
    if (res?.data?.list) {
      // 筛选视频生成模型 (type = 4)
      modelOptions.value = res.data.list
        .filter((m: any) => m.type === 4 && m.status === 0)
        .map((m: any) => ({
          label: `${m.name} (${m.platform})`,
          value: m.id
        }))
    }
  } catch (error) {
    console.error('加载模型失败:', error)
  }
}

// 加载视频列表
const loadVideos = async () => {
  isLoading.value = true
  try {
    const res = await videoMyPage({
      pageNo: pageNo.value,
      pageSize: pageSize.value
    })
    if (res?.data) {
      videoList.value = res.data.list || []
      totalVideos.value = res.data.total || 0
    }
  } catch (error) {
    console.error('加载视频列表失败:', error)
    message.error('加载视频列表失败')
  } finally {
    isLoading.value = false
  }
}

// 生成视频
const handleGenerate = async () => {
  if (!formData.value.modelId || !formData.value.prompt) {
    message.warning('请选择模型并输入提示词')
    return
  }

  isGenerating.value = true
  try {
    const res = await videoGenerate({
      modelId: formData.value.modelId,
      prompt: formData.value.prompt,
      width: formData.value.width,
      height: formData.value.height,
      duration: formData.value.duration,
      options: formData.value.options
    })

    if (res?.data) {
      message.success('视频生成任务已提交，请稍候...')
      // 重新加载列表
      await loadVideos()
      // 开始轮询
      startPolling()
    }
  } catch (error: any) {
    console.error('生成视频失败:', error)
    message.error(error?.message || '生成视频失败')
  } finally {
    isGenerating.value = false
  }
}

// 开始轮询检查生成状态
const startPolling = () => {
  if (pollingTimer) return

  pollingTimer = setInterval(async () => {
    // 检查是否有进行中的任务
    const hasInProgress = videoList.value.some((video) => video.status === 10)
    if (hasInProgress) {
      await loadVideos()
    } else {
      stopPolling()
    }
  }, 5000) // 每5秒轮询一次（视频生成较慢）
}

// 停止轮询
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// 删除视频
const handleDelete = async (id: string) => {
  try {
    await videoDeleteMy({ id })
    message.success('删除成功')
    await loadVideos()
  } catch (error) {
    console.error('删除失败:', error)
    message.error('删除失败')
  }
}

// 下载视频
const handleDownload = (video: any) => {
  if (!video.videoUrl) return
  const link = document.createElement('a')
  link.href = video.videoUrl
  link.download = `ai-video-${video.id}.mp4`
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
  loadVideos()
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  pageNo.value = 1
  loadVideos()
}

const handleModelChange = () => {
  // 模型切换时可以重置参数
}

// 生命周期
onMounted(() => {
  loadModels()
  loadVideos()
  // 检查是否有进行中的任务，如果有则开始轮询
  if (videoList.value.some((video) => video.status === 10)) {
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped lang="scss">
.video-generation-container {
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

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.video-item {
  border: 1px solid var(--line-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
}

.video-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background: var(--bg-color);
  overflow: hidden;
}

.status-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}

.video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
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

.video-info {
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

.preview-video {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 8px;
}

.preview-info {
  width: 100%;
  padding: 16px;
  background: var(--bg-color);
  border-radius: 8px;
}
</style>
