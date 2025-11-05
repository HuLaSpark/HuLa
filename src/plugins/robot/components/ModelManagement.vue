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
                  <n-tag v-if="model.publicStatus" type="info" size="small">公开</n-tag>
                  <n-tag v-else type="warning" size="small">私有</n-tag>
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
    style="width: 600px"
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
              style="flex: 1" />
            <n-button @click="handleOpenApiKeyManagement">
              <template #icon>
                <Icon icon="mdi:cog" />
              </template>
              管理
            </n-button>
          </n-flex>
        </n-form-item>

        <n-form-item label="平台" path="platform">
          <n-select
            v-model:value="formData.platform"
            :options="platformOptions"
            placeholder="请选择平台"
            @update:value="handlePlatformChange" />
        </n-form-item>

        <n-form-item label="模型名称" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入模型名称，例如: GPT-4" />
        </n-form-item>

        <n-form-item label="模型标志" path="model">
          <n-flex vertical :size="4" style="width: 100%">
            <n-input v-model:value="formData.model" :placeholder="modelPlaceholder" :disabled="!formData.platform" />
            <span class="text-(11px #909090)">
              {{ modelHint }}
            </span>
          </n-flex>
        </n-form-item>

        <!-- <n-form-item label="模型类型" path="type">
          <n-select v-model:value="formData.type" :options="typeOptions" placeholder="请选择模型类型" />
        </n-form-item> -->

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
          <n-switch v-model:value="formData.publicStatus">
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
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { FormRules, FormInst } from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { modelPage, modelUpdate, modelDelete, apiKeySimpleList } from '@/utils/ImRequestUtils'
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
  type: 1,
  sort: 0,
  status: 0,
  temperature: 0.8,
  maxTokens: 4096,
  maxContexts: 10,
  publicStatus: false
})

// 平台选项
const platformOptions = [
  // ========== 国外平台 ==========
  { label: 'OpenAI', value: 'OpenAI' },
  { label: 'Azure OpenAI', value: 'AzureOpenAI' },
  { label: 'Anthropic', value: 'Anthropic' },
  { label: 'Google', value: 'Google' },
  { label: 'Ollama', value: 'Ollama' },
  // ========== 国内平台 ==========
  { label: 'Moonshot (KIMI)', value: 'Moonshot' },
  { label: 'DeepSeek', value: 'DeepSeek' },
  { label: 'Baidu (文心一言)', value: 'YiYan' },
  { label: 'Alibaba (通义千问)', value: 'TongYi' },
  { label: 'Tencent (混元)', value: 'HunYuan' },
  { label: 'Zhipu (智谱)', value: 'ZhiPu' },
  { label: 'XingHuo (星火)', value: 'XingHuo' },
  { label: 'DouBao (豆包)', value: 'DouBao' },
  { label: 'SiliconFlow (硅基流动)', value: 'SiliconFlow' },
  { label: 'MiniMax', value: 'MiniMax' },
  { label: 'BaiChuan (百川)', value: 'BaiChuan' },
  // ========== 其他 ==========
  { label: '其他', value: 'Other' }
]

