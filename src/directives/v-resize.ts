const map = new WeakMap()

// 创建一个ResizeObserver实例
const ob = new ResizeObserver((entries: any[]) => {
  // 遍历所有监测到的元素
  for (const entry of entries) {
    // 获取该元素的处理器
    const handler = map.get(entry.target)
    // 如果存在处理器
    if (handler) {
      // 调用处理器函数并传入元素的宽度和高度
      handler({
        width: entry.borderBoxSize[0].inlineSize,
        height: entry.borderBoxSize[0].blockSize
      })
    }
  }
})

/**
 * 调整元素尺寸指令
 */
export default {
  mounted(el: any, binding: any) {
    //监听el元素尺寸的变化
    map.set(el, binding.value)
    ob.observe(el)
  },
  unmounted(el: any) {
    //取消监听
    ob.unobserve(el)
  }
}
