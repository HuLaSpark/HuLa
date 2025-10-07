<template>
  <div class="flex-center h-full">
    <div class="empty-content">
      <!-- 图标 -->
      <svg class="mb-16px size-58px">
        <use href="#explosion"></use>
      </svg>

      <!-- 标题 -->
      <h3 v-if="title" class="empty-title text-15px font-500 text-[--text-color] mb-8px m-0">
        {{ title }}
      </h3>

      <!-- 操作按钮 -->
      <div v-if="$slots.actions" class="empty-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { title } = defineProps<{
  title?: string
}>()
</script>

<style scoped lang="scss">
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: fadeInUp 0.5s ease-out;
}

.empty-svg {
  color: var(--text-color);
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.empty-title {
  line-height: 1.2;
  animation: fadeInUp 0.5s ease-out 0.1s both;
}

.empty-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  animation: fadeInUp 0.5s ease-out 0.3s both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 减少动画
@media (prefers-reduced-motion: reduce) {
  .empty-content,
  .empty-title,
  .empty-actions {
    animation: none;
  }

  .empty-svg {
    transition: none;
  }

  .empty-content:hover .empty-svg {
    transform: none;
  }
}
</style>
