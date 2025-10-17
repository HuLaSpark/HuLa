<template>
  <div class="h-15rem w-full">
    <van-swipe class="h-full" :loop="false" :show-indicators="true" indicator-color="#999">
      <van-swipe-item v-for="(page, pageIndex) in pages" :key="pageIndex">
        <div class="px-15px pt-15px pb-30px grid grid-cols-4 gap-3 auto-rows-18">
          <div
            @click="handleClickIcon(item)"
            v-for="item in page"
            :key="item.id"
            class="flex flex-col gap-8px items-center justify-center rounded-2">
            <svg
              v-if="item.label !== '文件' && item.label !== '图片' && item.isShow()"
              class="h-24px w-24px iconpark-icon">
              <use :href="`#${item.icon}`"></use>
            </svg>

            <van-uploader
              v-if="item.label === '文件' && item.isShow()"
              accept="*/*"
              multiple
              :after-read="afterReadFile">
              <svg class="h-24px w-24px iconpark-icon">
                <use :href="`#${item.icon}`"></use>
              </svg>
              <svg
                v-if="item.showArrow"
                :class="[
                  'h-15px w-15px iconpark-icon transition-transform duration-300',
                  item.isRotate ? 'rotate' : ''
                ]">
                <use href="#down" />
              </svg>
            </van-uploader>

            <van-uploader
              v-if="item.label === '图片' && item.isShow()"
              accept="image/*"
              multiple
              :after-read="afterReadImage">
              <svg class="h-24px w-24px iconpark-icon">
                <use :href="`#${item.icon}`"></use>
              </svg>
              <svg
                v-if="item.showArrow"
                :class="[
                  'h-15px w-15px iconpark-icon transition-transform duration-300',
                  item.isRotate ? 'rotate' : ''
                ]">
                <use href="#down" />
              </svg>
            </van-uploader>

            <div class="text-10px" v-if="item.isShow()">
              {{ item.label }}
            </div>
          </div>
        </div>
      </van-swipe-item>
    </van-swipe>

    <van-popup v-model:show="pickRtcCall" position="bottom">
      <div class="flex flex-col items-center justify-center">
        <div class="w-full text-center py-3" @click="startCall(CallTypeEnum.VIDEO)">视频通话</div>
        <div class="w-full text-center py-3" @click="startCall(CallTypeEnum.AUDIO)">语音通话</div>
        <div class="w-full text-center py-3">取消</div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { CallTypeEnum, RoomTypeEnum } from '@/enums'
import { UploaderFileListItem } from 'vant'
import router from '~/src/router'
import { useGlobalStore } from '~/src/stores/global'

const globalStore = useGlobalStore()

const isGroup = computed(() => globalStore.currentSession?.type === RoomTypeEnum.GROUP)

const pickRtcCall = ref(false)
// ==== 展开面板 ====
const options = ref([
  { label: '文件', icon: 'file', showArrow: false, isRotate: true, onClick: () => {}, isShow: () => true },
  { label: '图片', icon: 'photo', showArrow: false, isRotate: true, onClick: () => {}, isShow: () => true },
  { label: '视频', icon: 'voice', showArrow: true, isRotate: false, onClick: () => {}, isShow: () => true },
  { label: '历史', icon: 'history', showArrow: true, isRotate: false, onClick: () => {}, isShow: () => true },
  {
    label: '视频通话',
    icon: 'video-one',
    showArrow: true,
    isRotate: false,
    onClick: () => {
      pickRtcCall.value = true
    },
    isShow: () => {
      return !isGroup.value
    }
  }
])

// 将数据分页，每页8个（2行4列）
const pages = computed(() => {
  const pageSize = 8
  const result: any[][] = []
  for (let i = 0; i < options.value.length; i += pageSize) {
    result.push(options.value.slice(i, i + pageSize))
  }
  return result
})

const handleClickIcon = (item: any) => {
  item.onClick()
}

const startCall = (callType: CallTypeEnum) => {
  router.push({
    path: `/mobile/rtcCall`,
    query: {
      remoteUserId: globalStore.currentSession.detailId,
      roomId: globalStore.currentSession.roomId,
      callType: callType
    }
  })
}

const emit = defineEmits<(e: 'sendFiles', files: File[]) => void>()

const selectedFiles = ref<File[]>([])

const uploadFileList = ref<
  {
    url: string
    status: 'uploading' | 'failed' | 'done'
    message: string
  }[]
>([])

const afterReadFile = (fileList: UploaderFileListItem | UploaderFileListItem[]) => {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif']
  const files = Array.isArray(fileList) ? fileList : [fileList]

  console.log('选择的文件：', files)

  for (const file of files) {
    const rawFile = file.file

    if (!rawFile) {
      console.log('文件不存在:', file)
      continue
    }

    // ✅ 只保留非图片文件
    if (imageTypes.includes(rawFile.type)) {
      console.log('已过滤图片文件:', file)
      continue
    }

    selectedFiles.value.push(rawFile)
    uploadFileList.value.push({
      url: file.url as string,
      status: 'done',
      message: '待上传（非图片）'
    })

    console.log('已选择文件：', file)
  }

  if (selectedFiles.value.length > 0) {
    emit('sendFiles', [...selectedFiles.value])
    selectedFiles.value = []
    uploadFileList.value = []
  }
}

const afterReadImage = (fileList: UploaderFileListItem | UploaderFileListItem[]) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif']
  const files = Array.isArray(fileList) ? fileList : [fileList]

  console.log('选择的文件：', files)

  for (const file of files) {
    const rawFile = file.file

    if (!rawFile) {
      console.log('文件不存在:', file)
      continue
    }

    if (!validTypes.includes(rawFile.type)) {
      console.log('已过滤非图片文件:', file)
      if (!Array.isArray(fileList)) {
        window.$message.warning('只能选择图片哦~')
      }
      continue
    }

    selectedFiles.value.push(rawFile)
    uploadFileList.value.push({
      url: file.url as string,
      status: 'done',
      message: '待上传'
    })

    console.log('已添加文件：', file)
  }

  if (selectedFiles.value.length > 0) {
    emit('sendFiles', [...selectedFiles.value])
    selectedFiles.value = []
    uploadFileList.value = []
  }
}
</script>

<style scoped></style>
