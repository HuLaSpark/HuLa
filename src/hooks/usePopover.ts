import { Ref } from 'vue'

/**! 这个是暂时用来解决在n-scrollbar中使用n-virtual-list使用n-popover时候滚动出现原生滚动条的方法 */
export const usePopover = (selectKey: Ref<string>, id: string) => {
  /**! 暂时使用这些方法来阻止popover显示时候的滚动行为 */
  // 禁止滚动的默认行为
  const preventDefault = (e: Event) => e.preventDefault()

  // 恢复滚动行为
  const enableScroll = () => {
    const scrollbar = document.querySelector(`#${id}`) as HTMLElement
    if (!scrollbar) return
    scrollbar.style.pointerEvents = ''
    window.removeEventListener('wheel', preventDefault)
  }

  const close = (event: any) => {
    if (!event.target.matches('.n-popover, .n-popover *')) {
      enableScroll()
    }
  }

  const handlePopoverUpdate = (key: string, show?: boolean) => {
    const scrollbar = document.querySelector(`#${id}`) as HTMLElement
    if (!scrollbar) return

    if (selectKey.value === key) {
      if (show) {
        // popover 显示时禁止滚动
        scrollbar.style.pointerEvents = 'none'
        window.addEventListener('wheel', preventDefault, { passive: false })
      } else {
        // popover 关闭时恢复滚动
        enableScroll()
      }
      return true
    }
  }

  onMounted(() => {
    window.addEventListener('click', close, true)
  })

  onUnmounted(() => {
    window.removeEventListener('click', close, true)
    enableScroll() // 确保组件卸载时恢复滚动
  })

  return {
    handlePopoverUpdate,
    enableScroll
  }
}
