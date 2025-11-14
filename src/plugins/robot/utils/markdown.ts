import type { DefineComponent } from 'vue'
import { MarkdownCodeBlockNode, setCustomComponents } from 'vue-renderer-markdown'

interface MarkdownCodeBlockNodeData {
  type: 'code_block'
  language: string
  code: string
  raw: string
  diff?: boolean
  originalCode?: string
  updatedCode?: string
}

type MarkdownCodeBlockNodeProps = {
  node: MarkdownCodeBlockNodeData
  loading?: boolean
  stream?: boolean
  darkTheme?: string
  lightTheme?: string
  isDark?: boolean
  isShowPreview?: boolean
  enableFontSizeControl?: boolean
  minWidth?: string | number
  maxWidth?: string | number
  themes?: string[]
  showHeader?: boolean
  showCopyButton?: boolean
  showExpandButton?: boolean
  showPreviewButton?: boolean
  showFontSizeButtons?: boolean
  onCopy?: (...args: any[]) => void
  onPreviewCode?: (...args: any[]) => void
  [key: string]: unknown
}

const MarkdownCodeBlockNodeComponent = MarkdownCodeBlockNode as unknown as DefineComponent<MarkdownCodeBlockNodeProps>

export const ROBOT_MARKDOWN_CUSTOM_ID = 'robot-chat-markdown'

let initialized = false

const toolbarOverrides = {
  isShowPreview: false,
  showPreviewButton: false,
  enableFontSizeControl: false,
  showFontSizeButtons: false,
  showExpandButton: true,
  showCopyButton: true
} satisfies Partial<MarkdownCodeBlockNodeProps>

const RobotMarkdownCodeBlockNode = defineComponent({
  name: 'RobotMarkdownCodeBlockNode',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () =>
      h(
        MarkdownCodeBlockNodeComponent,
        {
          ...(attrs as Partial<MarkdownCodeBlockNodeProps>),
          ...toolbarOverrides
        } as MarkdownCodeBlockNodeProps,
        slots
      )
  }
})

// 配置默认的代码块组件和主题
export function initMarkdownRenderer() {
  if (initialized) return

  setCustomComponents(ROBOT_MARKDOWN_CUSTOM_ID, {
    code_block: RobotMarkdownCodeBlockNode
  })

  initialized = true
}
