<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="发布新动态" />
    </template>

    <template #container>
      <div class="flex flex-col gap-1 overflow-auto h-full">
        <div class="flex flex-col p-20px gap-20px">
          <!-- 动态内容输入 -->
          <div class="bg-white rounded-15px p-15px">
            <n-input
              v-model:value="feedContent"
              type="textarea"
              placeholder="尽情分享生活吧~😎"
              class="w-full"
              :autosize="{ minRows: 5, maxRows: 10 }"
              :maxlength="500"
              :show-count="true" />
          </div>

          <!-- 媒体类型选择 - 只有图文和视频 -->
          <div class="bg-white rounded-15px p-15px">
            <div class="text-14px text-[--text-color] mb-10px font-500">选择类型</div>
            <n-radio-group v-model:value="feedMediaType" @update:value="handleMediaTypeChange">
              <n-radio :value="1">图文</n-radio>
              <n-radio :value="2">视频</n-radio>
            </n-radio-group>
          </div>

          <!-- 图片上传 - 使用Vant Uploader -->
          <div v-if="feedMediaType === 1" class="bg-white rounded-15px p-15px">
            <div class="text-14px text-[--text-color] mb-10px font-500">上传图片（最多9张）</div>
            <van-uploader
              v-model="feedImages"
              accept="image/*"
              multiple
              :max-count="9"
              upload-icon="photo-o"
              preview-size="80px" />
            <n-alert v-if="feedImages.length === 0" type="warning" class="mt-10px text-12px">
              请至少上传一张图片
            </n-alert>
          </div>

          <!-- 视频上传 - 使用Vant Uploader -->
          <div v-if="feedMediaType === 2" class="bg-white rounded-15px p-15px">
            <div class="text-14px text-[--text-color] mb-10px font-500">上传视频</div>
            <van-uploader
              v-model="videoFileList"
              accept="video/*"
              :max-count="1"
              upload-icon="video-o"
              preview-size="80px" />
            <n-alert v-if="videoFileList.length === 0" type="warning" class="mt-10px text-12px">
              请上传一个视频文件
            </n-alert>
          </div>

          <!-- 发布按钮 -->
          <div class="flex justify-center gap-10px">
            <n-button @click="goBack" class="flex-1">取消</n-button>
            <n-button
              type="primary"
              :loading="isPublishing"
              :disabled="!isPublishValid"
              @click="handlePublish"
              class="flex-1">
              发布
            </n-button>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import type { UploaderFileListItem } from 'vant'
import { pushFeed } from '@/utils/ImRequestUtils'

const router = useRouter()
const message = useMessage()

// 响应式数据
const feedContent = ref('')
const feedMediaType = ref<1 | 2>(1) // 1-图文 2-视频
const feedImages = ref<UploaderFileListItem[]>([])
const videoFileList = ref<UploaderFileListItem[]>([])
const isPublishing = ref(false)

// 验证发布内容是否有效
const isPublishValid = computed(() => {
  if (!feedContent.value.trim()) {
    return false
  }

  if (feedMediaType.value === 1) {
    // 图文：必须有图片
    return feedImages.value.length > 0
  } else if (feedMediaType.value === 2) {
    // 视频：必须有视频
    return videoFileList.value.length > 0
  }

  return false
})

// 处理媒体类型变化
const handleMediaTypeChange = (type: 1 | 2) => {
  if (type === 1) {
    // 切换到图文：清空视频
    videoFileList.value = []
  } else if (type === 2) {
    // 切换到视频：清空图片
    feedImages.value = []
  }
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 发布动态
const handlePublish = async () => {
  // 验证内容
  if (!feedContent.value.trim()) {
    message.warning('请输入动态内容')
    return
  }

  // 根据媒体类型进行验证
  if (feedMediaType.value === 1) {
    if (feedImages.value.length === 0) {
      message.warning('请至少上传一张图片')
      return
    }
  } else if (feedMediaType.value === 2) {
    if (videoFileList.value.length === 0) {
      message.warning('请上传一个视频文件')
      return
    }
  }

  isPublishing.value = true

  try {
    const feedData: any = {
      id: 0, // 新建动态时ID为0
      content: feedContent.value.trim(),
      mediaType: feedMediaType.value,
      permission: 'open' // 默认公开
    }

    // 根据媒体类型添加对应的字段
    if (feedMediaType.value === 1) {
      // 图文类型：提取图片URL
      feedData.urls = feedImages.value.map((img: any) => img.url || '').filter((url: string) => url)
    } else if (feedMediaType.value === 2) {
      // 视频类型：添加视频URL
      if (videoFileList.value.length > 0) {
        const videoItem = videoFileList.value[0] as any
        feedData.videoUrl = videoItem.url || ''
      }
    }

    // 调用发布接口
    await pushFeed(feedData)

    message.success('发布成功！')

    // 返回上一页
    router.back()
  } catch (error) {
    console.error('发布动态失败:', error)
    message.error('发布失败，请稍后重试')
  } finally {
    isPublishing.value = false
  }
}
</script>

<style scoped></style>
