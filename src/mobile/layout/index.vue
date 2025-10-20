<template>
  <MobileLayout :safeAreaTop="true" :safeAreaBottom="true">
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
</script>

<style lang="scss"></style>
