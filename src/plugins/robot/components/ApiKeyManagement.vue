<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    title="API 密钥管理"
    style="width: 900px"
    :bordered="false"
    :segmented="{ content: 'soft', footer: 'soft' }">
    <template #header-extra>
      <n-button type="primary" size="small" @click="handleAdd">
        <template #icon>
          <Icon icon="mdi:plus" />
        </template>
        新增密钥
      </n-button>
    </template>

    <!-- 密钥列表 -->
    <n-spin :show="loading">
      <div v-if="apiKeyList.length === 0" class="empty-container">
        <n-empty description="暂无 API 密钥" size="large">
          <template #icon>
            <Icon icon="mdi:key-variant" class="text-48px color-#909090" />
          </template>
          <template #extra>
            <n-button type="primary" @click="handleAdd">新增第一个密钥</n-button>
          </template>
        </n-empty>
      </div>

      <div v-else class="api-key-list">
        <div v-for="apiKey in apiKeyList" :key="apiKey.id" class="api-key-card">
          <div class="api-key-card-header">
            <n-flex align="center" :size="12">
              <Icon icon="mdi:key-variant" class="text-32px color-primary" />
              <div class="flex-1">
                <n-flex align="center" :size="8">
                  <span class="api-key-name">{{ apiKey.name }}</span>
                  <n-tag :type="apiKey.status === 0 ? 'success' : 'error'" size="small">
                    {{ apiKey.status === 0 ? '可用' : '不可用' }}
                  </n-tag>
                  <n-tag v-if="apiKey.publicStatus" type="info" size="small">公开</n-tag>
                  <n-tag v-else type="warning" size="small">私有</n-tag>
                </n-flex>
                <div class="api-key-meta">
                  <span class="meta-item">平台: {{ apiKey.platform }}</span>
                  <span class="meta-item">密钥: {{ maskApiKey(apiKey.apiKey) }}</span>
                </div>
              </div>
            </n-flex>
            <n-flex :size="8">
              <!-- 查询余额按钮 -->
              <n-button
                size="small"
                type="info"
                :loading="balanceLoadingMap[apiKey.id]"
                @click="handleQueryBalance(apiKey.id)">
                <template #icon>
                  <Icon icon="mdi:cash-multiple" />
                </template>
                查询余额
              </n-button>
              <!-- 只有私有密钥才显示编辑按钮 -->
              <n-button v-if="!apiKey.publicStatus" size="small" @click="handleEdit(apiKey)">
                <template #icon>
                  <Icon icon="mdi:pencil" />
                </template>
                编辑
              </n-button>
              <!-- 只有私有密钥才显示删除按钮 -->
              <n-popconfirm
                v-if="!apiKey.publicStatus"
                @positive-click="handleDelete(apiKey.id)"
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
                <p>确定要删除密钥 "{{ apiKey.name }}" 吗？</p>
                <p class="text-red-500">删除后将无法恢复！</p>
              </n-popconfirm>
            </n-flex>
          </div>

          <div v-if="apiKey.url || balanceMap[apiKey.id]" class="api-key-card-body">
            <n-descriptions :column="1" size="small" bordered>
              <n-descriptions-item v-if="apiKey.url" label="API 地址">
                {{ apiKey.url }}
              </n-descriptions-item>
              <n-descriptions-item v-if="balanceMap[apiKey.id]" label="账户余额">
                <n-flex align="center" :size="8">
                  <span class="text-primary font-600 text-16px">
                    {{ balanceMap[apiKey.id].balanceInfos[0].totalBalance || '0' }}
                  </span>
                  <span class="text-gray-500">{{ balanceMap[apiKey.id].balanceInfos[0].currency || 'USD' }}</span>
                </n-flex>
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
  </n-modal>

  <!-- 新增/编辑密钥弹窗 -->
  <n-modal
    v-model:show="showEditModal"
    preset="card"
    :title="editingApiKey ? '编辑密钥' : '新增密钥'"
    style="width: 600px"
    :bordered="false"
    :segmented="{ content: 'soft', footer: 'soft' }">
    <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="left" label-width="100px">
      <n-form-item label="密钥名称" path="name">
        <n-input v-model:value="formData.name" placeholder="请输入密钥名称，例如: OpenAI 主账号" />
      </n-form-item>

      <n-form-item label="API 密钥" path="apiKey">
        <n-input
          v-model:value="formData.apiKey"
          type="password"
          show-password-on="click"
          placeholder="请输入 API 密钥" />
      </n-form-item>

      <n-form-item label="平台" path="platform">
        <n-select v-model:value="formData.platform" :options="platformOptions" placeholder="请选择平台" />
      </n-form-item>

      <n-form-item label="API 地址" path="url">
        <n-input v-model:value="formData.url" placeholder="可选，例如: https://api.openai.com/v1" />
      </n-form-item>

      <n-form-item label="状态" path="status">
        <n-select v-model:value="formData.status" :options="statusOptions" placeholder="请选择状态" />
      </n-form-item>
    </n-form>

    <template #footer>
      <n-flex justify="end" :size="12">
        <n-button @click="showEditModal = false">取消</n-button>
        <n-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ editingApiKey ? '保存' : '创建' }}
        </n-button>
      </n-flex>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { FormRules, FormInst } from 'naive-ui'
import {
  apiKeyPage,
  apiKeyCreate,
  apiKeyUpdate,
  apiKeyDelete,
  apiKeyBalance,
  platformList
} from '@/utils/ImRequestUtils'

const showModal = defineModel<boolean>({ default: false })
const emit = defineEmits<{
  refresh: []
}>()

