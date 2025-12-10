<template>
  <div class="bot-container">
    <!-- 顶部工具栏 -->
    <div class="language-switcher">
      <div v-if="canGoBack" class="back-btn flex-shrink-0" @click="goBack">
        <svg class="rotate-180"><use href="#right"></use></svg>
        返回
      </div>
      <div v-if="showAssistantMinimalToolbar" class="assistant-compact-toolbar">
        <n-button v-if="canImportLocalModel" size="small" strong secondary class="import-btn" @click="openLocalModel">
          导入模型
        </n-button>
        <n-dropdown
          v-if="isAssistantView"
          trigger="click"
          :show-arrow="false"
          placement="bottom-end"
          :options="assistantModelDropdownOptions"
          @select="handlePresetModelSelect">
          <div :class="['model-select-btn', { active: selectedModelKey && selectedModelKey !== 'local' }]">
            <span class="model-select-text">{{ selectedModelLabel }}</span>
            <svg class="size-12px model-select-icon"><use href="#down"></use></svg>
          </div>
        </n-dropdown>
      </div>
      <template v-else>
        <!-- 语言切换器 (仅在查看 README 时显示) -->
        <div v-if="!isViewingLink" class="flex-y-center w-full justify-between">
          <div class="flex-center gap-12px">
            <div :class="['lang-btn', { active: currentLang === 'zh' }]" @click="switchLanguage('zh')">中文</div>
            <div :class="['lang-btn', { active: currentLang === 'en' }]" @click="switchLanguage('en')">English</div>
          </div>
          <div class="flex-center">
            <n-button
              v-if="isAssistantView && canImportLocalModel"
              size="small"
              strong
              secondary
              class="import-btn"
              @click="openLocalModel">
              导入模型
            </n-button>
            <n-badge class="mr-14px" value="Beta" :color="'var(--bate-color)'">
              <div :class="['assistant-btn', { active: isAssistantView }]" @click="showAssistant()">3D预览</div>
            </n-badge>
            <n-dropdown
              v-if="isAssistantView"
              trigger="click"
              :show-arrow="false"
              placement="bottom-end"
              :options="assistantModelDropdownOptions"
              @select="handlePresetModelSelect">
              <div :class="['model-select-btn', { active: selectedModelKey && selectedModelKey !== 'local' }]">
                <span class="model-select-text">{{ selectedModelLabel }}</span>
                <svg class="size-12px model-select-icon"><use href="#down"></use></svg>
              </div>
            </n-dropdown>
          </div>
        </div>

        <!-- 当前页面标题和操作按钮 -->
        <div v-if="isViewingLink" class="page-title">{{ currentUrl }}</div>
        <div v-if="isViewingLink" class="open-in-browser-btn" @click="openInBrowser">
          <svg class="size-16px"><use href="#share"></use></svg>
          在浏览器中打开
        </div>
      </template>
    </div>

    <div class="bot-content">
      <n-loading-bar-provider ref="loadingBarRef" :to="false" :container-style="loadingBarContainerStyle">
        <!-- HuLa 小管家 3D 模型 -->
        <HuLaAssistant
          v-if="isAssistantView"
          :active="isAssistantView"
          :custom-model="customModelPath"
          @ready="handleAssistantReady"
          @error="handleAssistantError" />

        <!-- Markdown 内容区域 -->
        <div
          v-else-if="!isViewingLink"
          ref="markdownContainer"
          class="markdown-content markdown-body"
          v-html="renderedMarkdown"></div>

        <!-- 外部链接 Tauri Webview 容器 -->
        <div v-else ref="webviewContainer" class="external-webview">
          <div v-if="!canEmbedWebview" class="external-webview__fallback">
            当前环境不支持内嵌浏览器, 已尝试在系统浏览器打开
          </div>
        </div>
      </n-loading-bar-provider>
    </div>
  </div>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import DOMPurify from 'dompurify'
import { openUrl } from '@tauri-apps/plugin-opener'
import type { DropdownOption, LoadingBarProviderInst } from 'naive-ui'
import { Webview } from '@tauri-apps/api/webview'
import { getCurrentWindow, type Window as TauriWindow } from '@tauri-apps/api/window'
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import { isDesktop } from '@/utils/PlatformConstants'
import { useBotStore } from '@/stores/bot'
import { useAssistantModelPresets, type AssistantModelPreset } from '@/hooks/useAssistantModelPresets'
import HuLaAssistant from './HuLaAssistant.vue'

