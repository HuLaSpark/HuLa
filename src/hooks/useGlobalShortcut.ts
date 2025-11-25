import { invoke } from '@tauri-apps/api/core'
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { emitTo, listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { useSettingStore } from '@/stores/setting.ts'
import { isMac } from '@/utils/PlatformConstants'

// 快捷键配置接口
type ShortcutConfig = {
  /** 配置键名，用于从 store 中读取设置 */
  key: keyof NonNullable<ReturnType<typeof useSettingStore>['shortcuts']>
  /** 默认快捷键值 */
  defaultValue: string
  /** 快捷键处理函数 */
  handler: () => Promise<void>
  /** 监听的更新事件名 */
  updateEventName: string
  /** 发送注册状态的事件名 */
  registrationEventName: string
}

// 全局快捷键状态管理
const globalShortcutStates = new Map<string, string>()

// 防抖状态管理
let togglePanelTimeout: ReturnType<typeof setTimeout> | null = null
let lastToggleTime = 0
const isMacPlatform = isMac()

/**
 * 全局快捷键管理 Hook
 * 负责注册、取消注册和管理全局快捷键
 * 使用配置驱动的方式，方便扩展新快捷键
 */
export const useGlobalShortcut = () => {
  const settingStore = useSettingStore()
  // 获取平台对应的默认快捷键
  const getDefaultShortcuts = () => {
    return {
      screenshot: isMac() ? 'Cmd+Ctrl+H' : 'Ctrl+Alt+H',
      openMainPanel: isMac() ? 'Cmd+Ctrl+P' : 'Ctrl+Alt+P'
    }
  }

  /**
   * 确保capture窗口存在
   * 如果不存在则创建，如果存在则确保设置了关闭拦截
   */
  const ensureCaptureWindow = async () => {
    const captureWindow = await WebviewWindow.getByLabel('capture')

    if (captureWindow) {
      // 设置关闭拦截 - 将关闭转为隐藏
      captureWindow.onCloseRequested(async (event) => {
        event.preventDefault()
        await captureWindow.hide()
        // 触发重置事件，让Screenshot组件重新初始化
        await captureWindow.emit('capture-reset', {})
      })
      // 初始状态为隐藏
      await captureWindow.hide()
    }

    return captureWindow
  }

  /**
   * 截图处理函数
   */
  const handleScreenshot = async () => {
    try {
      const homeWindow = await WebviewWindow.getByLabel('home')
      if (!homeWindow) return

      const captureWindow = await WebviewWindow.getByLabel('capture')
      if (!captureWindow) return

      // 检查是否需要隐藏home窗口
      if (settingStore.screenshot.isConceal) {
        await homeWindow.hide()
        // 等待窗口隐藏完成
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // 设置窗口覆盖整个屏幕（包括菜单栏）
      const screenWidth = window.screen.width * window.devicePixelRatio
      const screenHeight = window.screen.height * window.devicePixelRatio

      // 依靠窗口级别设置来确保覆盖菜单栏
      await captureWindow.setSize(new LogicalSize(screenWidth, screenHeight))
      await captureWindow.setPosition(new LogicalPosition(0, 0))

      // 在 macOS 上设置窗口级别以覆盖菜单栏
      if (isMacPlatform) {
        await invoke('set_window_level_above_menubar', { windowLabel: 'capture' })
      }

      await captureWindow.show()
      await captureWindow.setFocus()
      await captureWindow.emit('capture', true)

      console.log('📷 截图窗口已启动')
    } catch (error) {
      console.error('Failed to open screenshot window:', error)
    }
  }

  /**
   * 切换主面板显示状态
   * - 如果窗口已显示，则隐藏
   * - 如果窗口隐藏或最小化，则显示并聚焦
   */
  const handleOpenMainPanel = async () => {
    const currentTime = Date.now()

    // 防抖：如果距离上次操作少于500ms，则忽略
    if (currentTime - lastToggleTime < 500) {
      return
    }

    // 清除之前的延时操作
    if (togglePanelTimeout) {
      clearTimeout(togglePanelTimeout)
      togglePanelTimeout = null
    }

    lastToggleTime = currentTime

    try {
      const homeWindow = await WebviewWindow.getByLabel('home')
      if (!homeWindow) {
        console.warn('Home window not found')
        return
      }

      // 获取当前窗口状态
      const isVisible = await homeWindow.isVisible()
      const isMinimized = await homeWindow.isMinimized()

      console.log(`快捷键触发 - 窗口状态: 可见=${isVisible}, 最小化=${isMinimized}`)

      if (isVisible && !isMinimized) {
        // 窗口当前可见且未最小化，直接隐藏
        await homeWindow.hide()
      } else {
        // 处理最小化状态
        if (isMinimized) {
          await homeWindow.unminimize()
        }

        // 显示窗口
        await homeWindow.show()

        // 延迟设置焦点，确保窗口已完全显示
        togglePanelTimeout = setTimeout(async () => {
          await homeWindow.setFocus()
        }, 50)
      }
    } catch (error) {
      console.error('Failed to toggle main panel:', error)
    }
  }

  // 快捷键配置数组 - 新增快捷键只需在此处添加配置即可
  const shortcutConfigs: ShortcutConfig[] = [
    {
      key: 'screenshot',
      defaultValue: getDefaultShortcuts().screenshot,
      handler: handleScreenshot,
      updateEventName: 'shortcut-updated',
      registrationEventName: 'shortcut-registration-updated'
    },
    {
      key: 'openMainPanel',
      defaultValue: getDefaultShortcuts().openMainPanel,
      handler: handleOpenMainPanel,
      updateEventName: 'open-main-panel-shortcut-updated',
      registrationEventName: 'open-main-panel-shortcut-registration-updated'
    }
  ]

  /**
   * 通用快捷键注册函数
   * @param config 快捷键配置
   * @param shortcut 快捷键字符串
   */
  const registerShortcut = async (config: ShortcutConfig, shortcut: string): Promise<boolean> => {
    try {
      const currentShortcut = globalShortcutStates.get(config.key)

      // 清理当前快捷键
      if (currentShortcut) {
        await unregister(currentShortcut)
        console.log(`清理快捷键 [${config.key}]: ${currentShortcut}`)
      }

      // 预防性清理目标快捷键
      if (!currentShortcut) {
        try {
          await unregister(shortcut)
          console.log(`预清理快捷键 [${config.key}]: ${shortcut}`)
        } catch (_e) {
          console.log(`快捷键 [${config.key}] 未注册: ${shortcut}`)
        }
      }

      // 注册新快捷键
      await register(shortcut, config.handler)
      globalShortcutStates.set(config.key, shortcut)
      console.log(`快捷键已注册 [${config.key}]: ${shortcut}`)
      return true
    } catch (error) {
      console.error(`注册快捷键失败 [${config.key}]:`, error)
      return false
    }
  }

  /**
   * 取消注册快捷键
   * @param shortcut 要取消注册的快捷键字符串
   */
  const unregisterShortcut = async (shortcut: string) => {
    try {
      await unregister(shortcut)
      console.log(`成功取消注册快捷键: ${shortcut}`)
    } catch (error) {
      console.error(`取消注册快捷键失败: ${shortcut}`, error)
    }
  }

  /**
   * 强制清理快捷键残留
   */
  const forceCleanupShortcuts = async (shortcuts: string[]) => {
    for (const shortcut of shortcuts) {
      try {
        await unregister(shortcut)
      } catch (_e) {
        console.log(`强制清理 ${shortcut} (可能未注册)`)
      }
    }
  }

  /**
   * 通用快捷键更新处理函数
   * @param config 快捷键配置
   * @param newShortcut 新快捷键
   */
  const handleShortcutUpdate = async (config: ShortcutConfig, newShortcut: string) => {
    const oldShortcut = globalShortcutStates.get(config.key)

    // 强制清理旧快捷键
    const shortcutsToClean = [oldShortcut, newShortcut].filter(Boolean) as string[]
    await forceCleanupShortcuts(shortcutsToClean)

    // 清除状态，准备重新注册
    globalShortcutStates.delete(config.key)

    // 尝试注册新快捷键
    console.log(`[Home] 开始注册新快捷键 [${config.key}]: ${newShortcut}`)
    const success = await registerShortcut(config, newShortcut)

    // 如果注册失败且有旧快捷键，尝试回滚
    if (!success && oldShortcut) {
      globalShortcutStates.delete(config.key)
      const rollbackSuccess = await registerShortcut(config, oldShortcut)
      console.log(`[Home] 快捷键回滚结果 [${config.key}]: ${rollbackSuccess ? '成功' : '失败'}`)
    }

    // 通知设置页面注册状态更新
    await emitTo('settings', config.registrationEventName, {
      shortcut: newShortcut,
      registered: success
    })
    console.log(`[Home] 已通知 settings 窗口快捷键状态更新 [${config.key}]: ${success ? '已注册' : '未注册'}`)
  }

  /**
   * 处理全局快捷键开关状态变化
   * @param enabled 是否启用全局快捷键
   */
  const handleGlobalShortcutToggle = async (enabled: boolean) => {
    if (enabled) {
      // 开启时重新注册所有快捷键并通知设置页面
      for (const config of shortcutConfigs) {
        const savedShortcut = settingStore.shortcuts?.[config.key] || config.defaultValue
        const success = await registerShortcut(config, savedShortcut as string)

        // 通知设置页面注册状态更新
        await emitTo('settings', config.registrationEventName, {
          shortcut: savedShortcut,
          registered: success
        })
      }
    } else {
      // 关闭时取消注册所有快捷键并通知设置页面状态为未绑定
      for (const config of shortcutConfigs) {
        const savedShortcut = settingStore.shortcuts?.[config.key] || config.defaultValue

        // 通知设置页面注册状态更新为未绑定
        await emitTo('settings', config.registrationEventName, {
          shortcut: savedShortcut,
          registered: false
        })
      }

      // 取消注册所有快捷键
      await cleanupGlobalShortcut()
    }
  }

  /**
   * 初始化全局快捷键
   * 根据配置自动注册所有快捷键并监听更新事件
   */
  const initializeGlobalShortcut = async () => {
    // 确保capture窗口存在
    await ensureCaptureWindow()

    // 检查全局快捷键是否开启，默认为关闭
    const globalEnabled = settingStore.shortcuts?.globalEnabled ?? false

    // 只有开启时才注册快捷键
    if (globalEnabled) {
      // 批量注册所有配置的快捷键
      for (const config of shortcutConfigs) {
        const savedShortcut = settingStore.shortcuts?.[config.key] || config.defaultValue
        await registerShortcut(config, savedShortcut as string)
      }
    }

    // 监听全局快捷键开关变化
    listen('global-shortcut-enabled-changed', (event) => {
      const enabled = (event.payload as any)?.enabled
      if (typeof enabled === 'boolean') {
        handleGlobalShortcutToggle(enabled)
      } else {
        console.warn(`[Home] 收到无效的全局快捷键开关事件:`, event.payload)
      }
    })

    // 监听每个快捷键的更新事件
    for (const config of shortcutConfigs) {
      listen(config.updateEventName, (event) => {
        const newShortcut = (event.payload as any)?.shortcut
        if (newShortcut) {
          // 只有全局快捷键开启时才处理更新
          const globalEnabled = settingStore.shortcuts?.globalEnabled ?? false
          if (globalEnabled) {
            handleShortcutUpdate(config, newShortcut)
          } else {
            console.log(`[Home] 全局快捷键已关闭，跳过快捷键更新 [${config.key}]`)
          }
        } else {
          console.warn(`[Home] 收到无效的快捷键更新事件 [${config.key}]:`, event.payload)
        }
      })
    }
  }

  /**
   * 清理全局快捷键
   * 取消注册所有快捷键并清理状态
   */
  const cleanupGlobalShortcut = async () => {
    // 清理防抖定时器
    if (togglePanelTimeout) {
      clearTimeout(togglePanelTimeout)
      togglePanelTimeout = null
    }

    // 取消注册所有已注册的快捷键
    for (const shortcut of globalShortcutStates.values()) {
      await unregisterShortcut(shortcut)
    }
    // 清理状态
    globalShortcutStates.clear()
  }

  return {
    // 处理函数
    handleScreenshot,
    handleOpenMainPanel,

    // 核心功能
    initializeGlobalShortcut,
    cleanupGlobalShortcut,
    ensureCaptureWindow,

    // 工具函数
    registerShortcut: (config: ShortcutConfig, shortcut: string) => registerShortcut(config, shortcut),
    unregisterShortcut,
    getDefaultShortcuts,

    // 配置信息（用于外部访问）
    shortcutConfigs
  }
}
