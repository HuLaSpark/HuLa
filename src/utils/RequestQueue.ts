// 高效的请求队列类
export class RequestQueue {
  private readonly maxSize: number = 100 // 队列最大容量
  private readonly maxConcurrent: number = 5 // 最大并发数
  private queue: Array<{
    resolve: (token: string) => void
    timestamp: number
    priority?: number
  }> = []
  private processing: number = 0

  enqueue(resolve: (token: string) => void, priority: number = 0): void {
    if (this.queue.length >= this.maxSize) {
      console.warn('🚫 请求队列已满，丢弃新请求')
      return
    }

    // 按优先级和时间戳排序插入
    const request = {
      resolve,
      timestamp: Date.now(),
      priority
    }

    const insertIndex = this.queue.findIndex((item) => item.priority! < priority)

    if (insertIndex === -1) {
      this.queue.push(request)
    } else {
      this.queue.splice(insertIndex, 0, request)
    }
  }

  async processQueue(token: string): Promise<void> {
    console.log(`⏳ 开始处理队列中的 ${this.queue.length} 个请求`)

    while (this.queue.length > 0 && this.processing < this.maxConcurrent) {
      this.processing++

      const request = this.queue.shift()
      if (request) {
        try {
          console.log(`🔄 处理请求 - 剩余 ${this.queue.length} 个`)
          await request.resolve(token)
        } catch (error) {
          console.error('❌ 请求处理失败:', error)
        } finally {
          this.processing--
        }
      }

      // 控制请求间隔
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  clear(): void {
    this.queue = []
    this.processing = 0
  }

  get size(): number {
    return this.queue.length
  }
}