// 密钥列表
const loading = ref(false)
const apiKeyList = ref<any[]>([])
const pagination = ref({
  pageNo: 1,
  pageSize: 10,
  total: 0
})

// 余额相关
const balanceMap = ref<Record<string, any>>({}) // 存储每个密钥的余额信息
const balanceLoadingMap = ref<Record<string, boolean>>({}) // 存储每个密钥的余额加载状态

// 编辑相关
const showEditModal = ref(false)
const editingApiKey = ref<any>(null)
const submitting = ref(false)
const formRef = ref<FormInst>()

// 表单数据
const formData = ref({
  name: '',
  apiKey: '',
  platform: '',
  url: '',
  status: 0
})

// 平台选项
const platformOptions = ref<Array<{ label: string; value: string }>>([])

// 加载平台列表
const loadPlatformList = async () => {
  try {
    const data = await platformList()

    if (data && Array.isArray(data)) {
      platformOptions.value = data.map((item: any) => ({
        label: item.label,
        value: item.platform
      }))
    } else {
      console.warn('⚠️ 平台列表数据格式不正确:', data)
      platformOptions.value = []
    }
  } catch (error) {
    // 如果加载失败，使用默认值
    platformOptions.value = [
      { label: 'SiliconFlow (硅基流动)', value: 'SiliconFlow' },
      { label: 'Gitee AI', value: 'GiteeAI' }
    ]
  }
}

// 状态选项
const statusOptions = [
  { label: '可用', value: 0 },
  { label: '不可用', value: 1 }
]

// 表单验证规则
const formRules: FormRules = {
  name: [{ required: true, message: '请输入密钥名称', trigger: 'blur' }],
  apiKey: [{ required: true, message: '请输入 API 密钥', trigger: 'blur' }],
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
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

// 掩码显示 API 密钥
const maskApiKey = (key: string) => {
  if (!key) return ''
  if (key.length <= 8) return '***'
  return key.substring(0, 4) + '***' + key.substring(key.length - 4)
}

// 加载密钥列表
const loadApiKeyList = async () => {
  loading.value = true
  try {
    const data = await apiKeyPage({
      pageNo: pagination.value.pageNo,
      pageSize: pagination.value.pageSize
    })
    apiKeyList.value = data.list || []
    pagination.value.total = data.total || 0
  } catch (error) {
    console.error('加载 API 密钥列表失败:', error)
    window.$message.error('加载 API 密钥列表失败')
  } finally {
    loading.value = false
  }
}

// 分页变化
const handlePageChange = (page: number) => {
  pagination.value.pageNo = page
  loadApiKeyList()
}

// 新增密钥
const handleAdd = () => {
  editingApiKey.value = null
  formData.value = {
    name: '',
    apiKey: '',
    platform: '',
    url: '',
    status: 0
  }
  showEditModal.value = true
}

// 编辑密钥
const handleEdit = (apiKey: any) => {
  editingApiKey.value = apiKey
  formData.value = {
    name: apiKey.name,
    apiKey: apiKey.apiKey,
    platform: apiKey.platform,
    url: apiKey.url || '',
    status: apiKey.status ?? 0
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
      apiKey: formData.value.apiKey,
      platform: formData.value.platform,
      status: formData.value.status
    }

    if (formData.value.url) {
      submitData.url = formData.value.url
    }

    if (editingApiKey.value) {
      // 更新
      submitData.id = editingApiKey.value.id
      await apiKeyUpdate(submitData)
      window.$message.success('密钥更新成功')
    } else {
      // 创建
      await apiKeyCreate(submitData)
      window.$message.success('密钥创建成功')
    }

    showEditModal.value = false
    loadApiKeyList()
    // 通知父组件刷新
    emit('refresh')
  } catch (error: any) {
    if (error?.errors) {
      return
    }
    console.error('保存密钥失败:', error)
    window.$message.error('保存密钥失败')
  } finally {
    submitting.value = false
  }
}

// 删除密钥
const handleDelete = async (id: string) => {
  try {
    await apiKeyDelete({ id })
    window.$message.success('密钥删除成功')
    loadApiKeyList()
    emit('refresh')
  } catch (error) {
    console.error('删除密钥失败:', error)
    window.$message.error('删除密钥失败')
  }
}

// 查询余额
const handleQueryBalance = async (id: string) => {
  try {
    balanceLoadingMap.value[id] = true
    const data = await apiKeyBalance({ id })
    balanceMap.value[id] = data
    window.$message.success('余额查询成功')
  } catch (error) {
    console.error('查询余额失败:', error)
    window.$message.error('查询余额失败')
  } finally {
    balanceLoadingMap.value[id] = false
  }
}

// 监听弹窗显示状态
watch(showModal, (val) => {
  if (val) {
    loadApiKeyList()
    loadPlatformList()
  }
})

// 组件挂载时加载平台列表
onMounted(() => {
  loadPlatformList()
})
</script>

<style scoped lang="scss">
.empty-container {
  padding: 40px 0;
}

.api-key-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.api-key-card {
  border: 1px solid var(--line-color);
  border-radius: 8px;
  padding: 16px;
  background: var(--bg-color);
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .api-key-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .api-key-name {
      font-size: 16px;
      font-weight: 500;
      color: var(--text-color);
    }

    .api-key-meta {
      display: flex;
      gap: 12px;
      margin-top: 4px;

      .meta-item {
        font-size: 12px;
        color: #909090;
      }
    }
  }

  .api-key-card-body {
    margin-top: 12px;
  }
}
</style>
