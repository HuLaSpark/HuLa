<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    title="角色管理"
    style="width: 1000px"
    :bordered="false"
    :segmented="{ content: 'soft', footer: 'soft' }">
    <template #header-extra>
      <n-button type="primary" size="small" @click="handleAdd">
        <template #icon>
          <Icon icon="mdi:plus" />
        </template>
        新增角色
      </n-button>
    </template>

    <!-- 角色列表 - 添加滚动容器 -->
    <n-scrollbar style="max-height: calc(80vh - 140px)">
      <n-spin :show="loading">
        <div v-if="roleList.length === 0" class="empty-container">
          <n-empty description="暂无角色" size="large">
            <template #icon>
              <Icon icon="mdi:account-circle" class="text-48px color-#909090" />
            </template>
            <template #extra>
              <n-button type="primary" @click="handleAdd">新增第一个角色</n-button>
            </template>
          </n-empty>
        </div>

        <div v-else class="role-list">
          <div v-for="role in roleList" :key="role.id" class="role-card">
            <div class="role-card-header">
              <n-flex align="center" :size="12">
                <n-avatar :src="role.avatar" :size="48" round />
                <div class="flex-1">
                  <n-flex align="center" :size="8">
                    <span class="role-name">{{ role.name }}</span>
                    <n-tag :type="role.status === 0 ? 'success' : 'error'" size="small">
                      {{ role.status === 0 ? '可用' : '不可用' }}
                    </n-tag>
                    <n-tag v-if="role.publicStatus" type="info" size="small">公开</n-tag>
                    <n-tag v-else type="warning" size="small">私有</n-tag>
                  </n-flex>
                  <div class="role-meta">
                    <span class="meta-item">类别: {{ role.category }}</span>
                    <span class="meta-item">排序: {{ role.sort }}</span>
                  </div>
                </div>
              </n-flex>
              <n-flex :size="8">
                <!-- 只有创建人才显示编辑按钮 -->
                <n-button v-if="isRoleCreator(role)" size="small" @click="handleEdit(role)">
                  <template #icon>
                    <Icon icon="mdi:pencil" />
                  </template>
                  编辑
                </n-button>
                <!-- 只有创建人才显示删除按钮 -->
                <n-popconfirm
                  v-if="isRoleCreator(role)"
                  @positive-click="handleDelete(role.id)"
                  positive-text="删除"
                  negative-text="取消">
                  <template #trigger>
                    <n-button size="small" type="error">
                      <template #icon>
                        <Icon icon="mdi:delete" />
                      </template>
                      删除
                    </n-button>
                  </template>
                  <p>确定要删除角色 "{{ role.name }}" 吗？</p>
                  <p class="text-red-500">删除后将无法恢复！</p>
                </n-popconfirm>
              </n-flex>
            </div>

            <div class="role-card-body">
              <n-descriptions :column="1" size="small" bordered>
                <n-descriptions-item label="角色描述">
                  {{ role.description }}
                </n-descriptions-item>
                <n-descriptions-item label="角色设定">
                  {{ role.systemMessage }}
                </n-descriptions-item>
              </n-descriptions>
            </div>
          </div>
        </div>
      </n-spin>

      <!-- 分页 -->
      <n-flex v-if="pagination.total > pagination.pageSize" justify="center" class="mt-16px">
        <n-pagination
          v-model:page="pagination.pageNo"
          :page-size="pagination.pageSize"
          :page-count="Math.ceil(pagination.total / pagination.pageSize)"
          @update:page="handlePageChange" />
      </n-flex>
    </n-scrollbar>
  </n-modal>

  <n-modal
    v-model:show="showEditModal"
    preset="card"
    :title="editingRole ? '编辑角色' : '新增角色'"
    style="width: 700px"
    :bordered="false"
    :segmented="{ content: 'soft', footer: 'soft' }">
    <n-scrollbar style="max-height: calc(80vh - 140px)">
      <n-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="100px"
        style="padding-right: 12px">
        <n-form-item label="角色名称" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入角色名称，例如: 通用 AI 助手" />
        </n-form-item>

        <n-form-item label="角色头像" path="avatar">
          <n-flex :size="12" align="center" style="width: 100%">
            <n-avatar :key="formData.avatar" :src="formData.avatar" :size="60" round fallback-src="">
              <Icon v-if="!formData.avatar" icon="mdi:account-circle" :size="40" />
            </n-avatar>
            <n-flex vertical :size="8" style="flex: 1">
              <n-button size="small" @click="openAvatarCropper">
                <template #icon>
                  <Icon icon="mdi:upload" />
                </template>
                {{ formData.avatar ? '更换头像' : '上传头像' }}
              </n-button>
              <span v-if="formData.avatar" class="text-(12px #909090)">
                已上传
                <n-button text type="error" size="tiny" @click="formData.avatar = ''">清除</n-button>
              </span>
            </n-flex>
          </n-flex>
          <!-- 隐藏的文件输入 -->
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="handleFileChange" />
        </n-form-item>

        <n-form-item label="角色类别" path="category">
          <n-select
            v-model:value="formData.category"
            :options="categoryOptions"
            placeholder="请选择角色类别"
            filterable
            tag />
        </n-form-item>

        <n-form-item label="模型" path="modelId">
          <n-select
            v-model:value="formData.modelId"
            :options="modelOptions"
            placeholder="可选，不选则使用默认模型"
            clearable />
        </n-form-item>

        <n-form-item label="排序值" path="sort">
          <n-input-number v-model:value="formData.sort" :min="0" placeholder="数值越小越靠前" style="width: 100%" />
        </n-form-item>

        <n-form-item label="状态" path="status">
          <n-select v-model:value="formData.status" :options="statusOptions" placeholder="请选择状态" />
        </n-form-item>

        <n-form-item label="是否公开" path="publicStatus">
          <n-switch v-model:value="formData.publicStatus">
            <template #checked>公开</template>
            <template #unchecked>私有</template>
          </n-switch>
        </n-form-item>

        <n-form-item label="角色描述" path="description">
          <n-input
            v-model:value="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述，例如: 一个通用的 AI 助手，可以帮助你解决各种问题" />
        </n-form-item>

        <n-form-item label="角色设定" path="systemMessage">
          <n-input
            v-model:value="formData.systemMessage"
            type="textarea"
            :rows="5"
            placeholder="请输入角色设定，例如: 你是一个友好、专业的 AI 助手，总是以积极的态度帮助用户解决问题..." />
        </n-form-item>
      </n-form>
    </n-scrollbar>

    <template #footer>
      <n-flex justify="end" :size="12">
        <n-button @click="showEditModal = false">取消</n-button>
        <n-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ editingRole ? '保存' : '创建' }}
        </n-button>
      </n-flex>
    </template>
  </n-modal>

  <!-- 头像裁剪组件 -->
  <AvatarCropper ref="cropperRef" v-model:show="showCropper" :image-url="localImageUrl" @crop="handleCrop" />
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { FormRules, FormInst } from 'naive-ui'
import AvatarCropper from '@/components/common/AvatarCropper.vue'
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import { useMitt } from '@/hooks/useMitt'
import { useUserStore } from '@/stores/user'
import {
  chatRolePage,
  chatRoleCreate,
  chatRoleUpdate,
  chatRoleDelete,
  chatRoleCategoryList,
  modelPage
} from '@/utils/ImRequestUtils'