// 当前语言
const currentLang = ref<'zh' | 'en'>('zh')

// 渲染后的 HTML
const renderedMarkdown = ref('')

// 是否正在查看链接
const isViewingLink = ref(false)

// 当前链接 URL
const currentUrl = ref('')

// markdown 容器引用
const markdownContainer = ref<HTMLElement | null>(null)
const webviewContainer = ref<HTMLElement | null>(null)

// 视图状态描述, 用于维护“返回”栈
type ViewState =
  | { type: 'readme' }
  | { type: 'markdown'; source: string }
  | { type: 'web'; url: string }
  | { type: 'assistant' }

const cloneView = (view: ViewState): ViewState => {
  if (view.type === 'readme' || view.type === 'assistant') {
    return { type: view.type }
  }
  if (view.type === 'markdown') {
    return { type: 'markdown', source: view.source }
  }
  return { type: 'web', url: view.url }
}

const currentView = ref<ViewState>({ type: 'readme' })
// 记录历史视图, 便于在 Markdown 与外链之间返回
const historyStack = ref<ViewState[]>([])
const canGoBack = computed(() => historyStack.value.length > 0)
const isAssistantView = computed(() => currentView.value.type === 'assistant')
const customModelPath = ref<string | null>(null)
const selectedModelKey = ref<string | null>(null)
const canImportLocalModel = isDesktop()
const showAssistantMinimalToolbar = computed(() => canImportLocalModel && isAssistantView.value)
let assistantFallbackView: ViewState | null = null

const { presets: assistantModelPresets, fetchAssistantModelPresets } = useAssistantModelPresets()
void fetchAssistantModelPresets()

const botStore = useBotStore()

// 局部加载条引用
const loadingBarRef = ref<LoadingBarProviderInst | null>(null)

const startLoading = () => {
  loadingBarRef.value?.start()
}

const finishLoading = () => {
  loadingBarRef.value?.finish()
}

const errorLoading = () => {
  loadingBarRef.value?.error()
}

const loadingBarContainerStyle = {
  position: 'absolute',
  top: '0',
  left: '0',
  right: '0',
  pointerEvents: 'none'
} as const

// README/Markdown 内容过滤：本地文件可信，尽量少改动布局；如未来需要过滤可扩展此方法
const sanitizeMarkdown = (html: string, options?: { trustContent?: boolean }) => {
  if (options?.trustContent ?? true) {
    return html
  }
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['style', 'align', 'width', 'height', 'cellpadding', 'cellspacing', 'border']
  })
}

const externalWebview = shallowRef<Webview | null>(null)
const webviewLabel = 'bot-inline-browser'
const webviewListeners: UnlistenFn[] = []
let containerResizeObserver: ResizeObserver | null = null
let hostWindow: TauriWindow | null = null
// 桌面端才允许创建嵌入式 Webview, 同时确认 Tauri 内部上下文已就绪
const canEmbedWebview = computed(() => {
  if (typeof window === 'undefined') return false
  return isDesktop() && Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
})

const findPresetByKey = (key: string | null | undefined): AssistantModelPreset | undefined => {
  if (!key) return void 0
  return assistantModelPresets.value.find((preset) => preset.modelKey === key)
}

const formatPresetLabel = (preset: AssistantModelPreset) => {
  if (!preset.version || preset.modelName.includes(preset.version)) {
    return preset.modelName
  }
  return `${preset.modelName} (${preset.version})`
}

const assistantModelDropdownOptions = computed<DropdownOption[]>(() =>
  assistantModelPresets.value.map((preset) => ({
    key: preset.modelKey,
    label: formatPresetLabel(preset),
    extra: preset.description ?? (preset.version ? `版本 ${preset.version}` : void 0)
  }))
)

