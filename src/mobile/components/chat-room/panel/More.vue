<template>
  <div class="h-full w-full">
    <van-swipe class="h-full" :loop="false" :show-indicators="pages.length > 1" indicator-color="#999">
      <van-swipe-item v-for="(page, pageIndex) in pages" :key="pageIndex">
        <div class="more-panel">
          <div v-for="item in page" :key="item.id" v-show="item.isShow()" class="more-cell">
            <van-uploader
              v-if="item.id === 'file' || item.id === 'image'"
              :accept="item.id === 'file' ? '*/*' : 'image/*'"
              multiple
              :after-read="item.id === 'file' ? afterReadFile : afterReadImage">
              <div class="more-tile">
                <svg class="more-icon iconpark-icon">
                  <use :href="`#${item.icon}`"></use>
                </svg>
              </div>
              <span class="more-label">{{ item.label }}</span>
            </van-uploader>

            <button v-else type="button" class="more-button" @click="handleClickIcon(item)">
              <div class="more-tile">
                <svg class="more-icon iconpark-icon">
                  <use :href="`#${item.icon}`"></use>
                </svg>
              </div>
              <span class="more-label">{{ item.label }}</span>
            </button>
          </div>
        </div>
      </van-swipe-item>
    </van-swipe>

    <van-popup v-model:show="pickRtcCall" position="bottom" round class="call-sheet-popup">
      <div class="call-sheet">
        <div class="call-sheet__item" @click="startCall(CallTypeEnum.VIDEO)">
          <span class="call-sheet__icon">
            <svg class="iconpark-icon"><use href="#video-one"></use></svg>
          </span>
          <span class="call-sheet__label">视频通话</span>
        </div>
        <div class="call-sheet__item" @click="startCall(CallTypeEnum.AUDIO)">
          <span class="call-sheet__icon">
            <svg class="iconpark-icon"><use href="#phone-telephone"></use></svg>
          </span>
          <span class="call-sheet__label">语音通话</span>
        </div>
      </div>
      <div class="call-sheet__cancel" @click="pickRtcCall = false">取消</div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { CallTypeEnum, RoomTypeEnum } from '@/enums'
import { UploaderFileListItem } from 'vant'
import router from '@/router'
import { useGlobalStore } from '@/stores/global'

const globalStore = useGlobalStore()

const isGroup = computed(() => globalStore.currentSession?.type === RoomTypeEnum.GROUP)

const pickRtcCall = ref(false)

const emit = defineEmits<{
  (e: 'sendFiles', files: File[]): void
  (e: 'openVoice'): void
}>()

// ==== 展开面板 ====
const options = ref([
  { id: 'file', label: '文件', icon: 'file', onClick: () => {}, isShow: () => true },
  { id: 'image', label: '图片', icon: 'photo', onClick: () => {}, isShow: () => true },
  { id: 'voice', label: '语音', icon: 'voice', onClick: () => emit('openVoice'), isShow: () => true },
  { id: 'history', label: '历史', icon: 'history', onClick: () => {}, isShow: () => true },
  {
    id: 'call',
    label: '视频通话',
    icon: 'phone-telephone',
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
  const currentSession = globalStore.currentSession
  if (!currentSession?.detailId) {
    pickRtcCall.value = false
    return
  }
  router.push({
    path: `/mobile/rtcCall`,
    query: {
      remoteUserId: currentSession.detailId,
      roomId: globalStore.currentSessionRoomId,
      callType: callType
    }
  })
}

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

<style scoped lang="scss">
.more-panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  column-gap: 8px;
  row-gap: 20px;
  height: 100%;
  padding: 20px 16px 12px;
  box-sizing: border-box;
}

.more-cell {
  display: flex;
  justify-content: center;
  min-width: 0;

  :deep(.van-uploader),
  :deep(.van-uploader__wrapper),
  :deep(.van-uploader__input-wrapper) {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
}

.more-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
}

.more-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background-color: var(--panel-tile-bg);
  transition: transform 0.15s ease;
}

.more-button:active .more-tile,
.more-cell :deep(.van-uploader__input-wrapper:active .more-tile) {
  transform: scale(0.94);
}

.more-icon {
  width: 26px;
  height: 26px;
  color: var(--panel-tile-icon);
}

.more-label {
  margin-top: 7px;
  font-size: 11px;
  line-height: 1;
  color: var(--text-color);
  opacity: 0.6;
  white-space: nowrap;
}

:global(.call-sheet-popup) {
  background-color: var(--bg-info);
}

.call-sheet {
  padding: 6px 16px 0;

  &__item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 2px;

    & + & {
      border-top: 1px solid var(--setting-item-line);
    }

    &:active {
      opacity: 0.7;
    }
  }

  &__icon {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 11px;
    background-color: var(--panel-tile-bg);

    svg {
      width: 20px;
      height: 20px;
      color: var(--panel-tile-icon);
    }
  }

  &__label {
    font-size: 16px;
    color: var(--text-color);
  }

  &__cancel {
    margin-top: 6px;
    padding: 15px 0 calc(15px + env(safe-area-inset-bottom));
    text-align: center;
    font-size: 16px;
    color: var(--text-color);
    border-top: 1px solid var(--setting-item-line);

    &:active {
      opacity: 0.7;
    }
  }
}
</style>
