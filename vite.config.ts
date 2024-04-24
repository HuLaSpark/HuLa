import { ConfigEnv, defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite' //自动导入
import Components from 'unplugin-vue-components/vite' //组件注册
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import { getRootPath, getSrcPath } from './build/config/getPath'
import vueJsx from '@vitejs/plugin-vue-jsx'
import unocss from '@unocss/vite'
import terser from '@rollup/plugin-terser'

// https://vitejs.dev/config/
/**! 不需要优化前端打包(如开启gzip) */
export default defineConfig(({ mode }: ConfigEnv) => {
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
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@import "./src/styles/scss/global/variable.scss";' // 加载全局样式，使用scss特性
        }
      }
    },
    define: {
      // enable hydration mismatch details in production build 3.4新增水化不匹配的警告
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true'
    },
    plugins: [
      /**
       * !实验性功能
       * 开启defineProps解构语法
       * */
      vue({ script: { propsDestructure: true } }),
      vueJsx(), // 开启jsx功能
      unocss(), // 开启unocss
      AutoImport({
        imports: ['vue', { 'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'] }],
        dts: 'src/typings/auto-imports.d.ts'
      }),
      /**自动导入组件，但是不会自动导入jsx和tsx*/
      Components({
        dirs: ['src/components/**'], // 设置需要扫描的目录
        resolvers: [NaiveUiResolver()],
        dts: 'src/typings/components.d.ts'
      }),
      /** 压缩代码 */
      terser({
        format: {
          comments: false // 移除所有注释
        },
        compress: {
          drop_console: true, // 移除 console.log
          drop_debugger: true // 移除 debugger
        }
      })
    ],
    build: {
      cssCodeSplit: true, // 启用 CSS 代码拆分
      minify: 'terser', // 指定使用哪种混淆器
      // chunk 大小警告的限制(kb)
      chunkSizeWarningLimit: 1200,
      // 分包配置
      rollupOptions: {
        output: {
          chunkFileNames: 'static/js/[name]-[hash].js', // 引入文件名的名称
          entryFileNames: 'static/js/[name]-[hash].js', // 包的入口文件名称
          assetFileNames: 'static/[ext]/[name]-[hash].[ext]', // 资源文件像 字体，图片等
          // 最小化拆分包
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'invariable'
            }
          }
        }
      }
    },

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
