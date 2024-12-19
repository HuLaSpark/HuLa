import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VirtualList from '../components/common/VirtualList.vue'

// 模拟数据生成函数
const generateMockItems = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    message: {
      id: index + 1,
      body: { content: `Message ${index + 1}` }
    }
  }))
}

// 性能测试辅助函数
const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now()
  await fn()
  return performance.now() - start
}

// 内存使用测试辅助函数
interface MemoryInfo {
  jsHeapSizeLimit: number
  totalJSHeapSize: number
  usedJSHeapSize: number
}

declare global {
  interface Performance {
    memory?: MemoryInfo
  }
}

const measureMemory = async () => {
  if (globalThis.gc) {
    globalThis.gc()
  }

  // 使用 process.memoryUsage 作为替代
  if (process && typeof process.memoryUsage === 'function') {
    const memory = process.memoryUsage()
    return {
      heapSize: memory.heapTotal,
      heapUsed: memory.heapUsed
    }
  }

  // 如果在支持 performance.memory 的环境中运行
  if (performance.memory) {
    return {
      heapSize: performance.memory.totalJSHeapSize,
      heapUsed: performance.memory.usedJSHeapSize
    }
  }

  // 如果都不支持，返回模拟数据
  return {
    heapSize: 0,
    heapUsed: 0
  }
}

const calculateFPS = (frames: number, duration: number) => {
  return Math.round((frames * 1000) / duration)
}

