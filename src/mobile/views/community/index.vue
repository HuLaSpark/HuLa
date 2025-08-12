<template>
  <div class="flex flex-col h-full flex-1">
    <!-- 顶部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" direction="top" />

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
      <CommunityTab @update="onUpdate" :options="tabOptions" active-tab-name="find">
        <template #find>
          <CommunityContent v-for="i in uiViewsData.testList" :key="i"></CommunityContent>
        </template>

        <template #follow>
          <CommunityContent v-for="i in uiViewsData.testList" :key="i"></CommunityContent>
        </template>
      </CommunityTab>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommunityContent from '@/mobile/components/community/CommunityContent.vue'
import CommunityTab from '@/mobile/components/community/CommunityTab.vue'
import SafeAreaPlaceholder from '@/mobile/components/placeholders/SafeAreaPlaceholder.vue'

const onUpdate = (newTab: string) => {
  console.log('已更新：', newTab)
}

const tabOptions = reactive([
  {
    tab: '发现',
    name: 'find'
  },
  {
    tab: '关注',
    name: 'follow'
  }
])

const uiViewsData = ref({
  testList: [] as string[]
})

for (let i = 0; i < 10; i++) {
  uiViewsData.value.testList.push('1')
}
</script>

<style scoped>
.mask-rounded {
  -webkit-mask-image: radial-gradient(circle, white 100%, transparent 100%);
  mask-image: radial-gradient(circle, white 100%, transparent 100%);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}
</style>
