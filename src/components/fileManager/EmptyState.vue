<template>
  <div class="empty-state">
    <div class="empty-content">
      <!-- 图标 -->
      <div class="empty-icon mb-16px">
        <svg :class="['empty-svg', iconSize]">
          <use :href="`#${icon}`"></use>
        </svg>
      </div>

      <!-- 标题 -->
      <h3 v-if="title" class="empty-title text-18px font-500 text-[--text-color] mb-8px m-0">
        {{ title }}
      </h3>

      <!-- 描述 -->
      <p v-if="description" class="empty-description text-14px text-[--text-color] opacity-60 m-0 mb-16px">
        {{ description }}
      </p>

      <!-- 操作按钮 -->
      <div v-if="$slots.actions" class="empty-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon?: string
  title?: string
  description?: string
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'folder',
  size: 'medium'
})

const iconSize = computed(() => {
  const sizes = {
    small: 'size-48px',
    medium: 'size-64px',
    large: 'size-80px'
  }
  return sizes[props.size]
})
</script>

<style scoped lang="scss">
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  min-height: 300px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 400px;
  animation: fadeInUp 0.5s ease-out;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
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

.empty-description {
  line-height: 1.5;
  max-width: 300px;
  animation: fadeInUp 0.5s ease-out 0.2s both;
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

// 移动端适配
@media (max-width: 800px) {
  .empty-state {
    padding: 20px;
    min-height: 200px;
  }

  .empty-content {
    max-width: 300px;
  }

  .empty-svg {
    &.size-64px {
      width: 48px;
      height: 48px;
    }

    &.size-80px {
      width: 56px;
      height: 56px;
    }
  }

  .empty-icon {
    margin-bottom: 12px;
  }

  .empty-title {
    font-size: 16px;
    margin-bottom: 6px;
  }

  .empty-description {
    font-size: 13px;
    margin-bottom: 12px;
  }
}

// 深色主题适配
html[data-theme='dark'] {
  .empty-svg {
    opacity: 0.4;
  }
}

// 悬停效果
.empty-content:hover {
  .empty-svg {
    opacity: 0.5;
    transform: scale(1.05);
  }
}

// 减少动画
@media (prefers-reduced-motion: reduce) {
  .empty-content,
  .empty-title,
  .empty-description,
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