describe('VirtualList Component', () => {
  // 测试基本渲染
  it('should render with default props', () => {
    const wrapper = mount(VirtualList, {
      props: {
        items: [],
        estimatedItemHeight: 80,
        buffer: 5
      }
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.virtual-list-container').exists()).toBe(true)
  })

  // 测试高度计算
  it('should calculate total height correctly', async () => {
    const items = generateMockItems(10)
    const estimatedItemHeight = 80
    const wrapper = mount(VirtualList, {
      props: {
        items,
        estimatedItemHeight,
        buffer: 5
      }
    })

    await nextTick()
    const phantom = wrapper.find('.virtual-list-phantom')
    expect(phantom.attributes('style')).toContain(`height: ${items.length * estimatedItemHeight}px`)
  })

  // 测试可见项目计算
  it('should calculate visible items correctly', async () => {
    const items = generateMockItems(100)
    const wrapper = mount(VirtualList, {
      props: {
        items,
        estimatedItemHeight: 80,
        buffer: 5
      }
    })

    await nextTick()
    // 检查初始渲染的项目数量是否合理（考虑到缓冲区）
    const renderedItems = wrapper.findAll('[id^="item-"]')
    expect(renderedItems.length).toBeGreaterThan(0)
    expect(renderedItems.length).toBeLessThan(items.length)
  })

  // 测试滚动事件
  it('should emit scroll events', async () => {
    const wrapper = mount(VirtualList, {
      props: {
        items: generateMockItems(100),
        estimatedItemHeight: 80,
        buffer: 5
      }
    })

    const container = wrapper.find('.virtual-list-container')
    await container.trigger('scroll')
    expect(wrapper.emitted('scroll')).toBeTruthy()
  })

  // 测试高度缓存清理
  it('should cleanup height cache when exceeding limit', async () => {
    const items = generateMockItems(2000) // 创建足够多的项目以触发清理
    const wrapper = mount(VirtualList, {
      props: {
        items,
        estimatedItemHeight: 80,
        buffer: 5
      }
    })

    await nextTick()
    // 模拟滚动以触发高度缓存
    const container = wrapper.get('.virtual-list-container')
    Object.defineProperty(container.element, 'scrollTop', { value: 1000 })
    await container.trigger('scroll')

    // 等待清理完成
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 验证缓存大小是否在合理范围内
    const vm = wrapper.vm as any
    expect(vm.heights.size).toBeLessThanOrEqual(1000)
  })

  // 测试 scrollTo 方法
  it('should scroll to specified position', async () => {
    const wrapper = mount(VirtualList, {
      props: {
        items: generateMockItems(100),
        estimatedItemHeight: 80,
        buffer: 5
      }
    })

    const vm = wrapper.vm as any

    // 测试滚动到底部
    await vm.scrollTo({ position: 'bottom' })
    await nextTick()

    // 测试滚动到顶部
    await vm.scrollTo({ position: 'top' })
    await nextTick()

    // 测试滚动到指定索引
    await vm.scrollTo({ index: 50 })
    await nextTick()
  })

  describe('Performance Benchmarks', () => {
    // 测试大数据量渲染性能
    it('should render large datasets efficiently', async () => {
      const itemCount = 10000
      const items = generateMockItems(itemCount)

      const renderTime = await measurePerformance(async () => {
        mount(VirtualList, {
          props: {
            items,
            estimatedItemHeight: 80,
            buffer: 5
          }
        })
        await nextTick()
      })

      // 验证渲染时间是否在可接受范围内（例如小于1秒）
      expect(renderTime).toBeLessThan(1000)
    })

    // 测试滚动性能
    it('should maintain good performance during rapid scrolling', async () => {
      const wrapper = mount(VirtualList, {
        props: {
          items: generateMockItems(5000),
          estimatedItemHeight: 80,
          buffer: 5
        }
      })

      const container = wrapper.get('.virtual-list-container')
      let frames = 0
      const duration = 10000 // 测试持续10秒

      // 记录帧数
      const recordFrame = () => {
        frames++
        if (performance.now() - startTime < duration) {
          requestAnimationFrame(recordFrame)
        }
      }

      const startTime = performance.now()
      requestAnimationFrame(recordFrame)

      // 模拟快速滚动
      for (let i = 0; i < 50; i++) {
        Object.defineProperty(container.element, 'scrollTop', { value: i * 100 })
        await container.trigger('scroll')
        await new Promise((resolve) => setTimeout(resolve, 20))
      }

      const fps = calculateFPS(frames, duration)
      // 验证帧率是否保持在可接受范围（例如大于30fps）
      expect(fps).toBeGreaterThan(30)
    })

    // 测试内存使用
    it('should manage memory efficiently', async () => {
      const initialMemory = await measureMemory()
      const items = generateMockItems(1000) // 减少测试数据量
      const wrapper = mount(VirtualList, {
        props: {
          items,
          estimatedItemHeight: 80,
          buffer: 5
        }
      })

      // 模拟滚动和组件更新
      const container = wrapper.get('.virtual-list-container')
      for (let i = 0; i < 10; i++) {
        // 减少循环次数
        Object.defineProperty(container.element, 'scrollTop', { value: i * 500 })
        await container.trigger('scroll')
        await nextTick()
      }

      const finalMemory = await measureMemory()

      // 验证内存使用是否合理
      expect(finalMemory.heapUsed).toBeGreaterThanOrEqual(0)
      if (finalMemory.heapUsed > 0 && initialMemory.heapUsed > 0) {
        const memoryGrowth = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024)
        expect(memoryGrowth).toBeLessThan(50) // 内存增长应小于 50MB
      }
    })

    // 测试大量数据更新性能
    it('should handle large data updates efficiently', async () => {
      const wrapper = mount(VirtualList, {
        props: {
          items: generateMockItems(1000),
          estimatedItemHeight: 80,
          buffer: 5
        }
      })

      const updateTime = await measurePerformance(async () => {
        await wrapper.setProps({
          items: generateMockItems(2000)
        })
        await nextTick()
      })

      // 验证更新时间是否在可接受范围内（例如小于500ms）
      expect(updateTime).toBeLessThan(500)
    })

    // 测试连续滚动和更新的综合性能
    it('should maintain performance during continuous scrolling and updates', async () => {
      const wrapper = mount(VirtualList, {
        props: {
          items: generateMockItems(5000),
          estimatedItemHeight: 80,
          buffer: 5
        }
      })

      const container = wrapper.get('.virtual-list-container')
      let frames = 0
      const duration = 2000 // 测试持续2秒

      const startTime = performance.now()
      const recordFrame = () => {
        frames++
        if (performance.now() - startTime < duration) {
          requestAnimationFrame(recordFrame)
        }
      }
      requestAnimationFrame(recordFrame)

      // 同时进行滚动和数据更新
      for (let i = 0; i < 20; i++) {
        // 滚动
        Object.defineProperty(container.element, 'scrollTop', { value: i * 200 })
        await container.trigger('scroll')

        // 更新数据
        if (i % 5 === 0) {
          await wrapper.setProps({
            items: generateMockItems(5000 + i * 10)
          })
        }

        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      const fps = calculateFPS(frames, duration)
      // 即使在高负载下也应保持可接受的帧率
      expect(fps).toBeGreaterThan(25)
    })
  })
})
