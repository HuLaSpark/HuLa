/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** 后端项目地址 */
  readonly VITE_SERVICE_URL: string
  /** websocket 地址 */
  readonly VITE_WEBSOCKET_URL: string
  /** 项目名称 */
  readonly VITE_APP_NAME: string
  /** 项目标题 */
  readonly VITE_APP_TITLE: string
  /** 页面标题后缀*/
  readonly VITE_TITLE_SUFFIX: string
  /** 项目ICP备案号 */
  readonly VITE_APP_ICP: string
  /** 项目描述 */
  readonly VITE_APP_DESC: string
  /** 后端服务的环境类型 */
  readonly VITE_SERVICE_ENV?: ServiceEnvType
  /**
   * 权限路由模式:
   * - static - 前端声明的静态
   * - dynamic - 后端返回的动态
   */
  readonly VITE_AUTH_ROUTE_MODE: 'static' | 'dynamic'
  /** 路由首页的路径 */
  readonly VITE_ROUTE_HOME_PATH: AuthRoute.RoutePath
  /** iconify图标作为组件的前缀 */
  readonly VITE_ICON_PREFIX: string
  /**
   * 本地SVG图标作为组件的前缀, 请注意一定要包含 VITE_ICON_PREFIX
   * - 格式 {VITE_ICON_PREFIX}-{本地图标集合名称}
   * - 例如：icon-local
   */
  readonly VITE_ICON_LOCAL_PREFIX: string
  /** 开启请求代理 */
  readonly VITE_HTTP_PROXY?: 'Y' | 'N'
  /** 是否开启打包文件大小结果分析 */
  readonly VITE_VISUALIZER?: 'Y' | 'N'
  /** 是否开启打包压缩 */
  readonly VITE_COMPRESS?: 'Y' | 'N'
  /** 压缩算法类型 */
  readonly VITE_COMPRESS_TYPE?: 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw'
  /** 是否应用pwa */
  readonly VITE_PWA?: 'Y' | 'N'
  /**
   * 是否开启生产模式下的mock
   * @description 生产模式下会拦截XHR，导致无法获取response，不使用mock请求时设置为N
   */
  readonly VITE_PROD_MOCK?: 'Y' | 'N'
  /** hash路由模式 */
  readonly VITE_HASH_ROUTE?: 'Y' | 'N'
  /** 是否应用自动生成路由的插件 */
  readonly VITE_SOYBEAN_ROUTE_PLUGIN?: 'Y' | 'N'
  /** 是否是部署的vercel */
  readonly VITE_VERCEL?: 'Y' | 'N'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import { defineComponent } from 'vue'
  const Component: ReturnType<typeof defineComponent>
  export default component
}
/**使用 window.$message 来调用 Message 组件的方法。由于 TypeScript 编译器无法识别全局变量 $message 的类型，
我们可以使用 if (window.$message) 来进行判断，避免出现类型错误。*/
declare interface Window {
  $message: ReturnType<typeof useMessage>
  $notification: ReturnType<typeof useNotification>
  $loadingBar: ReturnType<typeof useLoadingBar>
  $dialog: ReturnType<typeof useDialog>
}
