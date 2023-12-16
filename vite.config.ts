import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite' //自动导入
import Components from 'unplugin-vue-components/vite' //组件注册
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import { getRootPath, getSrcPath } from './build/config/getPath'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 获取当前环境的配置,如何设置第三个参数则加载所有变量，而不是以“VITE_”前缀的变量
  const config = loadEnv(mode, '/')
  console.log(config)
  return {
    resolve: {
      alias: {
        // 配置路径别名@
        '@': getSrcPath(),
        // 配置路径别名~(根路径)
        '~': getRootPath()
      }
    },
    plugins: [
      /**
       * !实验性功能
       * 开启defineModel
       * 开启defineProps解构语法
       * */
      vue({ script: { propsDestructure: true, defineModel: true } }),
      vueJsx(), // 开启jsx功能
      AutoImport({
        imports: ['vue', { 'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'] }],
        dts: 'src/typings/auto-imports.d.ts'
      }),
      /*自动导入组件，但是不会自动导入jsx和tsx*/
      Components({
        dirs: ['src/components'], // 设置需要扫描的目录
        resolvers: [NaiveUiResolver()],
        dts: 'src/typings/components.d.ts'
      })
    ],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      host: '0.0.0.0',
      port: 6130,
      strictPort: true,
      watch: {
        // 3. tell vite to ignore watching `src-tauri`
        ignored: ['**/src-tauri/**']
      }
    }
  }
})
