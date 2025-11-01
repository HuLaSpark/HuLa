/**
 * Vue Renderer Markdown 插件初始化
 * 配置全局 Shiki 代码高亮主题
 */

import { setCustomComponents, MarkdownCodeBlockNode } from 'vue-renderer-markdown'
import { h } from 'vue'

// 配置默认的代码块组件和主题
export function initMarkdownRenderer() {
  // 使用 MarkdownCodeBlockNode 替换默认的代码块组件，并配置 vitesse-dark 主题
  setCustomComponents({
    code_block: (props: any) =>
      h(MarkdownCodeBlockNode, {
        ...props,
        darkTheme: 'vitesse-dark',
        lightTheme: 'vitesse-light',
        isDark: true, // 默认使用深色主题
        showHeader: false // 隐藏代码块顶部操作栏
      })
  })
}
