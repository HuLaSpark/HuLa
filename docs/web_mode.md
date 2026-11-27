# 浏览器版（Web 模式）

同一份前端源码可以在普通浏览器中运行，同时保持桌面端（Tauri）构建不变。

## 原理

- `vite --mode web` 时，`build/config/webAlias.ts` 把所有 `@tauri-apps/*` 与 `tauri-plugin-mic-recorder-api` 精确别名到 `src/platform/web/tauri/` 下的浏览器实现；桌面模式不加载任何别名，产物与原来一致。
- Rust 命令（`invoke`）在 `src/platform/web/commands/` 中实现：HTTP 请求、WebSocket、会话/消息查询、上传、AI 流式输出等直接访问服务端，返回与 Rust 命令相同的数据结构。
- `src/platform/web/commands/imUrls.ts` 由 `node scripts/gen-web-im-urls.mjs` 从 `src-tauri/src/im_request_client.rs` 生成，修改 Rust 中的接口地址后需要重新生成。
- 多窗口用浏览器标签页实现：登录页与主页在当前标签页中切换，其余窗口（设置、聊天记录等）在以窗口 label 命名的新标签页打开；窗口间事件通过 BroadcastChannel 传递，WebSocket 只由主页标签页持有。
- 文件读写使用内存中的虚拟文件系统：选择/拖入的文件可直接上传，"另存为"会触发浏览器下载，刷新页面后缓存文件清空。
- 业务代码中需要区分运行环境时使用 `import { isWeb } from '@/utils/runtime'`，该常量在构建时确定，另一端的分支会被移除。
- web 模式下若引入了没有浏览器实现的 Tauri 模块，构建会直接报错，需在 `build/config/webAlias.ts` 中补充。

## 使用

```bash
pnpm dev:web       # 开发服务器，默认 http://127.0.0.1:6131
pnpm build:web     # 打包到 dist-web
pnpm preview:web   # 预览 dist-web
```

后端地址在 `.env.web` 中配置（可用 `.env.web.local` 覆盖）：

| 变量 | 说明 |
| :--- | :--- |
| `VITE_WEB_API_BASE` | 浏览器请求的同源路径，默认 `/api` |
| `WEB_API_TARGET` | 开发/预览服务器把 `/api` 代理到的后端地址，默认 `http://127.0.0.1:18760` |
| `WEB_API_STRIP_PREFIX` | 是否去掉 `/api` 前缀再转发。HuLa-Server 网关为 `true`；服务端自身以 `/api` 开头时设为 `false` |
| `WEB_PORT` | 开发/预览端口，默认 6131（桌面端开发占用 6130，可同时运行；web 模式使用独立的依赖缓存 `node_modules/.vite-web`，两者互不干扰） |

生产部署时把 `dist-web` 交给 Nginx 等静态服务器，并把 `/api`（含 WebSocket 升级）反向代理到网关。

## 与桌面端的差异

- 没有托盘、全局快捷键、开机自启、截图、自动更新、嵌入式网页；窗口的最小化/最大化/置顶按钮不显示。
- 第三方登录回调回到当前站点（`?secret=...`），需要服务端允许该回调地址。
- 七牛分片上传依赖 Rust，浏览器版请使用 MinIO 存储。
- 读取剪贴板图片不可用（Ctrl+V 粘贴图片不受影响）。
- 自动化测试时可设置 `localStorage.__web_fake_media = '1'`，用生成的音视频代替摄像头和麦克风。
