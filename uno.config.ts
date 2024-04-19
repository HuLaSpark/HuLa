import { defineConfig } from '@unocss/vite'
import presetUno from '@unocss/preset-uno'
import transformerDirectives from '@unocss/transformer-directives' // 设置指令
import transformerVariantGroup from '@unocss/transformer-variant-group' // 解决繁琐的多次写前缀的情况

export default defineConfig({
  content: {
    pipeline: {
      exclude: ['node_modules', 'dist', '.git', '.vscode', 'public', 'build', 'config', 'src-tauri']
    }
  },
  presets: [presetUno({ dark: 'class' })],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  /**
   * 快捷键命名标准
   * @default '布局样式 - 水平样式 - 垂直样式'
   */
  shortcuts: {
    'flex-center': 'flex justify-center items-center',
    'flex-end-center': 'flex justify-end items-end',
    'flex-start-center': 'flex justify-start items-center',
    'flex-between-center': 'flex justify-between items-center',
    'flex-around-center': 'flex justify-around items-center',
    'flex-col-center': 'flex-center flex-col',
    'flex-col-x-center': 'flex flex-col items-center',
    'flex-col-y-center': 'flex flex-col justify-center',
    'flex-x-center': 'flex justify-center',
    'flex-y-center': 'flex items-center',
    'absolute-lt': 'absolute left-0 top-0',
    'absolute-lb': 'absolute left-0 bottom-0',
    'absolute-rt': 'absolute right-0 top-0',
    'absolute-rb': 'absolute right-0 bottom-0',
    'absolute-center': 'absolute-lt flex-center size-full',
    'fixed-lt': 'fixed left-0 top-0',
    'fixed-lb': 'fixed left-0 bottom-0',
    'fixed-rt': 'fixed right-0 top-0',
    'fixed-rb': 'fixed right-0 bottom-0',
    'fixed-center': 'fixed-lt flex-center size-full'
  }
})
