<template>
  <div class="chat-role-selector">
    <!-- 当前选中的角色 -->
    <div class="current-role" @click="showRoleList = !showRoleList">
      <n-avatar :src="currentRole?.avatar" :size="40" round />
      <div class="role-info">
        <div class="role-name">{{ currentRole?.name || '选择角色' }}</div>
        <div class="role-desc">{{ currentRole?.description || '点击选择角色' }}</div>
      </div>
      <Icon icon="mdi:chevron-down" class="expand-icon" :class="{ expanded: showRoleList }" :size="20" />
    </div>

    <!-- 角色列表 -->
    <transition name="slide-fade">
      <div v-if="showRoleList" class="role-list-container">
        <n-scrollbar style="max-height: 400px">
          <div class="role-list">
            <!-- 管理按钮 -->
            <div class="role-list-header">
              <span class="header-title">选择角色</span>
              <n-button text @click="handleOpenManagement">
                <template #icon>
                  <Icon icon="mdi:cog" />
                </template>
                管理角色
              </n-button>
            </div>

            <!-- 角色项 -->
            <div
              v-for="role in roleList"
              :key="role.id"
              class="role-item"
              :class="{ active: currentRole?.id === role.id }"
              @click="handleSelectRole(role)">
              <n-avatar :src="role.avatar" :size="36" round />
              <div class="role-item-info">
                <div class="role-item-name">{{ role.name }}</div>
                <div class="role-item-desc">{{ role.description }}</div>
              </div>
              <Icon v-if="currentRole?.id === role.id" icon="mdi:check" class="check-icon" :size="20" />
            </div>

            <!-- 空状态 -->
            <div v-if="roleList.length === 0" class="empty-state">
              <Icon icon="mdi:account-circle" :size="48" class="empty-icon" />
              <div class="empty-text">暂无角色</div>
              <n-button size="small" type="primary" @click="handleOpenManagement">创建第一个角色</n-button>
            </div>
          </div>
        </n-scrollbar>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { chatRolePage } from '@/utils/ImRequestUtils'

const props = defineProps<{
  modelValue?: any
}>()

const emit = defineEmits<{
  'update:modelValue': [role: any]
  'open-management': []
}>()

const showRoleList = ref(false)
const roleList = ref<any[]>([])
const currentRole = ref<any>(props.modelValue)

// 加载角色列表
const loadRoleList = async () => {
  try {
    const data = await chatRolePage({ pageNo: 1, pageSize: 100 })
    roleList.value = (data.list || []).filter((item: any) => item.status === 0) // 只显示可用的角色

    // 如果没有选中角色，默认选中第一个
    if (!currentRole.value && roleList.value.length > 0) {
      handleSelectRole(roleList.value[0])
    }
  } catch (error) {
    console.error('加载角色列表失败:', error)
  }
}

// 选择角色
const handleSelectRole = (role: any) => {
  currentRole.value = role
  emit('update:modelValue', role)
  showRoleList.value = false
}

// 打开角色管理
const handleOpenManagement = () => {
  emit('open-management')
  showRoleList.value = false
}

// 刷新角色列表
const refresh = () => {
  loadRoleList()
}

// 监听外部值变化
watch(
  () => props.modelValue,
  (val) => {
    currentRole.value = val
  }
)

// 点击外部关闭列表
onMounted(() => {
  loadRoleList()

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.chat-role-selector')) {
      showRoleList.value = false
    }
  }

  document.addEventListener('click', handleClickOutside)

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})

defineExpose({
  refresh
})
</script>

<style scoped lang="scss">
.chat-role-selector {
  position: relative;
  width: 100%;
}

.current-role {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-color);
  border: 1px solid var(--line-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: var(--hover-color);
    border-color: var(--primary-color);
  }

  .role-info {
    flex: 1;
    min-width: 0;

    .role-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .role-desc {
      font-size: 12px;
      color: #909090;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: 2px;
    }
  }

  .expand-icon {
    color: #909090;
    transition: transform 0.3s;

    &.expanded {
      transform: rotate(180deg);
    }
  }
}

.role-list-container {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--bg-color);
  border: 1px solid var(--line-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
}

.role-list {
  .role-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--line-color);

    .header-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-color);
    }
  }

  .role-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    transition: all 0.3s;
    position: relative;

    &:hover {
      background: var(--hover-color);
    }

    &.active {
      background: var(--primary-color-hover);

      .role-item-name {
        color: var(--primary-color);
      }
    }

    .role-item-info {
      flex: 1;
      min-width: 0;

      .role-item-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .role-item-desc {
        font-size: 12px;
        color: #909090;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-top: 2px;
      }
    }

    .check-icon {
      color: var(--primary-color);
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;

    .empty-icon {
      color: #909090;
      margin-bottom: 12px;
    }

    .empty-text {
      font-size: 14px;
      color: #909090;
      margin-bottom: 16px;
    }
  }
}

// 动画
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
