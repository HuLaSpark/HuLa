<template>
  <div>
    <AutoFixHeightPage :show-footer="false">
      <template #header>
        <HeaderBar
          :isOfficial="false"
          class="bg-white"
          style="border-bottom: 1px solid; border-color: #dfdfdf"
          :hidden-right="true"
          room-name="我的相册" />
      </template>

      <template #container>
        <div class="flex flex-col bg-#fefefe overflow-auto h-full">
          <div class="flex flex-col p-20px gap-20px">
            <!-- 加载状态 -->
            <div v-if="loading" class="flex justify-center items-center py-40px">
              <n-spin size="medium" />
            </div>

            <!-- 空状态 -->
            <div v-else-if="allImages.length === 0" class="flex flex-col justify-center items-center py-40px gap-10px">
              <svg class="iconpark-icon w-60px h-60px text-gray">
                <use href="#xiangce"></use>
              </svg>
              <div class="text-gray text-14px">暂无图片</div>
            </div>

            <!-- 图片网格 -->
            <div v-else class="grid grid-cols-4 gap-1">
              <div
                v-for="(image, index) in allImages"
                :key="index"
                class="overflow-hidden bg-gray-100 aspect-square cursor-pointer"
                @click="handleImageClick(image)">
                <img :src="image.displayUrl" class="w-full h-full object-cover" alt="相册图片" />
              </div>
            </div>
          </div>
        </div>
      </template>
    </AutoFixHeightPage>

    <!-- 图片预览组件 -->
    <ImagePreview
      v-model:visible="showImagePreviewRef"
      :image-url="activeImageUrl"
      :show-forward="false"
      :show-save="false"
      :show-more="false" />
  </div>
</template>

<script setup lang="ts">
import { useFileStore } from '@/stores/file'
import { useGlobalStore } from '@/stores/global'
import ImagePreview from '@/mobile/components/ImagePreview.vue'

const fileStore = useFileStore()
const globalStore = useGlobalStore()

// 图片预览状态
const showImagePreviewRef = ref(false)
const activeImageUrl = ref('')
const loading = ref(true)

// 所有图片列表
const allImages = ref<Array<{ displayUrl: string; originalUrl: string; id: string; roomId: string }>>([])

/**
 * 获取所有房间的图片
 */
const getAllImages = async () => {
  loading.value = true
  try {
    // 检查 roomFilesMap 是否为空，如果为空则扫描本地文件
    if (Object.keys(fileStore.roomFilesMap).length === 0) {
      if (globalStore.currentSessionRoomId) {
        console.log('🔍 [MyAlbum Debug] 扫描本地文件，roomId:', globalStore.currentSessionRoomId)
        await fileStore.scanLocalFiles(globalStore.currentSessionRoomId)
      }
    }

    const roomFilesMap = fileStore.roomFilesMap
    console.log('🔍 [MyAlbum Debug] roomFilesMap:', roomFilesMap)
    const imagesList: Array<{ displayUrl: string; originalUrl: string; id: string; roomId: string }> = []

    // 遍历所有房间
    for (const roomId in roomFilesMap) {
      const files = await fileStore.getRoomFilesForDisplay(roomId)
      console.log('🔍 [MyAlbum Debug] roomId:', roomId, 'files:', files)

      // 只获取图片类型的文件
      const images = files.filter((file) => file.type === 'image')
      console.log('🔍 [MyAlbum Debug] roomId:', roomId, 'images:', images)

      imagesList.push(
        ...images.map((img) => ({
          displayUrl: img.displayUrl,
          originalUrl: img.originalUrl,
          id: img.id,
          roomId: img.roomId
        }))
      )
    }

    console.log('🔍 [MyAlbum Debug] 最终图片列表:', imagesList)
    allImages.value = imagesList
  } catch (error) {
    console.error('获取图片失败:', error)
    if (window.$message) {
      window.$message.error('获取图片失败')
    }
  } finally {
    loading.value = false
  }
}

/**
 * 处理图片点击
 */
const handleImageClick = (image: { displayUrl: string; originalUrl: string; id: string; roomId: string }) => {
  console.log('🔍 [MyAlbum Debug] 点击图片:', image)
  activeImageUrl.value = image.displayUrl
  showImagePreviewRef.value = true
}

onMounted(() => {
  console.log('🔍 [MyAlbum Debug] MyAlbum 组件已挂载')
  getAllImages()
})
</script>

<style scoped>
/* 可以添加自定义样式 */
</style>
