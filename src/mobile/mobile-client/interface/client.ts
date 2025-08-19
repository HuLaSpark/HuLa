import type { IMobileClientAdapter } from './adapter'

/**
 * 移动客户端对象接口。
 *
 * - 客户端一般无需实现全部的适配器方法
 *
 * - 适用于需要统一抽象 iOS 和 Android 平台交互逻辑的场景，在业务层实现平台无感调用。
 *
 * @see IMobileClientAdapter - 完整适配器接口定义
 */
export interface IMobileClient extends Pick<IMobileClientAdapter, 'getSafeArea' | 'listenWindowResize'> {}
