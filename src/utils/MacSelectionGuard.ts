import { isMac } from '@/utils/PlatformConstants'

type MacSelectionGuardOptions = {
  lockSelector?: string
}

export const createMacContextSelectionGuard = (options: MacSelectionGuardOptions = {}) => {
  const lockSelector = options.lockSelector ?? ''
  let hasSelectionBeforeContext = false

  const recordSelectionBeforeContext = (event: MouseEvent) => {
    if (!isMac() || event.button !== 2) return

    const selection = window.getSelection()
    hasSelectionBeforeContext = !!selection && !selection.isCollapsed && !!selection.toString()
  }

  const handleContextMenuSelection = (event: Event) => {
    if (!isMac()) return

    const selection = window.getSelection()

    if (hasSelectionBeforeContext && selection && !selection.isCollapsed && selection.toString()) {
      hasSelectionBeforeContext = false
      return
    }
    hasSelectionBeforeContext = false

    const target = event.target as HTMLElement | null
    const lockTarget =
      (lockSelector ? (target?.closest(lockSelector) as HTMLElement | null) : null) ?? (target as HTMLElement | null)
    if (!lockTarget) return

    selection?.removeAllRanges()
    lockTarget.classList.add('select-none')
    requestAnimationFrame(() => {
      lockTarget.classList.remove('select-none')
    })
  }

  return {
    recordSelectionBeforeContext,
    handleContextMenuSelection
  }
}
