import { presetWind3 } from '@unocss/preset-wind3'
import transformerDirectives from '@unocss/transformer-directives' // 设置指令
import transformerVariantGroup from '@unocss/transformer-variant-group' // 解决繁琐的多次写前缀的情况
import { defineConfig } from '@unocss/vite'

export default defineConfig({
  content: {
    pipeline: {
      exclude: ['node_modules', 'dist', '.git', '.vscode', 'public', 'build', 'config', 'src-tauri']
    }
  },
  presets: [
    presetWind3({
      dark: {
        dark: '[data-theme="dark"]',
        light: '[data-theme="light"]'
      }
    })
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  /** 自定义规则  */
  rules: [
    [
      /^custom-shadow$/,
      () => ({
        'box-shadow': 'var(--shadow-enabled) 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
      })
    ]
  ],
  /**
   * 快捷键命名标准
   * @default '布局样式 - 水平样式 - 垂直样式'
   */
  shortcuts: {
    'flex-center': 'flex justify-center items-center',
    'flex-end-center': 'flex justify-end items-center',
    'flex-start-center': 'flex justify-start items-center',
    'flex-between-center': 'flex justify-between items-center',
    'flex-around-center': 'flex justify-around items-center',
    'flex-evenly-center': 'flex justify-evenly items-center',
    'flex-col-center': 'flex-center flex-col',
    'flex-col-x-center': 'flex flex-col items-center',
    'flex-col-y-center': 'flex flex-col justify-center',
    'flex-x-center': 'flex justify-center',
    'flex-y-center': 'flex items-center',
    'absolute-center': 'absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2',
    'absolute-flex-center': 'absolute flex-center left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2',
    'absolute-lt': 'absolute left-0 top-0',
    'absolute-lb': 'absolute left-0 bottom-0',
    'absolute-rt': 'absolute right-0 top-0',
    'absolute-rb': 'absolute right-0 bottom-0',
    'absolute-x-center': 'absolute-lt flex-x-center size-full',
    'absolute-y-center': 'absolute-lt flex-y-center size-full',
    'fixed-lt': 'fixed left-0 top-0',
    'fixed-lb': 'fixed left-0 bottom-0',
    'fixed-rt': 'fixed right-0 top-0',
    'fixed-rb': 'fixed right-0 bottom-0',
    'fixed-center': 'fixed-lt flex-center size-full'
  },

  theme: {
    colors: {
      background: 'var(--background)',
      foreground: 'var(--foreground)',
      border: 'var(--border)',
      card: 'var(--card)',
      'card-foreground': 'var(--card-foreground)',
      input: 'var(--input)'
    }
  }
})
