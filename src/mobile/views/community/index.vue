<template>
  <div class="flex flex-col h-full flex-1">
    <!-- 顶部安全区域占位元素 -->
    <SafeAreaPlaceholder direction="top" />

    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% fixed top-0" alt="hula" />

    <!-- 输入框 -->
    <div class="px-16px mt-2 mb-12px z-1 flex gap-3 justify-around">
      <n-input
        id="search"
        class="rounded-6px w-full bg-white relative text-12px"
        :maxlength="20"
        clearable
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        :placeholder="'搜索'">
        <template #prefix>
          <svg class="w-12px h-12px"><use href="#search"></use></svg>
        </template>
      </n-input>

      <img class="block w-32px h-32px" src="@/assets/mobile/community/scanner.webp" alt="" />
    </div>

    <!-- tab组件 -->
    <div class="flex px-16px flex-1 gap-2 flex-col z-1">
      <n-tabs animated>
        <n-tab-pane name="find" tab="发现">
          <!-- 这里高度写死并不影响下面的高度修正，写高度超过TabBar以防用户手机卡顿看到突然的高度修正的效果视差 -->
          <div ref="dynamicAreaRef" class="flex flex-col gap-4 overflow-y-auto h-90vh">
            <!-- 动态消息 -->
            <div v-for="i in uiViewsData.testList" :key="i" class="flex flex-col gap-4">
              <!-- 头像数据 -->
              <div class="grid grid-cols-[38px_1fr] items-start gap-1">
                <!-- 头像：单独居中 -->
                <div class="self-center h-38px">
                  <n-avatar :size="40" src="#" fallback-src="/logo.png" round />
                </div>

                <!-- 中间：两行内容 -->
                <div class="truncate pl-4 flex gap-10px flex-col">
                  <div class="text-14px leading-tight font-bold flex-1 truncate text-#333 truncate">用户1</div>
                  <div class="text-12px text-#333 truncate">发布于：2025-01-01 南京市</div>
                </div>
              </div>
              <!-- 动态内容 -->
              <div class="grid grid-cols-[38px_1fr] items-start gap-1">
                <!-- 留空 -->
                <div></div>
                <div class="flex flex-col gap-2">
                  <div>床前明月光，疑是地上霜。 举头望明月，低头思故乡。</div>
                  <div class="grid grid-cols-[1fr_1fr_1fr] gap-2">
                    <div class="relative w-full aspect-square bg-pink rounded-10px mask-rounded">
                      <!-- 关键修改在这里 -->
                      <img
                        src="https://ts1.tc.mm.bing.net/th/id/R-C.f40ba86561918519b95431a5921e4f5d?rik=9AIbo9AhOYel0w&riu=http%3a%2f%2fwww.quazero.com%2fuploads%2fallimg%2f131210%2f1-131210210248.jpg&ehk=v81JiWKphT%2baLBzbhrxRkTUUwwnhJ5F2PFkm4xn4nEM%3d&risl=&pid=ImgRaw&r=0"
                        class="absolute inset-0 w-full h-full object-cover" />
                    </div>
                    <div class="bg-pink relative w-full aspect-square rounded-10px mask-rounded">
                      <img
                        src="https://img-baofun.zhhainiao.com/pcwallpaper_ugc/static/705b5a8db5ffef241846340e11f1c9fd.jpg?x-oss-process=image%2fresize%2cm_lfit%2cw_3840%2ch_2160"
                        class="absolute inset-0 w-full h-full object-cover" />
                    </div>
                    <div class="bg-pink relative w-full aspect-square rounded-10px mask-rounded">
                      <img
                        src="https://img.shetu66.com/2023/06/27/1687846677099296.png"
                        class="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 占位元素，避免最后一个动态消息紧贴tabbar -->
            <div class="w-full h-1px bg-pink"></div>
          </div>
        </n-tab-pane>
        <n-tab-pane name="follow" tab="关注">七里香</n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SafeAreaPlaceholder from '@/mobile/components/placeholders/SafeAreaPlaceholder.vue'
import { useMobileStore } from '@/stores/mobile'
import { calculateElementPosition } from '@/utils/DomCalculate'

const mobileStore = useMobileStore()

const uiViewsData = ref({
  testList: [] as string[]
})

for (let i = 0; i < 10; i++) {
  uiViewsData.value.testList.push('1')
}

const dynamicAreaRef = ref<HTMLDivElement | null>(null)

const adjustDynamicArea = async () => {
  const rect = await calculateElementPosition(dynamicAreaRef)
  if (!rect) {
    console.warn('[adjustDynamicArea] dynamicAreaRect 获取失败')
    return
  }

  const tabBarTop = mobileStore.bottomTabBarPosition?.top || window.innerHeight
  const targetBottom = rect.bottom

  const offset = 0 // 视觉贴边偏移
  const diff = tabBarTop - targetBottom

  // console.log('[adjustDynamicArea] 元素 rect:', rect)
  // console.log('[adjustDynamicArea] TabBar top:', tabBarTop)
  // console.log('[adjustDynamicArea] 元素 bottom:', targetBottom)
  // console.log('[adjustDynamicArea] 计算差值 diff:', diff)

  if (diff > offset) {
    const newHeight = rect.height + diff - offset
    // console.log(`[adjustDynamicArea] 底部未贴合，增加高度 → ${newHeight}px`)
    dynamicAreaRef.value!.style.height = `${newHeight}px`
  } else if (diff < 0) {
    const newHeight = rect.height + diff - offset
    // console.log(`[adjustDynamicArea] 内容被遮挡，缩小高度 → ${newHeight}px`)
    dynamicAreaRef.value!.style.height = `${newHeight}px`
  } else {
    console.log('[adjustDynamicArea] 高度无需调整，当前已贴合')
  }
}

onMounted(() => {
  adjustDynamicArea()
})

watch(
  () => mobileStore.bottomTabBarPosition,
  () => {
    adjustDynamicArea()
  }
)
</script>

<style scoped>
.mask-rounded {
  -webkit-mask-image: radial-gradient(circle, white 100%, transparent 100%);
  mask-image: radial-gradient(circle, white 100%, transparent 100%);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}
</style>
