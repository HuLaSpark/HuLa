/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { getRootPath, getSrcPath } from './build/config/getPath'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'pinia',
        { 'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'] }
      ],
      dts: 'src/typings/auto-imports.d.ts'
    }),
    Components({
      dirs: ['src/components/**'],
      resolvers: [NaiveUiResolver()],
      dts: 'src/typings/components.d.ts'
    })
  ],
  resolve: {
    alias: {
      '@': getSrcPath(),
      '~': getRootPath()
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{vue,js,jsx,ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{js,ts}', 'src/types/**', 'src/**/*.d.ts']
    }
  }
})