const showModal = defineModel<boolean>({ default: false })
const emit = defineEmits<{
  refresh: []
}>()

const userStore = useUserStore()

// 检查当前用户是否是角色创建人
const isRoleCreator = (role: any) => {
  return userStore.userInfo?.uid === role.userId
}

// 角色列表
const loading = ref(false)
const roleList = ref<any[]>([])
const pagination = ref({
  pageNo: 1,
  pageSize: 10,
  total: 0
})

// 编辑相关
const showEditModal = ref(false)
const editingRole = ref<any>(null)
const submitting = ref(false)
const formRef = ref<FormInst>()

// 表单数据
const formData = ref({
  modelId: '',
  name: '',
  avatar: '',
  category: 'AI助手',
  sort: 0,
  description: '',
  systemMessage: '',
  publicStatus: false,
  status: 0
})

// 类别选项（默认选项）
const categoryOptions = ref<any[]>([
  { label: 'AI助手', value: 'AI助手' },
  { label: '写作', value: '写作' },
  { label: '编程开发', value: '编程开发' },
  { label: '学习教育', value: '学习教育' },
  { label: '生活娱乐', value: '生活娱乐' },
  { label: '商务办公', value: '商务办公' },
  { label: '创意设计', value: '创意设计' },
  { label: '数据分析', value: '数据分析' },
  { label: '翻译', value: '翻译' },
  { label: '其他', value: '其他' }
])

// 模型选项
const modelOptions = ref<any[]>([])

// 状态选项
const statusOptions = [
  { label: '可用', value: 0 },
  { label: '不可用', value: 1 }
]

// 表单验证规则
const formRules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  avatar: [{ required: true, message: '请上传角色头像', trigger: 'blur' }],
  category: [{ required: true, message: '请选择角色类别', trigger: 'change' }],
  sort: [
    {
      required: true,
      type: 'number',
      message: '请输入排序值',
      trigger: 'blur',
      validator: (_rule: any, value: any) => {
        return value !== undefined && value !== null && value !== ''
      }
    }
  ],
  description: [{ required: true, message: '请输入角色描述', trigger: 'blur' }],
  systemMessage: [{ required: true, message: '请输入角色设定', trigger: 'blur' }],
  publicStatus: [
    {
      required: true,
      type: 'boolean',
      message: '请选择是否公开',
      trigger: 'change',
      validator: (_rule: any, value: any) => {
        return value !== undefined && value !== null
      }
    }
  ],
  status: [
    {
      required: true,
      type: 'number',
      message: '请选择状态',
      trigger: 'change',
      validator: (_rule: any, value: any) => {
        return value !== undefined && value !== null && value !== ''
      }
    }
  ]
}