const selectedModelLabel = computed(() => {
  if (selectedModelKey.value === 'local') {
    return '本地模型'
  }
  const preset = findPresetByKey(selectedModelKey.value)
  if (preset) {
    return formatPresetLabel(preset)
  }
  const first = assistantModelPresets.value[0]
  return first ? formatPresetLabel(first) : '选择模型'
})

const applyFirstPreset = (options?: { force?: boolean }) => {
  const firstPreset = assistantModelPresets.value[0]
  if (!firstPreset) {
    if (options?.force && selectedModelKey.value !== 'local') {
      selectedModelKey.value = null
      customModelPath.value = null
    }
    return
  }
  if (!options?.force && selectedModelKey.value === 'local') {
    return
  }
  selectedModelKey.value = firstPreset.modelKey
  customModelPath.value = firstPreset.modelUrl
}

watch(
  assistantModelPresets,
  (presets) => {
    if (!presets.length) {
      if (selectedModelKey.value !== 'local') {
        selectedModelKey.value = null
        customModelPath.value = null
      }
      return
    }
    if (selectedModelKey.value === 'local') {
      return
    }
    const current = presets.find((preset) => preset.modelKey === selectedModelKey.value)
    if (current) {
      customModelPath.value = current.modelUrl
    } else {
      applyFirstPreset({ force: true })
    }
  },
  { immediate: true }
)

// 将当前视图快照压入栈, 保证后续可回退
const pushCurrentView = () => {
  historyStack.value.push(cloneView(currentView.value))
}

const ensureHostWindow = async () => {
  if (!canEmbedWebview.value) return null
  if (!hostWindow) {
    hostWindow = getCurrentWindow()
  }
  return hostWindow
}

const clearWebviewListeners = () => {
  while (webviewListeners.length) {
    try {
      const unsubscribe = webviewListeners.pop()
      unsubscribe?.()
    } catch (error) {
      console.warn('取消 webview 监听失败:', error)
    }
  }
}

const updateExternalWebviewBounds = async () => {
  if (!externalWebview.value || !webviewContainer.value) return

  const rect = webviewContainer.value.getBoundingClientRect()
  try {
    await externalWebview.value.setPosition(new LogicalPosition(rect.left, rect.top))
    await externalWebview.value.setSize(new LogicalSize(rect.width, rect.height))
  } catch (error) {
    console.warn('更新嵌入 Webview 尺寸失败:', error)
  }
}

const destroyExternalWebview = async () => {
  // 释放监听/观察器, 避免多实例残留占用系统资源
  clearWebviewListeners()

  if (containerResizeObserver && webviewContainer.value) {
    containerResizeObserver.unobserve(webviewContainer.value)
    containerResizeObserver.disconnect()
    containerResizeObserver = null
  }

  window.removeEventListener('resize', updateExternalWebviewBounds)

  if (externalWebview.value) {
    try {
      await externalWebview.value.close()
    } catch (error) {
      console.warn('关闭嵌入 Webview 失败:', error)
    }
    externalWebview.value = null
  }
}

let assistantShouldPopHistoryOnError = false

const handleAssistantReady = () => {
  assistantFallbackView = null
  assistantShouldPopHistoryOnError = false
}

const handleAssistantError = async (error: unknown) => {
  console.error('加载 HuLa 小管家失败:', error)
  customModelPath.value = null
  selectedModelKey.value = null
  applyFirstPreset({ force: true })
  if (assistantShouldPopHistoryOnError && historyStack.value.length) {
    historyStack.value.pop()
  }
  assistantShouldPopHistoryOnError = false
  const fallback = assistantFallbackView
  assistantFallbackView = null
  if (!fallback) return
  if (fallback.type === 'readme') {
    await loadReadme(false)
  } else if (fallback.type === 'markdown') {
    await loadMarkdownFile(fallback.source, false)
  } else if (fallback.type === 'web') {
    await showExternalLink(fallback.url, false)
  }
}

const showAssistant = async (recordHistory = true, preserveCustomModel = false) => {
  await fetchAssistantModelPresets(assistantModelPresets.value.length <= 1)
  if (currentView.value.type === 'assistant') {
    botStore.setAssistant('正在预览模型')
    if (preserveCustomModel) {
      await nextTick()
    }
    return
  }
  if (!preserveCustomModel) {
    applyFirstPreset({ force: true })
  }
  assistantFallbackView = cloneView(currentView.value)
  assistantShouldPopHistoryOnError = recordHistory
  if (recordHistory) {
    pushCurrentView()
  }
  await destroyExternalWebview()
  isViewingLink.value = false
  currentUrl.value = ''
  currentView.value = { type: 'assistant' }
  botStore.setAssistant('正在预览模型')
  await nextTick()
}

