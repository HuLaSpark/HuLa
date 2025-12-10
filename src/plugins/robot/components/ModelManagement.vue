<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    title="模型管理"
    style="width: 800px"
    :bordered="false"
    :segmented="{ content: 'soft', footer: 'soft' }">
    <template #header-extra>
      <n-button type="primary" size="small" @click="handleAdd">
        <template #icon>
          <Icon icon="mdi:plus" />
        </template>
        新增模型
      </n-button>
    </template>

    <!-- 模型列表 -->
    <n-spin :show="loading">
      <div v-if="modelList.length === 0" class="empty-container">
        <n-empty description="暂无模型数据" size="large">
          <template #icon>
            <Icon icon="mdi:package-variant-closed" class="text-48px color-#909090" />
          </template>
          <template #extra>
            <n-button type="primary" @click="handleAdd">新增第一个模型</n-button>
          </template>
        </n-empty>
      </div>

      <div v-else class="model-list">
        <div v-for="model in modelList" :key="model.id" class="model-card">
          <div class="model-card-header">
            <n-flex align="center" :size="12">
              <n-avatar round :size="48" :src="getModelAvatar(model)" :fallback-src="getDefaultAvatar()" />
              <div class="flex-1">
                <n-flex align="center" :size="8">
                  <span class="model-name">{{ model.name }}</span>
                  <n-tag :type="model.status === 0 ? 'success' : 'error'" size="small">
                    {{ model.status === 0 ? '可用' : '不可用' }}
                  </n-tag>
                  <n-tag v-if="model.publicStatus === 0" type="info" size="small">公开</n-tag>
                  <n-tag v-else type="warning" size="small">私有</n-tag>
                  <n-tag v-if="model.type === 1" type="info" size="small">对话</n-tag>
                  <n-tag v-else-if="model.type === 2" type="success" size="small">图片</n-tag>
                  <n-tag v-else-if="model.type === 3" type="primary" size="small">音频</n-tag>
                  <n-tag v-else-if="model.type === 4" type="warning" size="small">视频</n-tag>
                  <n-tag v-else-if="model.type === 5" type="default" size="small">向量</n-tag>
                  <n-tag v-else-if="model.type === 6" type="default" size="small">重排序</n-tag>
                  <n-tag v-else-if="model.type === 7" type="warning" size="small">文生视频</n-tag>
                  <n-tag v-else-if="model.type === 8" type="error" size="small">图生视频</n-tag>
                </n-flex>
                <div class="model-meta">
                  <span class="meta-item">平台: {{ model.platform }}</span>
                  <span class="meta-item">模型: {{ model.model }}</span>
                </div>
              </div>
            </n-flex>
            <n-flex :size="8">
              <!-- 只有创建人才显示编辑按钮（公开和私有模型都可以编辑） -->
              <n-button v-if="isModelCreator(model)" size="small" @click="handleEdit(model)">
                <template #icon>
                  <Icon icon="mdi:pencil" />
                </template>
                编辑
              </n-button>
              <!-- 只有创建人才显示删除按钮（公开和私有模型都可以删除） -->
              <n-popconfirm
                v-if="isModelCreator(model)"
                @positive-click="handleDelete(model.id)"
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
                <p>确定要删除模型 "{{ model.name }}" 吗？</p>
                <p class="text-red-500">删除后将无法恢复！</p>
              </n-popconfirm>
            </n-flex>
          </div>

          <div class="model-card-body">
            <n-descriptions :column="3" size="small" bordered>
              <n-descriptions-item label="温度参数">
                {{ model.temperature ?? '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="最大Token">
                {{ model.maxTokens ?? '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="最大上下文">
                {{ model.maxContexts ?? '-' }}
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

  <!-- 新增/编辑模型弹窗 -->
  <n-modal
    v-model:show="showEditModal"
    preset="card"
    :title="editingModel ? '编辑模型' : '新增模型'"
    style="width: 750px"
    :bordered="false"
    :segmented="{ content: 'soft', footer: 'soft' }">
    <n-scrollbar style="max-height: calc(80vh - 140px)">
      <n-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="120px"
        style="padding-right: 12px">
        <n-form-item label="API 密钥" path="keyId">
          <n-flex :size="8" style="width: 100%">
            <n-select
              v-model:value="formData.keyId"
              :options="apiKeyOptions"
              placeholder="请选择 API 密钥"
              style="flex: 1"
              @update:value="handleKeyIdChange" />
            <n-button @click="handleOpenApiKeyManagement">
              <template #icon>
                <Icon icon="mdi:cog" />
              </template>
              管理
            </n-button>
          </n-flex>
        </n-form-item>

        <n-form-item label="平台" path="platform">
          <n-input v-model:value="formData.platform" placeholder="根据API密钥自动设置" disabled />
        </n-form-item>

        <n-form-item label="模型头像" path="avatar">
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
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="handleFileChange" />
        </n-form-item>

        <n-form-item label="模型类型" path="type">
          <n-flex :size="8" style="flex-wrap: wrap">
            <n-button :type="formData.type === 1 ? 'primary' : 'default'" size="small" @click="formData.type = 1">
              <template #icon>
                <Icon icon="mdi:message-text" />
              </template>
              对话
            </n-button>
            <n-button :type="formData.type === 2 ? 'primary' : 'default'" size="small" @click="formData.type = 2">
              <template #icon>
                <Icon icon="mdi:image" />
              </template>
              图片
            </n-button>
            <n-button :type="formData.type === 3 ? 'primary' : 'default'" size="small" @click="formData.type = 3">
              <template #icon>
                <Icon icon="mdi:microphone" />
              </template>
              音频
            </n-button>
            <n-button :type="formData.type === 7 ? 'primary' : 'default'" size="small" @click="formData.type = 7">
              <template #icon>
                <Icon icon="mdi:video-outline" />
              </template>
              文生视频
            </n-button>
            <n-button :type="formData.type === 8 ? 'primary' : 'default'" size="small" @click="formData.type = 8">
              <template #icon>
                <Icon icon="mdi:video-image" />
              </template>
              图生视频
            </n-button>
          </n-flex>
        </n-form-item>

        <n-form-item label="模型名称" path="name">
          <n-input
            v-model:value="formData.name"
            placeholder="请输入模型名称，例如: GPT-4"
            @update:value="handleNameChange" />
        </n-form-item>

        <n-form-item label="模型标志" path="model">
          <n-flex vertical :size="4" style="width: 100%">
            <n-flex :size="8" style="width: 100%">
              <n-select
                v-if="modelExamples.length > 0"
                v-model:value="formData.model"
                :options="modelExamples"
                :placeholder="modelPlaceholder"
                :disabled="!formData.platform"
                filterable
                tag
                style="flex: 1" />
              <n-input
                v-else
                v-model:value="formData.model"
                :placeholder="modelPlaceholder"
                :disabled="!formData.platform"
                style="flex: 1" />
              <n-button v-if="modelDocsUrl" text tag="a" :href="modelDocsUrl" target="_blank" type="info">
                <template #icon>
                  <Icon icon="mdi:open-in-new" />
                </template>
                文档
              </n-button>
            </n-flex>
            <n-text depth="3" style="font-size: 12px">
              {{ modelHint }}
            </n-text>
            <n-text v-if="modelDocsUrl" depth="3" style="font-size: 12px">
              文档链接：
              <n-a :href="modelDocsUrl" target="_blank" style="font-size: 12px">
                {{ modelDocsUrl }}
              </n-a>
            </n-text>
          </n-flex>
        </n-form-item>

        <n-form-item label="状态" path="status">
          <n-select v-model:value="formData.status" :options="statusOptions" placeholder="请选择状态" />
        </n-form-item>

        <n-form-item label="排序值" path="sort">
          <n-input-number v-model:value="formData.sort" :min="0" placeholder="数值越小越靠前" style="width: 100%" />
        </n-form-item>

        <n-form-item label="温度参数" path="temperature">
          <n-input-number
            v-model:value="formData.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            placeholder="0-2之间，控制随机性（可选）"
            style="width: 100%" />
        </n-form-item>

        <n-form-item label="最大Token数" path="maxTokens">
          <n-input-number
            v-model:value="formData.maxTokens"
            :min="1"
            placeholder="单条回复的最大Token数（可选）"
            style="width: 100%" />
        </n-form-item>

        <n-form-item label="最大上下文数" path="maxContexts">
          <n-input-number
            v-model:value="formData.maxContexts"
            :min="1"
            placeholder="上下文的最大Message数量（可选）"
            style="width: 100%" />
        </n-form-item>

        <n-form-item label="是否公开" path="publicStatus">
          <n-switch :value="formData.publicStatus === 0" @update:value="handlePublicStatusChange">
            <template #checked>公开</template>
            <template #unchecked>私有</template>
          </n-switch>
        </n-form-item>
      </n-form>
    </n-scrollbar>

    <template #footer>
      <n-flex justify="end" :size="12">
        <n-button @click="showEditModal = false">取消</n-button>
        <n-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ editingModel ? '保存' : '创建' }}
        </n-button>
      </n-flex>
    </template>
  </n-modal>

  <!-- API 密钥管理弹窗 -->
  <ApiKeyManagement v-model="showApiKeyManagement" @refresh="handleApiKeyManagementRefresh" />
  <!-- 头像裁剪组件 -->
  <AvatarCropper ref="cropperRef" v-model:show="showCropper" :image-url="localImageUrl" @crop="handleCrop" />
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { FormRules, FormInst } from 'naive-ui'
import AvatarCropper from '@/components/common/AvatarCropper.vue'
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import { useUserStore } from '@/stores/user'
import {
  modelPage,
  modelUpdate,
  modelDelete,
  apiKeySimpleList,
  platformList,
  platformAddModel
} from '@/utils/ImRequestUtils'
import ApiKeyManagement from './ApiKeyManagement.vue'

const showModal = defineModel<boolean>({ default: false })
const emit = defineEmits<{
  refresh: []
}>()

const userStore = useUserStore()

// 检查当前用户是否是模型创建人
const isModelCreator = (model: any) => {
  return userStore.userInfo?.uid === model.userId
}

// 模型列表
const loading = ref(false)
const modelList = ref<any[]>([])
const pagination = ref({
  pageNo: 1,
  pageSize: 10,
  total: 0
})

// API 密钥管理
const showApiKeyManagement = ref(false)
const apiKeyOptions = ref<any[]>([])
const apiKeyMap = ref<Map<string, any>>(new Map())

// 编辑相关
const showEditModal = ref(false)
const editingModel = ref<any>(null)
const submitting = ref(false)
const formRef = ref<FormInst>()

// 表单数据
const formData = ref({
  keyId: '',
  name: '',
  model: '',
  platform: '',
  avatar: '',
  type: 1,
  sort: 0,
  status: 0,
  temperature: 0.8,
  maxTokens: 4096,
  maxContexts: 10,
  publicStatus: 1 // 0=公开，1=私有
})

// 平台选项和模型信息
const platformOptions = ref<Array<{ label: string; value: string }>>([])
const platformModelInfo = ref<Record<string, { examples: string; docs: string; hint: string }>>({})

// 加载平台列表
const loadPlatformList = async () => {
  try {
    const data = await platformList()
    if (data && Array.isArray(data)) {
      platformOptions.value = data.map((item: any) => ({
        label: item.label,
        value: item.platform
      }))

      // 构建平台模型信息映射
      const infoMap: Record<string, { examples: string; docs: string; hint: string }> = {}
      data.forEach((item: any) => {
        infoMap[item.platform] = {
          examples: item.examples || '',
          docs: item.docs || '',
          hint: item.hint || ''
        }
      })
      platformModelInfo.value = infoMap
    }
  } catch (error) {
    // 如果加载失败，使用默认值
    platformOptions.value = [
      { label: 'OpenAI', value: 'OpenAI' },
      { label: 'DeepSeek', value: 'DeepSeek' }
    ]
    platformModelInfo.value = {
      OpenAI: {
        examples: 'gpt-4, gpt-4-turbo, gpt-3.5-turbo',
        docs: 'https://platform.openai.com/docs/models',
        hint: '请前往 OpenAI 官网查看可用模型列表'
      },
      DeepSeek: {
        examples: 'deepseek-chat, deepseek-reasoner, deepseek-coder',
        docs: 'https://platform.deepseek.com/api-docs',
        hint: '请前往 DeepSeek 官网查看可用模型列表'
      }
    }
  }
}

// 计算属性：模型示例列表（用于下拉选择）
const modelExamples = computed(() => {
  if (!formData.value.platform) {
    return []
  }
  const info = platformModelInfo.value[formData.value.platform]
  if (!info || !info.examples) {
    return []
  }
  // 将 examples 字符串按逗号分割，去重，并转换为选项格式
  const models = info.examples
    .split(',')
    .map((model) => model.trim())
    .filter((model) => model.length > 0)

  // 使用 Set 去重，保持顺序
  const uniqueModels = Array.from(new Set(models))

  return uniqueModels.map((model) => ({
    label: model,
    value: model
  }))
})

// 计算属性：模型文档链接
const modelDocsUrl = computed(() => {
  if (!formData.value.platform) {
    return ''
  }
  const info = platformModelInfo.value[formData.value.platform]
  return info ? info.docs : ''
})

// 计算属性：模型输入框的占位符
const modelPlaceholder = computed(() => {
  if (!formData.value.platform) {
    return '请先选择平台'
  }
  const info = platformModelInfo.value[formData.value.platform]
  if (modelExamples.value.length > 0) {
    return '请选择或输入模型标志'
  }
  return info ? `例如: ${info.examples}` : '请输入模型标志'
})

// 计算属性：模型输入提示
const modelHint = computed(() => {
  if (!formData.value.platform) {
    return '请先选择平台后再填写模型标志'
  }
  const info = platformModelInfo.value[formData.value.platform]
  return info ? info.hint : '请填写正确的模型标志'
})

// 监听模型输入变化，自动保存到后端
let saveModelTimeout: NodeJS.Timeout | null = null
watch(
  () => formData.value.model,
  async (newModel, _oldModel) => {
    // 清除之前的定时器
    if (saveModelTimeout) {
      clearTimeout(saveModelTimeout)
    }

    // 如果模型为空或平台未选择，不处理
    if (!newModel || !formData.value.platform) {
      return
    }

    // 如果模型已经在示例列表中，不需要保存
    const existingModels = modelExamples.value.map((item) => item.value)
    if (existingModels.includes(newModel)) {
      return
    }

    // 防抖：用户停止输入 1 秒后再保存
    saveModelTimeout = setTimeout(async () => {
      try {
        await platformAddModel(formData.value.platform, newModel)
        // 重新加载平台列表，更新示例
        await loadPlatformList()
        window.$message?.success('模型已添加到示例列表')
      } catch (error) {
        console.error('保存模型失败:', error)
        // 静默失败，不影响用户操作
      }
    }, 1000)
  }
)

// 状态选项
const statusOptions = [
  { label: '可用', value: 0 },
  { label: '不可用', value: 1 }
]

// 表单验证规则
const formRules: FormRules = {
  keyId: [{ required: true, message: '请选择 API 密钥', trigger: 'change' }],
  name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  model: [{ required: true, message: '请输入模型标志', trigger: 'blur' }],
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
  type: [
    {
      required: true,
      type: 'number',
      message: '请选择模型类型',
      trigger: 'change',
      validator: (_rule: any, value: any) => {
        return value !== undefined && value !== null && value !== ''
      }
    }
  ],
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

// 获取默认头像
const getDefaultAvatar = () => {
  return 'https://img1.baidu.com/it/u=3613958228,3522035000&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500'
}

// 获取模型头像
const getModelAvatar = (model: any) => {
  if (!model) return getDefaultAvatar()
  if (model.avatar) return model.avatar
  return getDefaultAvatar()
}

// 加载 API 密钥选项
const loadApiKeyOptions = async () => {
  try {
    const data = await apiKeySimpleList()
    apiKeyOptions.value = (data || []).map((item: any) => ({
      label: item.platform ? `${item.name} (${item.platform})` : item.name,
      value: item.id
    }))
    apiKeyMap.value = new Map((data || []).map((item: any) => [item.id, item]))
  } catch (error) {
    console.error('加载 API 密钥列表失败:', error)
  }
}

// 加载模型列表
const loadModelList = async () => {
  loading.value = true
  try {
    const data = await modelPage({
      pageNo: pagination.value.pageNo,
      pageSize: pagination.value.pageSize
    })
    modelList.value = data.list || []
    pagination.value.total = data.total || 0
  } catch (error) {
    console.error('加载模型列表失败:', error)
    window.$message.error('加载模型列表失败')
  } finally {
    loading.value = false
  }
}

// 分页变化
const handlePageChange = (page: number) => {
  pagination.value.pageNo = page
  loadModelList()
}

// API密钥切换处理
const handleKeyIdChange = (keyId: string) => {
  if (keyId) {
    const apiKeyInfo = apiKeyMap.value.get(keyId)
    if (apiKeyInfo && apiKeyInfo.platform) {
      // 自动填充平台
      formData.value.platform = apiKeyInfo.platform
      // 清空模型标志，让用户重新输入
      formData.value.model = ''
    }
  }
}

// 模型名称变化处理 - 单向同步到模型标志
const handleNameChange = (value: string) => {
  // 将模型名称同步到模型标志（单向绑定）
  if (value) {
    formData.value.model = value
  }
}

// 公开状态变化处理
const handlePublicStatusChange = (checked: boolean) => {
  formData.value.publicStatus = checked ? 0 : 1
}

// 新增模型
const handleAdd = () => {
  editingModel.value = null
  formData.value = {
    keyId: '',
    name: '',
    model: '',
    platform: '',
    avatar: '',
    type: 1,
    sort: 0,
    status: 0,
    temperature: 0.8,
    maxTokens: 4096,
    maxContexts: 10,
    publicStatus: 1 // 0=公开，1=私有
  }
  showEditModal.value = true
}

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

// 编辑模型
const handleEdit = (model: any) => {
  editingModel.value = model
  formData.value = {
    keyId: model.keyId || '',
    name: model.name,
    model: model.model,
    platform: model.platform,
    avatar: model.avatar || '',
    type: model.type ?? 1,
    sort: model.sort ?? 0,
    status: model.status ?? 0,
    temperature: model.temperature ?? 0.8,
    maxTokens: model.maxTokens ?? 4096,
    maxContexts: model.maxContexts ?? 10,
    publicStatus: model.publicStatus ?? 0 // 0=公开，1=私有
  }
  showEditModal.value = true
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitting.value = true

    const submitData: any = {
      keyId: formData.value.keyId,
      name: formData.value.name,
      model: formData.value.model,
      platform: formData.value.platform,
      avatar: formData.value.avatar,
      type: formData.value.type,
      sort: formData.value.sort,
      status: formData.value.status,
      temperature: formData.value.temperature,
      maxTokens: formData.value.maxTokens,
      maxContexts: formData.value.maxContexts,
      publicStatus: formData.value.publicStatus
    }
    if (editingModel.value) {
      submitData.id = editingModel.value.id
      await modelUpdate(submitData)
      window.$message.success('模型更新成功')
    } else {
      await modelUpdate(submitData)
      window.$message.success('模型创建成功')
    }

    showEditModal.value = false
    loadModelList()
    // 通知父组件刷新
    emit('refresh')
  } catch (error: any) {
    if (error?.errors) {
      // 表单验证错误
      return
    }
    console.error('保存模型失败:', error)
    window.$message.error('保存模型失败')
  } finally {
    submitting.value = false
  }
}

// 删除模型
const handleDelete = async (id: string) => {
  try {
    await modelDelete({ id })
    window.$message.success('模型删除成功')
    loadModelList()
    // 通知父组件刷新
    emit('refresh')
  } catch (error) {
    console.error('删除模型失败:', error)
    window.$message.error('删除模型失败')
  }
}

// 打开 API 密钥管理
const handleOpenApiKeyManagement = () => {
  showApiKeyManagement.value = true
}

// API 密钥管理刷新后的回调
const handleApiKeyManagementRefresh = () => {
  loadApiKeyOptions()
}

// 监听弹窗显示状态
watch(showModal, (val) => {
  if (val) {
    loadApiKeyOptions()
    loadModelList()
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

.model-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-card {
  border: 1px solid var(--line-color);
  border-radius: 8px;
  padding: 16px;
  background: var(--bg-color);
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .model-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .model-name {
      font-size: 16px;
      font-weight: 500;
      color: var(--text-color);
    }

    .model-meta {
      display: flex;
      gap: 12px;
      margin-top: 4px;

      .meta-item {
        font-size: 12px;
        color: #909090;
      }
    }
  }

  .model-card-body {
    margin-top: 12px;
  }
}
</style>
