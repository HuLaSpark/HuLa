/**
 * WebSocket 适配器
 *
 * 这个文件提供了一个统一的接口来切换 JavaScript WebSocket Worker 和 Rust WebSocket 实现
 * 可以通过环境变量或配置来控制使用哪种实现
 */

import { info } from '@tauri-apps/plugin-log'

info('🦀 使用 Rust WebSocket 实现')
const webSocketService: any = import('./webSocketRust').then((module) => module.default)

export default webSocketService