const openLocalModel = async () => {
  try {
    const selected = await open({
      filters: [
        {
          name: '3D Models',
          extensions: ['glb', 'gltf', 'vrm']
        }
      ],
      multiple: false
    })
    if (!selected) return
    customModelPath.value = Array.isArray(selected) ? selected[0] : selected
    selectedModelKey.value = 'local'
    await showAssistant(true, true)
  } catch (error) {
    console.error('选择本地模型失败:', error)
    window.$message?.error('选择模型文件失败，请重试')
  }
}

const handlePresetModelSelect = async (key: string) => {
  const preset = findPresetByKey(key)
  if (!preset) return
  const targetModelPath = preset.modelUrl
  if (selectedModelKey.value === key && targetModelPath === customModelPath.value) {
    if (currentView.value.type !== 'assistant') {
      await showAssistant(true, true)
    }
    return
  }
  selectedModelKey.value = key
  customModelPath.value = targetModelPath
  await showAssistant(true, true)
}

const createExternalWebview = async (url: string) => {
  // 将新 Webview 附着到当前窗口, 坐标尺寸以容器为准保持贴合
  const windowInstance = await ensureHostWindow()
  if (!windowInstance || !webviewContainer.value) return

  // 刷新后可能残留旧实例，尝试关闭同名 Webview
  try {
    const existing = await Webview.getByLabel(webviewLabel)
    await existing?.close()
  } catch (error) {
    // 忽略未找到的情况
  }

  await destroyExternalWebview()
  const rect = webviewContainer.value.getBoundingClientRect()
  const newWebview = new Webview(windowInstance, webviewLabel, {
    url,
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    focus: true,
    dragDropEnabled: true
  })

  externalWebview.value = newWebview
  containerResizeObserver = new ResizeObserver(() => {
    updateExternalWebviewBounds()
  })
  containerResizeObserver.observe(webviewContainer.value)
  window.addEventListener('resize', updateExternalWebviewBounds, { passive: true })

  const createdListener = await newWebview.once('tauri://created', async () => {
    await updateExternalWebviewBounds()
    botStore.setWeb(url)
    finishLoading()
  })
  const errorListener = await newWebview.once('tauri://error', async (error) => {
    console.error('嵌入 Webview 创建失败:', error)
    errorLoading()
    await destroyExternalWebview()
    isViewingLink.value = false
    currentUrl.value = ''
    try {
      await openUrl(url)
    } catch (openError) {
      console.error('在浏览器中打开失败:', openError)
    }
  })
  webviewListeners.push(createdListener, errorListener)
}

const showExternalLink = async (url: string, recordHistory = true) => {
  const previousView = currentView.value
  if (recordHistory) {
    pushCurrentView()
  }
  currentUrl.value = url
  isViewingLink.value = true
  currentView.value = { type: 'web', url }

  startLoading()
  await nextTick()

  if (!canEmbedWebview.value) {
    finishLoading()
    botStore.setWeb(url)
    try {
      await openUrl(url)
    } catch (error) {
      console.error('在浏览器中打开失败:', error)
      errorLoading()
    }
    return
  }

  try {
    await createExternalWebview(url)
  } catch (error) {
    console.error('创建嵌入 Webview 失败:', error)
    errorLoading()
    if (recordHistory) {
      historyStack.value.pop()
    }
    await destroyExternalWebview()
    if (previousView.type === 'markdown') {
      await loadMarkdownFile(previousView.source, false)
    } else {
      await loadReadme(false)
    }
  }
}

