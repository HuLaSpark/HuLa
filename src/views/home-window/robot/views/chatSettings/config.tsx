import pkg from '~/package.json'
import { Button, Select, Slider, Switch } from './model.tsx'

type ChatConfig = {
  system: {
    title: string
    description?: string
    features: JSX.Element
  }[]
}

export const content: ChatConfig = {
  system: [
    {
      title: `当前版本：${pkg.version}`,
      description: '已是最新版本',
      features: Button('检查更新', 'refresh')
    },
    {
      title: '发送键',
      features: Select([
        { label: 'Enter', value: 'Enter' },
        { label: 'Ctrl + Enter', value: 'Ctrl+Enter' }
      ])
    },
    {
      title: '主题',
      features: Select([
        { label: '亮色', value: 'light' },
        { label: '暗黑模式', value: 'dark' },
        { label: '跟随系统', value: 'auto' }
      ])
    },
    {
      title: '字体大小',
      description: '聊天内容的字体大小',
      features: Slider(20, 12)
    },
    {
      title: '自动生成标题',
      description: '根据对话内容生成合适的标题',
      features: Switch()
    }
  ]
}
