<script setup lang="ts">
const showModel = defineModel<boolean>('show')
</script>

<template>
  <Transition name="drawer">
    <div v-if="showModel" style="border: 1px solid rgba(90, 90, 90, 0.1)" class="sidebar">
      <n-scrollbar style="height: calc(100vh / var(--page-scale, 1) - 24px)" class="p-22px box-border">
        <slot />
      </n-scrollbar>
    </div>
  </Transition>
</template>

<style scoped>
.sidebar {
  @apply flex flex-col absolute top-69px right-0 bg-[--bg-chat-drawer] w-320px shadow-[0_14px_14px_rgba(0,0,0,0.35)];
  height: calc(100vh / var(--page-scale, 1) - 60px);
}
</style>
<style lang="css">
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.drawer-enter-active {
  animation: slideIn 0.3s ease-in-out;
}

.drawer-leave-active {
  animation: slideOut 0.3s ease-in-out;
}
</style>
