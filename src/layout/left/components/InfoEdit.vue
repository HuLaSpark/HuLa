<template>
  <n-modal v-model:show="editInfo.show" :mask-closable="false" class="rounded-8px" transform-origin="center">
    <div class="bg-[--bg-edit] w-480px h-fit box-border flex flex-col">
      <n-flex :size="6" vertical>
        <div
          v-if="type() === 'macos'"
          @click="editInfo.show = false"
          class="mac-close size-13px shadow-inner bg-#ed6a5eff rounded-50% mt-6px select-none absolute left-6px">
          <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
            <use href="#close"></use>
          </svg>
        </div>

        <n-flex class="text-(14px [--text-color]) select-none pt-6px" justify="center">编辑资料</n-flex>

        <svg
          v-if="type() === 'windows'"
          class="size-14px cursor-pointer pt-6px select-none absolute right-6px"
          @click="editInfo.show = false">
          <use href="#close"></use>
        </svg>
        <span class="h-1px w-full bg-[--line-color]"></span>
      </n-flex>
      <n-flex :size="20" class="p-22px select-none" vertical>
        <!-- 头像 -->
        <n-flex justify="center">
          <n-popover trigger="hover" :delay="300" :duration="300" placement="bottom">
            <template #trigger>
              <div class="avatar-wrapper relative" @click="openAvatarCropper">
                <n-avatar
                  :size="80"
                  :src="AvatarUtils.getAvatarUrl(editInfo.content.avatar!)"
                  round
                  style="border: 3px solid var(--avatar-border-color)" />
                <div class="avatar-hover absolute size-full rounded-50% flex-center">
                  <span class="text-12px color-white">更换头像</span>
                </div>
              </div>
            </template>
            <p class="text-12px text-[--chat-text-color] w-280px leading-5 p-4px">
              建议大小180 * 180像素，支持JPG、PNG、WEBP等格式，图片需小于500kb
            </p>
          </n-popover>
        </n-flex>
        <!-- 当前佩戴的徽章 -->
        <n-flex v-if="currentBadge" align="center" justify="center">
          <span class="text-(14px #707070)">当前佩戴的徽章:</span>
          <n-popover trigger="hover">
            <template #trigger>
              <img :src="currentBadge?.img" alt="" class="size-22px" />
            </template>
            <span>{{ currentBadge?.describe }}</span>
          </n-popover>
        </n-flex>

        <!-- 昵称编辑输入框 -->
        <n-popover placement="top-start" trigger="click">
          <template #trigger>
            <n-input
              ref="inputInstRef"
              v-model:value="localUserInfo.name"
              :count-graphemes="countGraphemes"
              :default-value="localUserInfo.name"
              :maxlength="8"
              :passively-activated="true"
              class="rounded-6px"
              clearable
              :allow-input="noSideSpace"
              placeholder="请输入你的昵称"
              show-count
              type="text">
              <template #prefix>
                <span class="pr-6px text-#909090">昵称</span>
              </template>
            </n-input>
          </template>
          <span>剩余改名次数: {{ editInfo.content.modifyNameChance || 0 }}</span>
        </n-popover>

        <!-- 徽章列表  -->
        <n-flex :size="[56, 20]" align="center">
          <template v-for="item in editInfo.badgeList" :key="item.id">
            <div class="badge-item">
              <n-image
                :class="{ 'grayscale-0': item.obtain === IsYesEnum.YES }"
                :src="item.img"
                alt="badge"
                class="flex-center grayscale"
                width="100"
                height="100"
                preview-disabled
                round />
              <div class="tip">
                <template v-if="item.obtain === IsYesEnum.YES">
                  <n-button
                    style="color: #fff"
                    v-if="item.wearing === IsYesEnum.NO"
                    color="#13987f"
                    @click="toggleWarningBadge(item)">
                    佩戴
                  </n-button>
                </template>
                <n-popover trigger="hover">
                  <template #trigger>
                    <svg class="size-24px outline-none">
                      <use href="#tips"></use>
                    </svg>
                  </template>
                  <span>{{ item.describe }}</span>
                </n-popover>
              </div>
            </div>
          </template>
        </n-flex>
      </n-flex>
      <n-flex class="p-12px" align="center" justify="center">
        <n-button
          style="color: #fff"
          :disabled="editInfo.content.name === localUserInfo.name"
          color="#13987f"
          @click="saveEditInfo(localUserInfo)">
          保存
        </n-button>
      </n-flex>
    </div>
  </n-modal>
  <!-- 添加裁剪组件 -->
  <input
    ref="fileInput"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    class="hidden"
    @change="handleFileChange" />
  <AvatarCropper ref="cropperRef" v-model:show="showCropper" :image-url="localImageUrl" @crop="handleCrop" />
</template>
<script setup lang="ts">
import { IsYesEnum, MittEnum, UploadSceneEnum } from '@/enums'
import { leftHook } from '@/layout/left/hook.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import apis from '@/services/apis.ts'
import { type } from '@tauri-apps/plugin-os'
import { useCommon } from '@/hooks/useCommon.ts'
import { useUserStore } from '@/stores/user.ts'
import { UserInfoType } from '@/services/types'
import { AvatarUtils } from '@/utils/AvatarUtils'
import AvatarCropper from '@/components/common/AvatarCropper.vue'
import { useLoginHistoriesStore } from '@/stores/loginHistory'
import { formatTimestamp, isDiffNow } from '@/utils/ComputedTime.ts'
import dayjs from 'dayjs'
import { useTauriListener } from '@/hooks/useTauriListener'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import type { AvatarCropperInstance } from '@/components/common/AvatarCropper.vue'

