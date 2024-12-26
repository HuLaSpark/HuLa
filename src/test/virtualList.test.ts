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
  })
})