// 平台对应的模型示例和官网链接
const platformModelInfo: Record<string, { examples: string; docs: string; hint: string }> = {
  // ========== 国外平台 ==========
  OpenAI: {
    examples: 'gpt-4, gpt-4-turbo, gpt-3.5-turbo',
    docs: 'https://platform.openai.com/docs/models',
    hint: '请前往 OpenAI 官网查看可用模型列表'
  },
  AzureOpenAI: {
    examples: 'gpt-4, gpt-35-turbo, gpt-4-turbo',
    docs: 'https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models',
    hint: '请前往 Azure OpenAI 官网查看可用模型列表'
  },
  Anthropic: {
    examples: 'claude-3-opus, claude-3-sonnet, claude-3-haiku',
    docs: 'https://docs.anthropic.com/claude/docs/models-overview',
    hint: '请前往 Anthropic 官网查看可用模型列表'
  },
  Google: {
    examples: 'gemini-pro, gemini-pro-vision, gemini-1.5-pro',
    docs: 'https://ai.google.dev/models',
    hint: '请前往 Google AI 官网查看可用模型列表'
  },
  Ollama: {
    examples: 'llama2, mistral, neural-chat, dolphin-mixtral',
    docs: 'https://ollama.ai/library',
    hint: '请前往 Ollama 官网查看可用模型列表'
  },
  // ========== 国内平台 ==========
  Moonshot: {
    examples: 'moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k',
    docs: 'https://platform.moonshot.cn/docs',
    hint: '请前往 Moonshot 官网查看可用模型列表'
  },
  DeepSeek: {
    examples: 'deepseek-chat, deepseek-coder',
    docs: 'https://platform.deepseek.com/api-docs',
    hint: '请前往 DeepSeek 官网查看可用模型列表'
  },
  YiYan: {
    examples: 'ernie-bot-4, ernie-bot-turbo, ernie-bot',
    docs: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html',
    hint: '请前往百度智能云官网查看可用模型列表'
  },
  TongYi: {
    examples: 'qwen-turbo, qwen-plus, qwen-max, qwen-long',
    docs: 'https://help.aliyun.com/zh/dashscope/developer-reference/model-square',
    hint: '请前往阿里云官网查看可用模型列表'
  },
  HunYuan: {
    examples: 'hunyuan-lite, hunyuan-standard, hunyuan-pro',
    docs: 'https://cloud.tencent.com/document/product/1729',
    hint: '请前往腾讯云官网查看可用模型列表'
  },
  ZhiPu: {
    examples: 'glm-4, glm-3-turbo, glm-4v',
    docs: 'https://open.bigmodel.cn/dev/api',
    hint: '请前往智谱 AI 官网查看可用模型列表'
  },
  XingHuo: {
    examples: 'generalv3.5, generalv3, generalv2.1',
    docs: 'https://www.xfyun.cn/doc/spark/Web.html',
    hint: '请前往讯飞星火官网查看可用模型列表'
  },
  DouBao: {
    examples: 'doubao-lite-4k, doubao-lite-32k, doubao-pro-4k',
    docs: 'https://www.volcengine.com/docs/82379',
    hint: '请前往字节豆包官网查看可用模型列表'
  },
  SiliconFlow: {
    examples: 'Qwen/Qwen2-7B-Instruct, meta-llama/Llama-2-7b-chat-hf',
    docs: 'https://docs.siliconflow.cn/zh/api-reference/chat-completions',
    hint: '请前往硅基流动官网查看可用模型列表'
  },
  MiniMax: {
    examples: 'abab6.5-chat, abab5.5-chat, abab5-chat',
    docs: 'https://www.minimaxi.com/document/guides/chat',
    hint: '请前往 MiniMax 官网查看可用模型列表'
  },
  BaiChuan: {
    examples: 'Baichuan2-Turbo, Baichuan2-Turbo-192k, Baichuan2-53B',
    docs: 'https://platform.baichuan-ai.com/docs/api',
    hint: '请前往百川智能官网查看可用模型列表'
  },
  // ========== 其他 ==========
  Other: {
    examples: '请输入自定义模型标志',
    docs: '',
    hint: '请根据您使用的平台文档填写正确的模型标志'
  }
}

// 计算属性：模型输入框的占位符
const modelPlaceholder = computed(() => {
  if (!formData.value.platform) {
    return '请先选择平台'
  }
  const info = platformModelInfo[formData.value.platform]
  return info ? `例如: ${info.examples}` : '请输入模型标志'
})

// 计算属性：模型输入提示
const modelHint = computed(() => {
  if (!formData.value.platform) {
    return '请先选择平台后再填写模型标志'
  }
  const info = platformModelInfo[formData.value.platform]
  return info ? info.hint : '请填写正确的模型标志'
})

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

// 平台切换处理
const handlePlatformChange = (_value: string) => {
  // 清空模型标志，让用户重新输入
  formData.value.model = ''
}

// 新增模型
const handleAdd = () => {
  editingModel.value = null
  formData.value = {
    keyId: '',
    name: '',
    model: '',
    platform: '',
    type: 1,
    sort: 0,
    status: 0,
    temperature: 0.8,
    maxTokens: 4096,
    maxContexts: 10,
    publicStatus: false
  }
  showEditModal.value = true
}

// 编辑模型
const handleEdit = (model: any) => {
  editingModel.value = model
  formData.value = {
    keyId: model.keyId || '',
    name: model.name,
    model: model.model,
    platform: model.platform,
    type: model.type ?? 1,
    sort: model.sort ?? 0,
    status: model.status ?? 0,
    temperature: model.temperature ?? 0.8,
    maxTokens: model.maxTokens ?? 4096,
    maxContexts: model.maxContexts ?? 10,
    publicStatus: model.publicStatus ?? false
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

// 监听 keyId 变化，自动填充平台
watch(
  () => formData.value.keyId,
  (newKeyId) => {
    if (newKeyId) {
      const apiKeyInfo = apiKeyMap.value.get(newKeyId)

      if (apiKeyInfo && apiKeyInfo.platform) {
        // 自动填充平台
        formData.value.platform = apiKeyInfo.platform
      }
    }
  }
)

// 监听弹窗显示状态
watch(showModal, (val) => {
  if (val) {
    loadApiKeyOptions()
    loadModelList()
  }
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
