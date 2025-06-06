import type { Ref } from 'vue'

/**
 * 右键菜单的状态管理
 * @param ContextMenuRef 右键菜单的容器
 * @param isNull 传入的容器是否为空
 */

export const useContextMenu = (ContextMenuRef: Ref, isNull?: Ref<boolean>) => {
  const showMenu = ref(false)
  const x = ref(0)
  const y = ref(0)

  // 禁止滚动的默认行为
  const preventDefault = (e: Event) => e.preventDefault()

  // 禁止选中文本的默认行为
  const preventTextSelection = (e: Event) => e.preventDefault()

  // 禁用文本选择
  const disableTextSelection = () => {
    // 清除当前选择
    window.getSelection()?.removeAllRanges()
    // 添加禁止选择事件
    document.body.classList.add('no-select')
    window.addEventListener('selectstart', preventTextSelection)
  }

  // 启用文本选择
  const enableTextSelection = () => {
    document.body.classList.remove('no-select')
    window.removeEventListener('selectstart', preventTextSelection)
  }

  /**! 解决使用n-virtual-list时，右键菜单出现还可以滚动的问题 */
  const handleVirtualListScroll = (isBan: boolean) => {
    const scrollbar_main = document.querySelector('#image-chat-main') as HTMLElement
    const scrollbar_sidebar = document.querySelector('#image-chat-sidebar') as HTMLElement

    scrollbar_main && (scrollbar_main.style.pointerEvents = isBan ? 'none' : '')
    scrollbar_sidebar && (scrollbar_sidebar.style.pointerEvents = isBan ? 'none' : '')
  }

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isNull?.value) return

    // 在显示菜单前清除选择
    disableTextSelection()

    handleVirtualListScroll(true)
    showMenu.value = true
    x.value = e.clientX
    y.value = e.clientY
    window.addEventListener('wheel', preventDefault, { passive: false }) // 禁止使用滚轮滚动页面
  }

  const closeMenu = (event: any) => {
    /** 需要判断点击如果不是.context-menu类的元素的时候，menu才会关闭 */
    if (!event.target.matches('.context-menu, .context-menu *')) {
      handleVirtualListScroll(false)
      showMenu.value = false
      enableTextSelection() // 恢复文本选择功能
    }
    window.removeEventListener('wheel', preventDefault) // 移除禁止滚轮滚动
  }

  // 监听showMenu状态变化
  watch(
    () => showMenu.value,
    (newValue) => {
      if (!newValue) {
        // 当菜单关闭时，恢复文本选择功能
        enableTextSelection()
      }
    }
  )

  onMounted(() => {
    // 添加全局样式
    if (!document.querySelector('#no-select-style')) {
      const style = document.createElement('style')
      style.id = 'no-select-style'
      style.textContent = `.no-select {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }`
      document.head.appendChild(style)
    }

    const div = ContextMenuRef.value
    //这里只监听了div的右键，如果需要监听其他元素的右键，需要在其他元素上监听
    div.addEventListener('contextmenu', handleContextMenu)
    // 这里需要监听window的右键，否则右键会触发div的右键事件，导致menu无法关闭，并且阻止默认右键菜单
    window.addEventListener(
      'contextmenu',
      (e) => {
        e.preventDefault()
        e.stopPropagation()
      },
      false
    )
    window.addEventListener('click', closeMenu, true)
    window.addEventListener('contextmenu', closeMenu, true)
  })

  onUnmounted(() => {
    const div = ContextMenuRef.value
    div?.removeEventListener('contextmenu', handleContextMenu)
    window.removeEventListener('contextmenu', preventDefault)
    window.removeEventListener('wheel', preventDefault)
    window.removeEventListener('selectstart', preventTextSelection)
    window.removeEventListener('click', closeMenu, true)
    window.removeEventListener('contextmenu', closeMenu, true)

    // 确保恢复选择功能
    enableTextSelection()

    // 移除样式
    const style = document.querySelector('#no-select-style')
    if (style) style.remove()
  })

  return {
    showMenu,
    x,
    y
  }
}
