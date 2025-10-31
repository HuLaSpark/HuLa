<template>
  <MobileLayout :safeAreaTop="shouldShowTopSafeArea" :safeAreaBottom="true">
    <div class="flex flex-col h-full">
      <div class="flex-1 overflow-hidden">
        <RouterView v-slot="{ Component }">
          <Transition name="slide" appear mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </div>

      <div class="flex-shrink-0">
        <TabBar ref="tabBarElement" />
      </div>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import type { default as TabBarType } from '#/layout/tabBar/index.vue'
import TabBar from '#/layout/tabBar/index.vue'

const route = useRoute()
const tabBarElement = ref<InstanceType<typeof TabBarType>>()

// 根据路由动态控制顶部安全区域
// 当在社区页面时，关闭顶部安全区域
const shouldShowTopSafeArea = computed(() => {
  return route.path !== '/mobile/community'
})
</script>

<style lang="scss"></style>
