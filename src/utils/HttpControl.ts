/**
 * <p>
 * 请求控制器
 * TODO 无法确定在未来Web版本如何实现请求，故而不能保证正常在Web中使用。
 * </p>
 *
 * @version: v1.0
 * @author: Clover You
 * @create: 2025-04-30 02:04
 */
import { tryOnBeforeUnmount } from '@vueuse/core'

// See https://github.com/tauri-apps/plugins-workspace/blob/406e6f484cdc13d35c50fb949f7489ca9eeccc44/plugins/http/guest-js/index.ts#L89
const ERROR_REQUEST_CANCELLED = 'Request canceled'

/**
 * 用于管理可取消的异步HTTP请求
 *
 * 特性：
 * 1. 自动处理Vue组件卸载时的请求取消
 * 2. 提供统一的取消错误识别方法
 * 3. 支持链式请求自动取消前序未完成请求
 *
 * @template T 请求参数类型元组，默认为空数组
 *
 * 示例：
 * ```ts
 * const request = new HttpControl((signal, userId: string) => fetch(userId, signal))
 *
 * const loading = ref(false)
 *
 * try {
 *   const resp = await request.fetch('hi@clovu.me)
 *   loading.value = false
 * } catch(err: unknown) {
 *   // 这里应该要这般处理，否则 loading 逻辑会冲突. 一定不要在 finally 中处理
 *   if (HttpControl.isCancel(err) && request.isAborted()) {
 *     loading.value = false
 *   }
 * }
 * ```
 */
export class HttpControl<T extends unknown[] = [], R = Promise<void>> {
  #controller: AbortController | null = null

  constructor(private readonly task: (signal: AbortController, ...args: T) => R) {
    // Check if in Vue Instance
    tryOnBeforeUnmount(() => {
      // 这里应该是安全的, 取消请求
      this.abort()
    })
  }

  /**
   * 取消当前请求，如果有的话
   */
  abort() {
    const controller = this.#controller
    if (controller) {
      controller.abort()
      this.#controller = null
    }
  }

  /**
   * 检查当前控制器中的请求是否已被取消
   */
  isAborted() {
    return Boolean(this.#controller?.signal.aborted)
  }

  /**
   * 检查是否是请求取消的错误
   */
  public static isCancel(suspect: unknown) {
    if (suspect instanceof AbortError) return true
    if (suspect instanceof Error) return suspect.name === 'AbortError' || suspect.message === ERROR_REQUEST_CANCELLED
    if (typeof suspect === 'string' && suspect === ERROR_REQUEST_CANCELLED) return true
    return false
  }

  /**
   * 创建一个新的 AbortController，如果已有请求，则取消之前的请求
   */
  #initializeController() {
    if (!this.isAborted()) this.abort()
    this.#controller = new AbortController()
  }

  /**
   * 发起新的请求
   * @param args 传递给任务函数的参数
   *
   * 说明：
   * 1. 每次调用都会自动取消前序未完成请求
   * 2. 返回的Promise在取消时会抛出标准错误信息
   * 3. 使用HttpControl.isCancel()识别取消错误
   */
  fetch(...args: T) {
    this.#initializeController()
    const result = this.task(this.#controller!, ...args)

    // Ensure this is a Promise
    if (result instanceof Promise)
      result.catch((err) => {
        if (HttpControl.isCancel(err)) return Promise.reject(new AbortError())
        return Promise.reject(err)
      })

    return result
  }
}

export class AbortError extends Error {
  name: string = 'AbortError'
  constructor() {
    super(ERROR_REQUEST_CANCELLED)
  }
}
