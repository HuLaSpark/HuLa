/**
 * WebSocket 适配器
 *
 * 这个文件提供了一个统一的接口来切换 JavaScript WebSocket Worker 和 Rust WebSocket 实现
 * 可以通过环境变量或配置来控制使用哪种实现
 */

import { info } from '@tauri-apps/plugin-log'
import { type } from '@tauri-apps/plugin-os'

// 根据平台和环境变量决定使用哪种实现
const USE_RUST_WEBSOCKET =
  // 生产环境默认使用 Rust 实现
  import.meta.env.PROD ||
  // 或者通过环境变量强制启用
  import.meta.env.VITE_USE_RUST_WEBSOCKET === 'true' ||
  // 移动端强制使用 Rust 实现（性能更好）
  ['android', 'ios'].includes(type())

let webSocketService: any

if (USE_RUST_WEBSOCKET) {
  // 使用 Rust WebSocket 实现
  info('🦀 使用 Rust WebSocket 实现')
  webSocketService = import('./webSocketRust').then((module) => module.default)
} else {
  // 使用原始的 JavaScript Worker 实现
  info('🌐 使用 JavaScript WebSocket Worker 实现')
  webSocketService = import('./webSocket').then((module) => module.default)
}

export default webSocketService
