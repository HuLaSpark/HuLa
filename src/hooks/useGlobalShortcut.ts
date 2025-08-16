import { emitTo, listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { useTauriListener } from '@/hooks/useTauriListener'
import { useSettingStore } from '@/stores/setting.ts'

// 全局快捷键状态 - 跨实例共享
let globalCurrentShortcut = ''

/**
 * 全局快捷键管理 Hook
 * 负责注册、取消注册和管理全局快捷键
 */
export const useGlobalShortcut = () => {
  const settingStore = useSettingStore()
  const { addListener } = useTauriListener()

  /**
   * 确保capture窗口存在
   * 如果不存在则创建，如果存在则确保设置了关闭拦截
   */
  const ensureCaptureWindow = async () => {
    const captureWindow = await WebviewWindow.getByLabel('capture')

    if (captureWindow) {
      // 设置关闭拦截 - 将关闭转为隐藏
      addListener(
        captureWindow.onCloseRequested(async (event) => {
          event.preventDefault()
          await captureWindow.hide()
          // 触发重置事件，让Screenshot组件重新初始化
          await captureWindow.emit('capture-reset', {})
        }),
        'capture-close-intercept'
      )
      // 初始状态为隐藏
      await captureWindow.hide()
    }

    return captureWindow
  }

  /**
   * 截图处理函数 - 简化版本
   * capture窗口始终存在，只需显示和聚焦
   */
  const handleScreenshot = async () => {
    try {
      // 检查home窗口是否存在，只有在home窗口存在时才允许截图
      const homeWindow = await WebviewWindow.getByLabel('home')
      if (!homeWindow) {
        return
      }

      // capture窗口必须存在，直接获取
      const captureWindow = await WebviewWindow.getByLabel('capture')
      if (!captureWindow) {
        return
      }

      // 显示并聚焦窗口
      await captureWindow.show()
      await captureWindow.setFocus()

      // 触发capture事件，让Screenshot组件初始化
      await captureWindow.emit('capture', {})
      console.log('📷 截图窗口已启动')
    } catch (error) {
      console.error('Failed to open screenshot window:', error)
    }
  }

  /**
   * 注册全局快捷键
   * @param shortcut 快捷键字符串，如 'CmdOrCtrl+Alt+H'
   */
  const registerShortcut = async (shortcut: string) => {
    try {
      // 先尝试清理全局当前快捷键
      if (globalCurrentShortcut) {
        await unregister(globalCurrentShortcut)
        console.log(`🗑️ 清理全局快捷键: ${globalCurrentShortcut}`)
      }

      // 只有在初始化时（globalCurrentShortcut为空）才进行预防性清理
      // 避免在快捷键切换过程中的重复清理导致状态混乱
      if (!globalCurrentShortcut) {
        try {
          await unregister(shortcut)
          console.log(`🗑️ 初始化预清理目标快捷键: ${shortcut}`)
        } catch (_e) {
          console.log(`ℹ️ 初始化时目标快捷键未注册: ${shortcut}`)
        }
      }

      await register(shortcut, handleScreenshot)
      // 只有注册成功才更新全局状态
      globalCurrentShortcut = shortcut
      console.log(`✅ 全局快捷键已注册: ${shortcut}`)
      return true
    } catch (error) {
      console.error('❌ Failed to register global shortcut:', error)
      // 注册失败时不更新 globalCurrentShortcut
      return false
    }
  }

  /**
   * 取消注册全局快捷键
   * @param shortcut 要取消注册的快捷键字符串
   */
  const unregisterShortcut = async (shortcut: string) => {
    try {
      await unregister(shortcut)
      console.log(`✅ 成功取消注册快捷键: ${shortcut}`)
    } catch (error) {
      console.error(`❌ Failed to unregister global shortcut: ${shortcut}`, error)
    }
  }

  /**
   * 强制清理所有可能的快捷键残留
   * 用于处理状态不一致的情况
   */
  const forceCleanupShortcuts = async (shortcuts: string[]) => {
    for (const shortcut of shortcuts) {
      try {
        await unregister(shortcut)
      } catch (_e) {
        console.log(`🧹 强制清理 ${shortcut} (可能未注册):`)
      }
    }
  }

  /**
   * 处理快捷键更新事件
   * 当用户在设置页面修改快捷键时触发
   */
  const handleShortcutUpdate = async (newShortcut: string) => {
    // 保存旧快捷键用于回滚
    const oldShortcut = globalCurrentShortcut
    let success = true

    // 先进行强制清理，确保没有残留状态
    const shortcutsToClean = [oldShortcut, newShortcut].filter(Boolean)
    await forceCleanupShortcuts(shortcutsToClean)

    // 重置全局状态，准备重新注册
    globalCurrentShortcut = ''

    // 尝试注册新快捷键
    console.log(`🔧 [Home] 开始注册新快捷键: ${newShortcut}`)
    success = await registerShortcut(newShortcut)

    if (!success && oldShortcut) {
      // 重置状态后回滚到原快捷键
      globalCurrentShortcut = ''
      const rollbackSuccess = await registerShortcut(oldShortcut)
      console.log(`🔄 [Home] 回滚结果: ${rollbackSuccess ? '成功' : '失败'}`)
    }

    // 通知设置页面快捷键注册状态已更新
    // 尝试向 settings 窗口发送事件
    await emitTo('settings', 'shortcut-registration-updated', {
      shortcut: newShortcut,
      registered: success
    })
    console.log(`📡 [Home] 已通知 settings 窗口快捷键状态更新: ${success ? '已注册' : '未注册'}`)
  }

  /**
   * 初始化全局快捷键
   * 从设置中读取快捷键并注册
   */
  const initializeGlobalShortcut = async () => {
    // 首先确保capture窗口存在
    await ensureCaptureWindow()

    // 从settingStore读取快捷键设置
    const savedShortcut = settingStore.shortcuts?.screenshot || 'CmdOrCtrl+Alt+H'

    // 注册全局快捷键
    await registerShortcut(savedShortcut)

    // 监听跨窗口的快捷键更新事件
    addListener(
      listen('shortcut-updated', (event) => {
        const newShortcut = (event.payload as any)?.shortcut
        if (newShortcut) {
          console.log(`📡 [Home] 收到快捷键更新事件: ${newShortcut}`)
          console.log(`📡 [Home] 当前全局快捷键状态: ${globalCurrentShortcut}`)
          handleShortcutUpdate(newShortcut)
        } else {
          console.warn(`📡 [Home] 收到无效的快捷键更新事件:`, event.payload)
        }
      }),
      'shortcut-updated'
    )
  }

  /**
   * 清理全局快捷键
   * 取消注册快捷键并移除事件监听
   */
  const cleanupGlobalShortcut = async () => {
    // 取消注册全局快捷键
    if (globalCurrentShortcut) {
      await unregisterShortcut(globalCurrentShortcut)
    }
    // 重置状态，确保下次重新初始化时状态干净
    globalCurrentShortcut = ''
  }

  return {
    handleScreenshot,
    registerShortcut,
    unregisterShortcut,
    handleShortcutUpdate,
    initializeGlobalShortcut,
    cleanupGlobalShortcut,
    ensureCaptureWindow
  }
}
