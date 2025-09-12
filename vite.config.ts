import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import terser from '@rollup/plugin-terser'
import UnoCSS from '@unocss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import postcsspxtorem from 'postcss-pxtorem'
import AutoImport from 'unplugin-auto-import/vite' //自动导入
import { NaiveUiResolver, VantResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite' //组件注册
import { type ConfigEnv, defineConfig, loadEnv } from 'vite'
import VueSetupExtend from 'vite-plugin-vue-setup-extend'
import { getRootPath, getSrcPath } from './build/config/getPath'

// 读取 package.json 依赖
const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))
const dependencies = Object.keys(packageJson.dependencies || {})

// https://vitejs.dev/config/
/**! 不需要优化前端打包(如开启gzip) */
export default defineConfig(({ mode }: ConfigEnv) => {
  // 获取当前环境的配置,如何设置第三个参数则加载所有变量，而不是以"VITE_"前缀的变量
  const config = loadEnv(mode, process.cwd(), '')
  const host = config.TAURI_DEV_HOST

  return {
    resolve: {
      alias: {
        // 配置主路径别名@
        '@': getSrcPath(),
        // 配置移动端路径别名@
        '#': getSrcPath('src/mobile'),
        // 配置路径别名~(根路径)
        '~': getRootPath()
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          additionalData: '@use "@/styles/scss/global/variable.scss" as *;' // 加载全局样式，使用scss特性
        }
      },
      postcss: {
        plugins: [
          postcsspxtorem({
            rootValue: 16, // 1rem = 16px，可根据设计稿调整
            propList: ['*'], // 所有属性都转换
            unitPrecision: 5, // 保留小数位数
            selectorBlackList: [], // 不转换的类名（可选）
            replace: true, // 替换原来的 px
            mediaQuery: false, // 是否在媒体查询中转换
            minPixelValue: 0 // 最小转换单位
          })
        ]
      }
    },
    plugins: [
      /**
       * vue3.5.0已支持解构并具有响应式
       * */
      vue(),
      VueSetupExtend(), // setup 中给组件命名(keepAlive需要)
      vueJsx(), // 开启jsx功能
      UnoCSS(), // 开启UnoCSS
      AutoImport({
        imports: [
          'vue',
          'vue-router',
          'pinia',
          { 'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar', 'useModal'] }
        ],
        dts: 'src/typings/auto-imports.d.ts'
      }),
      /**自动导入组件，但是不会自动导入jsx和tsx*/
      Components({
        dirs: ['src/components/**', 'src/mobile/components/**'], // 设置需要扫描的目录
        resolvers: [NaiveUiResolver(), VantResolver()],
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
      target: ['chrome87', 'edge88', 'firefox78', 'safari14'], // 兼容低版本浏览器
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
          // 每个依赖单独分割
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // 找到匹配的依赖包名
              const matchedDep = dependencies.find((dep) => id.includes(`node_modules/${dep}`))
              if (matchedDep) {
                // 清理包名，移除特殊字符
                return matchedDep.replace(/[@/]/g, '-')
              }
              return 'vendor'
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
      //配置跨域
      proxy: {
        '/api': {
          // “/api” 以及前置字符串会被替换为真正域名
          target: config.VITE_SERVICE_URL, // 请求域名
          changeOrigin: true, // 是否跨域
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      },
      hmr: {
        protocol: 'ws',
        host: host,
        port: 6130
      },
      cors: true, // 配置 CORS
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