// 头像上传
const {
  fileInput,
  localImageUrl,
  showCropper,
  cropperRef,
  openAvatarCropper,
  handleFileChange,
  handleCrop: onCrop
} = useAvatarUpload({
  onSuccess: async (downloadUrl) => {
    formData.value.avatar = ''
    await nextTick()
    formData.value.avatar = downloadUrl

    await nextTick()

    window.$message.success('头像上传成功')
  }
})

const handleCrop = async (cropBlob: Blob) => {
  await onCrop(cropBlob)
}

// 加载类别列表
const loadCategoryList = async () => {
  try {
    const data = await chatRoleCategoryList()
    if (data && data.length > 0) {
      categoryOptions.value = data
    }
  } catch (error) {
    console.error('加载角色类别列表失败:', error)
  }
}

// 加载模型列表
const loadModelList = async () => {
  try {
    const data = await modelPage({ pageNo: 1, pageSize: 100 })
    modelOptions.value = (data.list || []).map((item: any) => ({
      label: item.name,
      value: item.id
    }))
  } catch (error) {
    console.error('加载模型列表失败:', error)
  }
}

// 加载角色列表
const loadRoleList = async () => {
  loading.value = true
  try {
    const data = await chatRolePage({
      pageNo: pagination.value.pageNo,
      pageSize: pagination.value.pageSize
    })
    roleList.value = data.list || []
    pagination.value.total = data.total || 0
  } catch (error) {
    console.error('加载角色列表失败:', error)
    window.$message.error('加载角色列表失败')
  } finally {
    loading.value = false
  }
}

// 分页变化
const handlePageChange = (page: number) => {
  pagination.value.pageNo = page
  loadRoleList()
}

// 新增角色
const handleAdd = () => {
  editingRole.value = null
  formData.value = {
    modelId: '',
    name: '',
    avatar: '',
    category: '',
    sort: 0,
    description: '',
    systemMessage: '',
    publicStatus: false,
    status: 0
  }
  showEditModal.value = true
}

// 编辑角色
const handleEdit = (role: any) => {
  editingRole.value = role
  formData.value = {
    modelId: role.modelId || '',
    name: role.name,
    avatar: role.avatar,
    category: role.category,
    sort: role.sort ?? 0,
    description: role.description,
    systemMessage: role.systemMessage,
    publicStatus: role.publicStatus ?? false,
    status: role.status ?? 0
  }
  showEditModal.value = true
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitting.value = true

    const submitData: any = {
      name: formData.value.name,
      avatar: formData.value.avatar,
      category: formData.value.category,
      sort: formData.value.sort,
      description: formData.value.description,
      systemMessage: formData.value.systemMessage,
      publicStatus: formData.value.publicStatus,
      status: formData.value.status
    }

    if (formData.value.modelId) {
      submitData.modelId = formData.value.modelId
    }

    if (editingRole.value) {
      // 更新
      submitData.id = editingRole.value.id
      await chatRoleUpdate(submitData)
      window.$message.success('角色更新成功')
    } else {
      // 创建
      await chatRoleCreate(submitData)
      window.$message.success('角色创建成功')
    }

    showEditModal.value = false
    // 重置表单
    resetForm()
    loadRoleList()
    emit('refresh')
    // 通知左侧刷新角色状态
    useMitt.emit('refresh-roles')
  } catch (error: any) {
    if (error?.errors) {
      return
    }
    console.error('保存角色失败:', error)
    window.$message.error('保存角色失败')
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  formData.value = {
    modelId: '',
    name: '',
    avatar: '',
    category: '',
    sort: 0,
    description: '',
    systemMessage: '',
    publicStatus: false,
    status: 0
  }
  editingRole.value = null
  formRef.value?.restoreValidation()
}

// 删除角色
const handleDelete = async (id: string) => {
  try {
    await chatRoleDelete({ id })
    window.$message.success('角色删除成功')
    loadRoleList()
    emit('refresh')
    // 通知左侧刷新角色状态
    useMitt.emit('refresh-roles')
  } catch (error) {
    console.error('删除角色失败:', error)
    window.$message.error('删除角色失败')
  }
}

// 监听弹窗显示状态
watch(showModal, (val) => {
  if (val) {
    loadCategoryList()
    loadModelList()
    loadRoleList()
  }
})

// 监听编辑弹窗打开/关闭
watch(showEditModal, (val) => {
  if (val) {
    loadCategoryList()
    loadModelList()
  } else {
    // 延迟重置，避免关闭动画时看到数据清空
    setTimeout(() => {
      resetForm()
    }, 300)
  }
})
</script>

<style scoped lang="scss">
.empty-container {
  padding: 40px 0;
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-card {
  border: 1px solid var(--line-color);
  border-radius: 8px;
  padding: 16px;
  background: var(--bg-color);
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .role-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .role-name {
      font-size: 16px;
      font-weight: 500;
      color: var(--text-color);
    }

    .role-meta {
      display: flex;
      gap: 12px;
      margin-top: 4px;

      .meta-item {
        font-size: 12px;
        color: #909090;
      }
    }
  }

  .role-card-body {
    margin-top: 12px;
  }
}
</style>