// 加载 README
const loadReadme = async (recordHistory = false, resetHistory = false) => {
  startLoading()
  try {
    if (recordHistory) {
      pushCurrentView()
    }
    if (resetHistory) {
      historyStack.value = []
    }
    // 回到 Markdown 视图前移除 Webview, 防止残留
    await destroyExternalWebview()
    const html = await invoke<string>('get_readme_html', {
      language: currentLang.value
    })
    // README 来源可信，直接渲染以保留原有布局
    renderedMarkdown.value = sanitizeMarkdown(html)
    // 先更新视图状态, 确保 nextTick 时容器已挂载
    currentView.value = { type: 'readme' }
    isViewingLink.value = false
    currentUrl.value = ''

    // 等待 DOM 更新后添加链接点击监听
    await nextTick()
    attachLinkListeners()
    finishLoading()
    botStore.setReadme(currentLang.value)
  } catch (error) {
    console.error('加载 README 失败:', error)
    renderedMarkdown.value = '<p>加载失败,请稍后重试</p>'
    if (recordHistory) {
      historyStack.value.pop()
    }
    errorLoading()
  }
}

// 加载本地 markdown 文件
const loadMarkdownFile = async (filePath: string, recordHistory = true) => {
  startLoading()
  try {
    if (recordHistory) {
      pushCurrentView()
    }
    // 加载本地 Markdown 时同样移除嵌入页面
    await destroyExternalWebview()
    const html = await invoke<string>('parse_markdown', {
      filePath: filePath
    })
    // 本地 Markdown 可信，直接渲染以保留原有布局
    renderedMarkdown.value = sanitizeMarkdown(html)

    // 显示在 markdown 视图中,而不是 iframe
    isViewingLink.value = false
    // 先更新视图状态, 确保 nextTick 时容器已挂载
    currentView.value = { type: 'markdown', source: filePath }
    currentUrl.value = ''

    // 等待 DOM 更新后添加链接点击监听
    await nextTick()
    attachLinkListeners()
    finishLoading()
    botStore.setMarkdown(filePath)
  } catch (error) {
    console.error('加载 markdown 文件失败:', error)
    renderedMarkdown.value = `<p>加载文件失败: ${filePath}</p><p>错误: ${error}</p>`
    if (recordHistory) {
      historyStack.value.pop()
    }
    errorLoading()
  }
}

// 移除链接点击监听器
const removeLinkListeners = () => {
  if (!markdownContainer.value) return
  markdownContainer.value.removeEventListener('click', handleLinkClick, true)
}

// 附加链接点击监听器
const attachLinkListeners = () => {
  if (!markdownContainer.value) return

  // 先移除旧的监听器(如果存在),避免重复添加
  removeLinkListeners()

  // 使用事件委托在容器级别监听,使用捕获阶段确保优先处理
  markdownContainer.value.addEventListener('click', handleLinkClick, true)
  console.log('已附加链接监听器')
}

