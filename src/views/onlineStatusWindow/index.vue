<template>
  <main class="size-full bg-#fff select-none">
    <ActionBar class="absolute right-0 w-full" :shrink="false" :max-w="false" :min-w="false" />

    <n-flex
      vertical
      :size="130"
      :style="`background: linear-gradient(to bottom, ${RGBA} 0%, #f1f1f1 100%)`"
      class="size-full p-20px box-border"
      data-tauri-drag-region>
      <!-- 当前选中的状态 -->
      <n-flex justify="center" align="center" class="pt-80px" data-tauri-drag-region>
        <img class="w-34px h-34px" :src="currentState?.url" alt="" />
        <span class="text-22px">{{ currentState?.title }}</span>
      </n-flex>

      <!-- 状态 -->
      <n-flex vertical class="w-full h-100vh bg-#f1f1f1 rounded-6px box-border p-13px" data-tauri-drag-region>
        <n-scrollbar style="max-height: 215px">
          <n-flex align="center" :size="10">
            <n-flex
              @click="handleActive(item)"
              :class="{ active: currentState?.id === item.id }"
              v-for="item in stateList"
              :key="item.title"
              vertical
              justify="center"
              align="center"
              :size="8"
              class="status-item">
              <img class="w-24px h-24px" :src="item.url" alt="" />
              <span class="text-11px">{{ item.title }}</span>
            </n-flex>
          </n-flex>
        </n-scrollbar>
      </n-flex>
    </n-flex>
  </main>
</template>
<script setup lang="ts">
import { useUserStatusStore } from '@/stores/userStatus'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import apis from '@/services/apis.ts'
import { useUserStore } from '@/stores/user'
import { UserState } from '@/services/types'

const userStatusStore = useUserStatusStore()
const userStore = useUserStore()
const { currentState, stateList, stateId } = storeToRefs(userStatusStore)
/** 这里不写入activeItem中是因为v-bind要绑定的值是响应式的 */
const RGBA = ref(currentState.value?.bgColor)

watchEffect(() => {
  RGBA.value = currentState.value?.bgColor
})

/**
 * 处理选中的状态
 * @param { UserState } item 状态
 */
const handleActive = async (item: UserState) => {
  try {
    await apis.changeUserState(item.id)

    stateId.value = item.id
    userStore.userInfo.userStateId = item.id

    window.$message?.success('状态更新成功')
  } catch (error) {
    console.error('更新状态失败:', error)
    window.$message?.error('状态更新失败')
  }
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  currentState.value.id =
    stateList.value.find((item: { title: string }) => item.title === currentState.value.title)?.id || '1'
})
</script>
<style scoped lang="scss">
.status-item {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  transition: all 0.4s ease-in-out;
  &:not(.active):hover {
    background: #ccc;
    cursor: pointer;
  }
}

.active {
  background: v-bind(RGBA);
  border-radius: 8px;
  cursor: pointer;
  span {
    color: #fff;
  }
}

:deep(.action-close) {
  svg {
    color: #404040;
  }
}
/** 隐藏naive UI的滚动条 */
:deep(
  .n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--vertical > .n-scrollbar-rail__scrollbar,
  .n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--vertical > .n-scrollbar-rail__scrollbar
) {
  display: none;
}
</style>
