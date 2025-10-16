<template>
  <div ref="root">
    <!-- 隐藏的 contenteditable，用于复用 useMsgInput 的发送逻辑 -->
    <div
      ref="messageInputDom"
      contenteditable="true"
      spellcheck="false"
      style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; white-space: pre-wrap"></div>

    <div class="w-full min-h-20px bg-#FAFAFA flex flex-col z-2 footer-bar-shadow">
      <div class="flex flex-1">
        <component ref="chatFooterRef" :is="ChatFooter" :detail-id="globalStore.currentSession!.detailId"></component>
      </div>

      <div v-if="false" class="flex justify-between px-25px flex-1 items-center py-10px">
        <template v-for="item in options" :key="item.icon" :class="{ 'active-icon': activeIcon === item.icon }">
          <div v-if="item.label !== 'file' && item.label !== 'image' && item.isShow()" @click="item.onClick">
            <svg class="h-24px w-24px iconpark-icon">
              <use :href="`#${item.icon}`"></use>
            </svg>
          </div>
          <div v-else-if="item.label === 'file'">
            <van-uploader multiple :after-read="afterReadFile">
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
          </div>
          <div v-else-if="item.label === 'image'">
            <van-uploader accept="image/*" multiple :after-read="afterReadImage">
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
          </div>
        </template>
      </div>
    </div>

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
import type { UploaderFileListItem } from 'vant/es'
import 'vant/es/dialog/style'
import { CallTypeEnum, RoomTypeEnum } from '@/enums'
import { useGlobalStore } from '@/stores/global'

const ChatFooter = defineAsyncComponent(() => import('@/components/rightBox/chatBox/ChatFooter.vue'))

const globalStore = useGlobalStore()
const activeIcon = ref<string | null>(null)
const emit = defineEmits(['focus', 'blur', 'updateHeight'])
const pickRtcCall = ref(false)
const router = useRouter()

// 判断当前是否为群聊
const isGroup = computed(() => globalStore.currentSession?.type === RoomTypeEnum.GROUP)
console.log('isGroup', isGroup.value)

const uploadFileList = ref<
  {
    url: string
    status: 'uploading' | 'failed' | 'done'
    message: string
  }[]
>([])

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

    uploadFileList.value.push({
      url: file.url as string,
      status: 'done',
      message: '待上传'
    })

    console.log('已添加文件：', file)
  }
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

    uploadFileList.value.push({
      url: file.url as string,
      status: 'done',
      message: '待上传（非图片）'
    })

    console.log('已选择文件：', file)
  }
}

// ==== DOM 和状态 ====
const footerBarInput = ref()
const messageInputDom = ref<HTMLElement | null>(null)
const root = ref()

onMounted(() => {
  if (root.value) {
    const resizeObserver = new ResizeObserver((entries) => {
      const height = entries[0].contentRect.height
      emit('updateHeight', height)
    })
    resizeObserver.observe(root.value)

    onUnmounted(() => {
      resizeObserver.disconnect()
    })
  }
})

// ==== 展开面板 ====
const options = ref([
  { label: 'emoji', icon: 'smiling-face', showArrow: true, isRotate: false, onClick: () => {}, isShow: () => true },
  { label: 'file', icon: 'file', showArrow: false, isRotate: true, onClick: () => {}, isShow: () => true },
  { label: 'image', icon: 'photo', showArrow: false, isRotate: true, onClick: () => {}, isShow: () => true },
  { label: 'video', icon: 'voice', showArrow: true, isRotate: false, onClick: () => {}, isShow: () => true },
  { label: 'history', icon: 'history', showArrow: true, isRotate: false, onClick: () => {}, isShow: () => true },
  {
    label: 'videoCall',
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

const isPanelVisible = ref(false)

// const clickItem = async (icon: string) => {
//   if (activeIcon.value === icon) {
//     closePanel()
//     return
//   }

//   // 如果之前有激活的图标，先关闭它
//   if (activeIcon.value) {
//     closePanel()
//   }

//   activeIcon.value = icon
//   const clickedItem = options.value.find((item) => item.icon === icon)
//   if (!clickedItem || !clickedItem.showArrow) return

//   if (isInputFocused.value) {
//     footerBarInput.value?.blur()
//     await nextTick()
//     isPanelVisible.value = true
//     clickedItem.isRotate = true
//   } else {
//     options.value.forEach((item) => {
//       if (item.icon === icon) {
//         item.isRotate = true
//         isPanelVisible.value = true
//       } else {
//         item.isRotate = false
//       }
//     })
//   }
// }

const closePanel = () => {
  isPanelVisible.value = false
  activeIcon.value = null
  options.value.forEach((item) => (item.isRotate = false))
}

// ==== 对外暴露 ====
defineExpose({ root, footerBarInput, closePanel })
</script>

<style lang="scss" scoped>
.active-icon {
  position: relative;

  svg {
    color: #13987f;
    /* 主题色 */
    transition: color 0.3s ease;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: #13987f;
    animation: pulse 1.5s infinite;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }

  50% {
    opacity: 0.5;
    transform: translateX(-50%) scale(1.2);
  }
}

.footer-bar-shadow {
  box-shadow: 0 -3px 6px -4px rgba(0, 0, 0, 0.1);
}

.rotate {
  transform: rotate(180deg);
}

.transition-transform {
  transition: transform 0.15s ease;
}
</style>