const appWindow = WebviewWindow.getCurrent()
let localUserInfo = ref<Partial<UserInfoType>>({})
const userStore = useUserStore()
const { addListener } = useTauriListener()
const loginHistoriesStore = useLoginHistoriesStore()
const { editInfo, currentBadge, updateCurrentUserCache, saveEditInfo, toggleWarningBadge } = leftHook()
const { countGraphemes } = useCommon()

const showCropper = ref(false)
const fileInput = ref<HTMLInputElement>()
const localImageUrl = ref('')
const cropperRef = useTemplateRef<AvatarCropperInstance>('cropperRef')

// 监听裁剪窗口的关闭
watch(
  () => showCropper.value,
  (newVal) => {
    if (!newVal) {
      // 清理资源
      if (localImageUrl.value) {
        URL.revokeObjectURL(localImageUrl.value)
        localImageUrl.value = ''
      }
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    }
  }
)

/** 不允许输入空格 */
const noSideSpace = (value: string) => !value.startsWith(' ') && !value.endsWith(' ')

const openAvatarCropper = () => {
  const lastUpdateTime = userStore.userInfo.avatarUpdateTime
  // 计算30天的毫秒数
  if (lastUpdateTime && !isDiffNow({ time: lastUpdateTime, unit: 'day', diff: 30 })) {
    // 计算下次可更新时间
    const nextUpdateTime = dayjs(lastUpdateTime).add(30, 'day')
    const formattedDate = formatTimestamp(nextUpdateTime.valueOf(), true)
    window.$message.warning(`下一次更换头像的时间：${formattedDate}`)
    return
  }

  fileInput.value?.click()
}

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    // 添加文件大小限制检查 (500KB = 500 * 1024 bytes)
    if (file.size > 500 * 1024) {
      window.$message.error('图片大小不能超过500KB')
      if (fileInput.value) {
        fileInput.value.value = ''
      }
      return
    }

    // 先设置图片URL，等待图片加载完成后再显示裁剪窗口
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      window.$message.error('只支持 JPG、PNG、WebP 格式的图片')
      if (fileInput.value) {
        fileInput.value.value = ''
      }
      return
    }

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      localImageUrl.value = url

      nextTick(() => {
        showCropper.value = true
      })
    }

    img.onerror = () => {
      window.$message.error('图片加载失败')
      URL.revokeObjectURL(url)
    }

    img.src = url
  }
}

const handleCrop = async (cropBlob: Blob) => {
  try {
    const fileName = `avatar_${Date.now()}.png`
    const file = new File([cropBlob], fileName, { type: 'image/png' })

    // 1. 获取上传URL
    const { uploadUrl, downloadUrl } = await apis.getUploadUrl({
      fileName: fileName,
      scene: UploadSceneEnum.AVATAR
    })

    // 2. 上传文件
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
      duplex: 'half'
    } as RequestInit)

    if (!response.ok) {
      throw new Error('文件上传失败')
    }

    // 3. 调用更新头像接口
    await apis.uploadAvatar({ avatar: downloadUrl })

    // 更新编辑信息
    editInfo.value.content.avatar = downloadUrl
    // 更新用户信息
    userStore.userInfo.avatar = downloadUrl
    // 更新头像更新时间
    userStore.userInfo.avatarUpdateTime = Date.now()
    // 更新登录历史记录
    loginHistoriesStore.loginHistories.filter((item) => item.uid === userStore.userInfo.uid)[0].avatar = downloadUrl
    // 更新缓存里面的用户信息
    updateCurrentUserCache('avatar', downloadUrl)
    window.$message.success('头像更新成功')

    // 清理资源
    if (localImageUrl.value) {
      URL.revokeObjectURL(localImageUrl.value)
    }
    localImageUrl.value = ''
    if (fileInput.value) {
      fileInput.value.value = ''
    }

    // 结束加载状态
    cropperRef.value?.finishLoading()
    // 关闭裁剪窗口
    showCropper.value = false
  } catch (error) {
    console.error('上传头像失败:', error)
    window.$message.error('上传头像失败')
    // 发生错误时也需要结束加载状态
    cropperRef.value?.finishLoading()
  }
}

const openEditInfo = () => {
  editInfo.value.show = true
  editInfo.value.content = userStore.userInfo
  localUserInfo.value = { ...userStore.userInfo }
  /** 获取徽章列表 */
  apis.getBadgeList().then((res) => {
    editInfo.value.badgeList = res as any
  })
}

onMounted(() => {
  addListener(
    appWindow.listen('open_edit_info', async () => {
      openEditInfo()
    })
  )
  useMitt.on(MittEnum.OPEN_EDIT_INFO, () => {
    useMitt.emit(MittEnum.CLOSE_INFO_SHOW)
    openEditInfo()
  })
})
</script>
<style scoped lang="scss">
.badge-item {
  .tip {
    transition: opacity 0.4s ease-in-out;
    @apply absolute top-0 left-0 w-full h-full flex-center gap-4px z-999 opacity-0;
  }

  @apply bg-#ccc relative rounded-50% size-fit p-4px cursor-pointer;

  &:hover .tip {
    @apply opacity-100;
  }
}

.mac-close:hover {
  svg {
    display: block;
  }
}

.avatar-wrapper {
  cursor: pointer;

  .avatar-hover {
    opacity: 0;
    transition: opacity 0.4s ease-in-out;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    top: 0;
    left: 0;
  }

  &:hover .avatar-hover {
    opacity: 1;
  }
}
</style>
