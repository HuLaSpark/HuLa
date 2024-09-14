import pkg from '~/package.json'
import { Button, Select, Slider, Switch, Input, InputNumber } from './model.tsx'
import { NFlex } from 'naive-ui'
import { VNode } from 'vue'
import { type } from '@tauri-apps/plugin-os'
import { MacOsKeyEnum, WinKeyEnum } from '@/enums'

const key = computed(() => {
  return `${type() === 'windows' ? WinKeyEnum.CTRL : MacOsKeyEnum['⌘']}`
})

type ConfigItemType = 'system' | 'record' | 'identity' | 'cueWords' | 'APIAddress' | 'model' | 'clear'
type ChatConfig = {
  [key in ConfigItemType]: {
    title: string
    description?: string
    features: VNode
  }[]
}

/** chat 设置面板配置 */
export const content: ChatConfig = {
  system: [
    {
      title: `当前版本：v${pkg.version}`,
      description: '已是最新版本',
      features: <Button title={'检查更新'} icon={'refresh'} />
    },
    {
      title: '发送键',
      features: (
        <Select
          content={[
            { label: 'Enter', value: 'Enter' },
            { label: `${key.value} + Enter`, value: `${key.value}+Enter` }
          ]}
        />
      )
    },
    {
      title: '主题',
      features: (
        <Select
          content={[
            { label: '亮色', value: 'light' },
            { label: '暗黑模式', value: 'dark' },
            { label: '跟随系统', value: 'auto' }
          ]}
        />
      )
    },
    {
      title: '字体大小',
      description: '聊天内容的字体大小',
      features: <Slider min={12} max={20} value={14} />
    },
    {
      title: '自动生成标题',
      description: '根据对话内容生成合适的标题',
      features: <Switch active={false} />
    }
  ],
  record: [
    {
      title: '云端数据',
      description: '还没有进行同步',
      features: <Button title={'配置'} icon={'setting-config'} />
    },
    {
      title: '本地数据',
      description: '1 次对话，0条消息，0条提示词，0个身份',
      features: (
        <NFlex align={'center'}>
          <Button title={'导入'} icon={'Export'} />
          <Button title={'导出'} icon={'Importing'} />
        </NFlex>
      )
    }
  ],
  identity: [
    {
      title: '身份启动页',
      description: '新建聊天时，展示身份启动页',
      features: <Switch active={true} />
    },
    {
      title: '隐藏内置身份',
      description: '在所有身份列表中隐藏内置身份',
      features: <Switch active={false} />
    }
  ],
  cueWords: [
    {
      title: '禁用提示词自动补全',
      description: '在输入框开头输入/即可触发自动补全',
      features: <Switch active={false} />
    },
    {
      title: '自定义提示词列表',
      description: '内置 285 条，用户定义0条',
      features: <Button title={'编辑'} icon={'edit'} />
    }
  ],
  APIAddress: [
    {
      title: '模型服务商',
      description: '切换不同的服务商',
      features: (
        <Select
          content={[
            { label: 'openAi', value: 'openAi' },
            { label: 'Azure', value: 'Azure' },
            { label: 'Google', value: 'Google' }
          ]}
        />
      )
    },
    {
      title: '接口地址',
      description: '除默认地址外，必须包含 http(s)://',
      features: <Input value={'www.baidu.com'} />
    },
    {
      title: 'API Key',
      description: '使用自定义 OpenAI key 统过密码访问限制',
      features: <Input value={'123456'} isPassword={true} />
    }
  ],
  model: [
    {
      title: '模型(model)',
      features: (
        <Select
          content={[
            { label: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
            { label: 'gpt-4o', value: 'gpt-4o' },
            { label: 'gpt-4-32k', value: 'gpt-4-32k' },
            { label: 'gpt-4-turbo', value: 'gpt-4-turbo' }
          ]}
        />
      )
    },
    {
      title: '随机性(temperature)',
      description: '值越大，回复越随机',
      features: <Slider min={0} max={10} value={5} />
    },
    {
      title: '核采样(top_p)',
      description: '与随机性类似，但不要和随机性一起更改',
      features: <Slider min={0} max={10} value={5} />
    },
    {
      title: '单次回复限制(max_tokens)',
      description: '单次交互所用的最大 Token 数',
      features: <InputNumber value={4000} min={2000} max={10000} />
    },
    {
      title: '话题新鲜度(presence_penalty)',
      description: '值越大，越有可能扩展到新话题',
      features: <Slider min={0} max={10} value={5} />
    },
    {
      title: '频率惩罚度(frequency_penalty)',
      description: '值越大，越有可能降低重复字词',
      features: <Slider min={0} max={10} value={5} />
    },
    {
      title: '注入系统级提示信息',
      description: '强制给每次请求的消息列表开头添加一个模拟 ChatGPT 的系统提示',
      features: <Switch active={false} />
    },
    {
      title: '用户输入预处理',
      description: '用户最新的一条消息会埴充到此模板',
      features: <Input value={'input'} />
    },
    {
      title: '附带历史消息数',
      description: '每次请求携带的历史消息数',
      features: <Slider min={0} max={10} value={5} />
    },
    {
      title: '历史消息长度压缩阈值',
      description: '当未压缩的历史消息超过该值时，将进行压缩',
      features: <InputNumber value={1000} min={0} max={5000} />
    },
    {
      title: '历史摘要',
      description: '自动压缩聊天记录并作为上下文发送',
      features: <Switch active={true} />
    }
  ],
  clear: [
    {
      title: '重置所有设置',
      description: '重置所有设置项回默认值',
      features: <Button title={'立即重置'} isSecondary={true} />
    },
    {
      title: '清除所有数据',
      description: '清除所有聊天、设置数据',
      features: <Button title={'立即清除'} isSecondary={true} />
    }
  ]
}