// 处理链接点击
const handleLinkClick = async (event: Event) => {
  // 确保获取到 a 标签,即使点击的是子元素
  let target = event.target as HTMLElement
  while (target && target.tagName !== 'A') {
    target = target.parentElement as HTMLElement
  }

  if (!target || target.tagName !== 'A') return

  const href = (target as HTMLAnchorElement).getAttribute('href')
  if (!href) return

  // 阻止默认行为
  event.preventDefault()
  event.stopPropagation()

  console.log('点击链接:', href)

  // 处理锚点链接 - 滚动到对应位置
  if (href.startsWith('#')) {
    console.log('滚动到锚点:', href)
    const id = href.substring(1)
    const element = markdownContainer.value?.querySelector(`#${id}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  } else if (href.endsWith('.md')) {
    // 如果是 .md 文件,使用 Rust 后端解析并渲染
    console.log('加载 markdown 文件:', href)
    await loadMarkdownFile(href, true)
  } else {
    // 所有其他链接(包括外部链接和相对链接)都通过 Tauri Webview 内嵌打开
    console.log('在组件内打开:', href)
    await showExternalLink(href)
  }
}

// 在外部浏览器中打开当前链接
const openInBrowser = async () => {
  if (!currentUrl.value) return
  try {
    await openUrl(currentUrl.value)
  } catch (error) {
    console.error('在浏览器中打开失败:', error)
  }
}

// 返回 README
const goBack = async () => {
  if (!historyStack.value.length) return
  const previous = historyStack.value.pop()
  if (!previous) return

  if (previous.type === 'readme') {
    await loadReadme(false)
  } else if (previous.type === 'markdown') {
    await loadMarkdownFile(previous.source, false)
  } else if (previous.type === 'assistant') {
    await showAssistant(false)
  } else {
    await showExternalLink(previous.url, false)
  }
}

// 切换语言
const switchLanguage = (lang: 'zh' | 'en') => {
  currentLang.value = lang
}

// 监听语言变化重新加载
watch(currentLang, () => {
  loadReadme(false, true)
})

// 监听视图切换,当返回 README 时重新附加监听器
watch(isViewingLink, async (newValue) => {
  if (!newValue) {
    // 返回到 README 视图,等待 DOM 更新后重新附加监听器
    await nextTick()
    attachLinkListeners()
  } else {
    // 切换为外链视图时重新对齐嵌入 Webview
    await nextTick()
    updateExternalWebviewBounds()
  }
})

// 组件挂载时加载
onMounted(() => {
  // 刷新后可能存在残留的内嵌 Webview，尝试关闭
  Webview.getByLabel(webviewLabel)
    .then((webview) => webview?.close())
    .catch(() => {})

  window.addEventListener('beforeunload', destroyExternalWebview)
  loadReadme(false, true)
})

// 组件卸载时清理事件监听
onUnmounted(() => {
  removeLinkListeners()
  // 组件销毁时关闭 Webview, 避免孤立窗口
  void destroyExternalWebview()
  window.removeEventListener('beforeunload', destroyExternalWebview)
})
</script>

<style scoped lang="scss">
.bot-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  background: var(--bg-color);
}

.language-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line-color);
  background: var(--bg-color);
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;

  .assistant-compact-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 1;
    width: 100%;
  }

  .back-btn {
    display: flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-color);
    background: var(--bg-msg-hover);
    transition: all 0.2s ease;
    user-select: none;
    -webkit-user-select: none;

    svg {
      width: 16px;
      height: 16px;
    }

    &:hover {
      @apply bg-[#13987f40] text-[#13987f];
    }
  }

  .page-title {
    flex: 1;
    font-size: 13px;
    color: var(--chat-text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.25;
    padding: 0 12px;
    &:hover {
      text-decoration-line: underline;
      color: #13987f;
    }
  }

  .open-in-browser-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-color);
    background: var(--bg-msg-hover);
    transition: all 0.2s ease;
    user-select: none;
    -webkit-user-select: none;
    white-space: nowrap;

    svg {
      width: 16px;
      height: 16px;
    }

    &:hover {
      @apply bg-[#13987f40] text-[#13987f];
    }
  }

  .assistant-btn {
    padding: 6px 18px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-color);
    background: linear-gradient(135deg, rgba(19, 152, 127, 0.32), rgba(19, 152, 127, 0.1));
    transition: all 0.2s ease-in-out;
    user-select: none;
    -webkit-user-select: none;

    &:hover {
      color: #13987f;
    }

    &.active {
      color: #ffffff;
      background: linear-gradient(135deg, #13987f, #1fb39b80);
      border-color: rgba(19, 152, 127, 0.4);
    }
  }

  .model-select-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    margin-left: 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-color);
    background: var(--bg-msg-hover);
    transition: all 0.2s ease-in-out;
    user-select: none;
    -webkit-user-select: none;

    &:hover {
      color: #13987f;
    }

    &.active {
      color: #13987f;
      background: rgba(19, 152, 127, 0.18);
      box-shadow: inset 0 0 0 1px rgba(19, 152, 127, 0.25);
    }
  }

  .model-select-text {
    white-space: nowrap;
  }

  .model-select-icon {
    color: currentColor;
  }

  .lang-btn {
    padding: 6px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-color);
    background: var(--bg-msg-hover);
    transition: all 0.2s ease;
    user-select: none;
    -webkit-user-select: none;

    &:hover {
      @apply dark:bg-[#13987f40] bg-[#e8f4f1] text-[#13987f];
    }

    &.active {
      @apply dark:bg-[#13987f40] bg-[#e8f4f1] text-[#13987f];
      box-shadow: inset 0 0 0 1px #13987f60;
    }
  }

  .import-btn {
    margin-right: 16px;
  }
}

.bot-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.external-webview {
  flex: 1;
  min-height: 0;
  max-width: 100%;
  position: relative;
  box-sizing: border-box;
}

.external-webview__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color-secondary, #909090);
  font-size: 14px;
  padding: 16px;
  text-align: center;
}

// Markdown 内容容器
.markdown-content {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  background-color: transparent;
  color: var(--text-color);
  box-sizing: border-box;
  font-size: 14px;
  line-height: 1.7;
  word-wrap: break-word;
  overflow-wrap: break-word;

  // 强制所有直接子元素不超出容器
  > * {
    max-width: 100%;
  }
  --fgColor-default: var(--text-color);
  --fgColor-muted: var(--chat-text-color, var(--text-color));
  --fgColor-accent: #13987f;
  --fgColor-attention: #13987f;
  --fgColor-success: var(--success-color, #13987f);
  --fgColor-danger: var(--danger-color, #d1242f);
  --bgColor-default: var(--bg-color);
  --bgColor-muted: var(--bg-msg-hover);
  --bgColor-neutral-muted: rgba(144, 144, 144, 0.15);
  --bgColor-attention-muted: #13987f16;
  --borderColor-default: var(--line-color);
  --borderColor-muted: var(--line-color);
  --borderColor-neutral-muted: rgba(144, 144, 144, 0.2);
  --borderColor-accent-emphasis: #13987f;

  // 通用表格处理
  :deep(table) {
    display: table;
    width: 100%;
    max-width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
    overflow-x: auto;
    box-sizing: border-box;
    margin: 16px 0;

    tbody,
    thead {
      display: table;
      width: 100%;
      table-layout: auto;
    }

    tr {
      display: table-row;
    }

    td,
    th {
      display: table-cell;
      padding: 8px 10px;
      border: 1px solid var(--borderColor-default);
      word-break: break-word;
      overflow-wrap: break-word;
    }

    th {
      background: var(--bgColor-neutral-muted);
      font-weight: 600;
      text-align: left;
    }
  }

  // 代码块自适应 - 在容器内滚动
  :deep(pre) {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: pre;
    word-wrap: normal;
    box-sizing: border-box;
    margin: 16px 0;

    code {
      display: inline-block;
      min-width: 100%;
      white-space: pre;
      word-wrap: normal;
    }
  }

  // 行内代码自适应
  :deep(code) {
    max-width: 100%;
    word-break: break-word;
    box-sizing: border-box;
  }

  // 图片自适应
  :deep(img) {
    max-width: 100%;
    height: auto;
    box-sizing: border-box;
  }

  // 长 URL 和文本处理
  :deep(a) {
    color: #13987f;
    word-break: break-word;
    overflow-wrap: break-word;
    text-decoration: none;
  }

  :deep(a:hover) {
    text-decoration: underline;
  }

  // 段落和标题自适应
  :deep(p),
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    max-width: 100%;
    word-wrap: break-word;
    overflow-wrap: break-word;
    box-sizing: border-box;
    margin: 0 0 12px;
  }

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-weight: 700;
    line-height: 1.4;
  }

  :deep(h1) {
    font-size: 26px;
  }

  :deep(h2) {
    font-size: 22px;
  }

  :deep(h3) {
    font-size: 18px;
  }

  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-size: 16px;
  }

  // 列表自适应
  :deep(ul),
  :deep(ol) {
    max-width: 100%;
    box-sizing: border-box;
    padding-left: 20px;
    margin: 0 0 12px;
  }

  :deep(li) {
    margin-bottom: 6px;
  }

  // 引用块自适应
  :deep(blockquote) {
    max-width: 100%;
    overflow-x: auto;
    box-sizing: border-box;
    padding: 8px 12px;
    margin: 12px 0;
    border-left: 3px solid var(--fgColor-accent);
    background: var(--bgColor-attention-muted);
  }

  // div 和其他容器自适应
  :deep(div) {
    max-width: 100%;
    box-sizing: border-box;
  }

  // 美化滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(144, 144, 144, 0.3);
    border-radius: 3px;

    &:hover {
      background: rgba(144, 144, 144, 0.5);
    }
  }
}
</style>
