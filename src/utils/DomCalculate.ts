import { nextTick, Ref } from 'vue'
import { ComponentPublicInstance } from 'vue'

/**
 * 计算DOM元素的位置信息
 *
 * 使用场景: 键盘弹出时重新计算可视区域/底部安全区域适配/悬浮按钮位置校准/组件高度修正等
 *
 * @template T - 目标元素的类型，可以是HTMLElement或Vue组件实例
 * @param {Ref<HTMLElement | ComponentPublicInstance | null | undefined>} target - 目标元素的引用，可以是Vue组件ref或DOM元素ref
 * @returns {Promise<DOMRect | null>} 返回一个Promise，解析为目标元素的DOMRect对象（包含位置和尺寸信息），如果目标不存在则返回null
 *
 * @example
 * <template>
 *   <MyComponent ref="componentRef" />
 * </template>
 * ...
 * import MyComponent from '@/components/MyComponent.vue'
 * // 使用Vue组件ref
 * const componentRef = ref<InstanceType<typeof MyComponent>>()
 * const rect = await calculateElementPosition(componentRef)
 * if (rect) {
 *   console.log('组件位置:', rect)
 *   store.updatePosition(rect)
 * }
 *
 * @example
 * // 使用DOM元素ref
 * <template>
 *   <div ref="divRef"></div>
 * </template>
 * ...
 * const divRef = ref<HTMLDivElement | null>(null)
 * calculateElementPosition(divRef).then(rect => {
 *   if (rect) {
 *     console.log('元素宽度:', rect.width)
 *   }
 * })
 */
export const calculateElementPosition = async (
  target: Ref<HTMLElement | ComponentPublicInstance | null | undefined>
): Promise<DOMRect | null> => {
  try {
    await nextTick()
    if (!target.value) {
      return null
    }
    const element =
      '$el' in target.value
        ? target.value.$el // Vue组件实例
        : target.value // 原生DOM元素
    if (element?.getBoundingClientRect) {
      const rect = element.getBoundingClientRect()
      return rect
    } else {
      return null
    }
  } catch (error) {
    console.error('计算元素位置失败:', error)
    return null
  }
}
