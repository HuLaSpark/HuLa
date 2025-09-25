/** 聊天相关常量定义 */
import { isDesktop } from '../utils/PlatformConstants'

/** 底部选项栏高度 */
export const FOOTER_HEIGHT = isDesktop() ? 260 : 98
/** 底部选项栏最大高度 */
export const MAX_FOOTER_HEIGHT = 390
/** 底部选项栏最小高度 */
export const MIN_FOOTER_HEIGHT = 200
/** 顶部选项栏高度 */
export const TOOLBAR_HEIGHT = 40
