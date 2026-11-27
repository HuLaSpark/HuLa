/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** 后端项目地址 */
  readonly VITE_SERVICE_URL: string
  /** 客户端项目地址 */
  readonly VITE_PC_URL: string
  /** 项目名称 */
  readonly VITE_APP_NAME: string
  /** giteeToken */
  readonly VITE_GITEE_TOKEN: string
  /** 运行环境：浏览器版为 'web'，桌面端未设置 */
  readonly VITE_RUNTIME?: 'web'
  /** 浏览器版 API 路径或完整地址，默认 /api */
  readonly VITE_WEB_API_BASE?: string
  /** 浏览器版 WebSocket 地址，默认由 VITE_WEB_API_BASE 推出 /ws/ws */
  readonly VITE_WEB_WS_URL?: string
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
  $modal: ReturnType<typeof useModal>
}
