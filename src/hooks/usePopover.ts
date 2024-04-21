import { Ref } from 'vue'

/**! 这个是暂时用来解决在n-scrollbar中使用n-virtual-list使用n-popover时候滚动出现原生滚动条的方法 */
export const usePopover = (selectKey: Ref<number>, id: string) => {
  /**! 暂时使用这些方法来阻止popover显示时候的滚动行为 */
  // 禁止滚动的默认行为
  const preventDefault = (e: Event) => e.preventDefault()
  const close = (event: any) => {
    if (!event.target.matches('.n-popover, .n-popover *')) {
      const scrollbar = document.querySelector(`#${id}`) as HTMLElement
      if (!scrollbar) return
      scrollbar.style.pointerEvents = ''
      window.removeEventListener('wheel', preventDefault) // 移除禁止滚轮滚动
    }
  }

  const handlePopoverUpdate = (key: number) => {
    const scrollbar = document.querySelector(`#${id}`) as HTMLElement
    if (!scrollbar) return
    if (selectKey.value === key) {
      // 禁止 n-scrollbar 滚动
      scrollbar.style.pointerEvents = 'none'
      window.addEventListener('wheel', preventDefault, { passive: false }) // 禁止使用滚轮滚动页面
      return true
    }
  }

  onMounted(() => {
    window.addEventListener('click', close, true)
  })

  onUnmounted(() => {
    window.removeEventListener('click', close, true)
  })
  /**! end */

  return {
    handlePopoverUpdate
  }
}
