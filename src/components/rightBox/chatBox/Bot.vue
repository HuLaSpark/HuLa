<template>
  <div class="bot-container">
    <!-- 顶部工具栏 -->
    <div class="language-switcher">
      <!-- 返回按钮 -->
      <div v-if="canGoBack" class="back-btn" @click="goBack">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        返回
      </div>

      <!-- 语言切换器 (仅在查看 README 时显示) -->
      <template v-if="!isViewingLink">
        <div :class="['lang-btn', { active: currentLang === 'zh' }]" @click="switchLanguage('zh')">中文</div>
        <div :class="['lang-btn', { active: currentLang === 'en' }]" @click="switchLanguage('en')">English</div>
      </template>

      <!-- 当前页面标题和操作按钮 -->
      <div v-if="isViewingLink" class="page-title">{{ currentUrl }}</div>
      <div v-if="isViewingLink" class="open-in-browser-btn" @click="openInBrowser">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
        在浏览器中打开
      </div>
    </div>

    <div class="bot-content">
      <n-loading-bar-provider ref="loadingBarRef" :to="false" :container-style="loadingBarContainerStyle">
        <!-- Markdown 内容区域 -->
        <div v-if="!isViewingLink" ref="markdownContainer" class="markdown-content" v-html="renderedMarkdown"></div>

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
import type { LoadingBarProviderInst } from 'naive-ui'
import { Webview } from '@tauri-apps/api/webview'
import { getCurrentWindow, type Window as TauriWindow } from '@tauri-apps/api/window'
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { isDesktop } from '@/utils/PlatformConstants'
import { useBotStore } from '@/stores/bot'

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
type ViewState = { type: 'readme' } | { type: 'markdown'; source: string } | { type: 'web'; url: string }

const currentView = ref<ViewState>({ type: 'readme' })
// 记录历史视图, 便于在 Markdown 与外链之间返回
const historyStack = ref<ViewState[]>([])
const canGoBack = computed(() => historyStack.value.length > 0)

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

// 将当前视图快照压入栈, 保证后续可回退
const pushCurrentView = () => {
  const view = currentView.value
  if (view.type === 'readme') {
    historyStack.value.push({ type: 'readme' })
  } else if (view.type === 'markdown') {
    historyStack.value.push({ type: 'markdown', source: view.source })
  } else {
    historyStack.value.push({ type: 'web', url: view.url })
  }
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

const createExternalWebview = async (url: string) => {
  // 将新 Webview 附着到当前窗口, 坐标尺寸以容器为准保持贴合
  const windowInstance = await ensureHostWindow()
  if (!windowInstance || !webviewContainer.value) return

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
    // 使用 DOMPurify 进行额外的安全处理
    renderedMarkdown.value = DOMPurify.sanitize(html)

    // 等待 DOM 更新后添加链接点击监听
    await nextTick()
    attachLinkListeners()
    finishLoading()
    botStore.setReadme(currentLang.value)
    currentView.value = { type: 'readme' }
    isViewingLink.value = false
    currentUrl.value = ''
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
    // 使用 DOMPurify 进行额外的安全处理
    renderedMarkdown.value = DOMPurify.sanitize(html)

    // 显示在 markdown 视图中,而不是 iframe
    isViewingLink.value = false

    // 等待 DOM 更新后添加链接点击监听
    await nextTick()
    attachLinkListeners()
    finishLoading()
    botStore.setMarkdown(filePath)
    currentView.value = { type: 'markdown', source: filePath }
    isViewingLink.value = false
    currentUrl.value = ''
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
  loadReadme(false, true)
})

// 组件卸载时清理事件监听
onUnmounted(() => {
  removeLinkListeners()
  // 组件销毁时关闭 Webview, 避免孤立窗口
  void destroyExternalWebview()
})
</script>

<style scoped lang="scss">
.bot-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
}

.language-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line-color);
  background: var(--bg-color);

  .back-btn {
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

    svg {
      width: 16px;
      height: 16px;
    }

    &:hover {
      background: #fbb99030;
      color: #fbb160;
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
      background: #fbb99030;
      color: #fbb160;
    }
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
      background: #fbb99030;
      color: #fbb160;
    }

    &.active {
      background: #fbb99040;
      color: #fbb160;
      font-weight: 500;
      box-shadow: inset 0 0 0 1px #fbb16040;
    }
  }
}

.bot-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.external-webview {
  flex: 1;
  min-height: 0;
  position: relative;
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

// markdown内容样式
.markdown-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;

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

  // Markdown 样式优化
  :deep() {
    // 标题样式
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      color: var(--text-color);
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }

    h1 {
      font-size: 2em;
      border-bottom: 1px solid var(--line-color);
      padding-bottom: 0.3em;
    }

    h2 {
      font-size: 1.5em;
      border-bottom: 1px solid var(--line-color);
      padding-bottom: 0.3em;
    }

    h3 {
      font-size: 1.25em;
    }
    h4 {
      font-size: 1em;
    }
    h5 {
      font-size: 0.875em;
    }
    h6 {
      font-size: 0.85em;
      color: #6a737d;
    }

    // 段落和文本
    p {
      margin-top: 0;
      margin-bottom: 16px;
      color: var(--text-color);
      line-height: 1.6;
    }

    // 链接样式
    a {
      color: #fbb160;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    // 列表样式
    ul,
    ol {
      padding-left: 2em;
      margin-top: 0;
      margin-bottom: 16px;
      color: var(--text-color);
    }

    li {
      margin-top: 0.25em;
    }

    // 代码样式
    code {
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      background-color: rgba(251, 177, 96, 0.1);
      border-radius: 3px;
      color: #fbb160;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }

    pre {
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      background-color: var(--bg-msg-hover);
      border-radius: 6px;
      margin-bottom: 16px;

      code {
        padding: 0;
        background: transparent;
        color: var(--text-color);
      }
    }

    // 引用样式
    blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #fbb160;
      margin: 0 0 16px 0;

      > :first-child {
        margin-top: 0;
      }

      > :last-child {
        margin-bottom: 0;
      }
    }

    // 表格样式
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
      color: var(--text-color);

      th,
      td {
        padding: 6px 13px;
        border: 1px solid var(--line-color);
      }

      th {
        font-weight: 600;
        background: var(--bg-msg-hover);
      }

      tr {
        background-color: var(--bg-color);
        border-top: 1px solid var(--line-color);

        &:nth-child(2n) {
          background-color: var(--bg-msg-hover);
        }
      }
    }

    // 水平线
    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: var(--line-color);
      border: 0;
    }

    // 图片样式
    img {
      max-width: 100%;
      box-sizing: content-box;
      border-radius: 6px;
      margin: 16px 0;
    }

    // 任务列表
    input[type='checkbox'] {
      margin-right: 0.5em;
    }
  }
}
</style>
