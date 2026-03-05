<template>
  <MobileLayout>
    <MobileScaffold :safe-area="false">
      <template #container>
        <RouterView v-slot="{ Component }">
          <Transition name="slide" appear mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </template>
      <template #footer>
        <div>
          <TabBar />
        </div>
      </template>
    </MobileScaffold>
  </MobileLayout>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import TabBar from '#/layout/tabBar/index.vue'

const route = useRoute()
</script>

<style lang="scss"></style>
