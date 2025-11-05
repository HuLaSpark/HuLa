#!/usr/bin/env node

import { select } from '@inquirer/prompts'
import { spawn } from 'child_process'
import os from 'os'

// 检测当前平台
function getCurrentPlatform() {
  const platform = os.platform()
  switch (platform) {
    case 'darwin':
      return { platform: 'macos', name: 'macOS' }
    case 'win32':
      return { platform: 'windows', name: 'Windows' }
    case 'linux':
      return { platform: 'linux', name: 'Linux' }
    default:
      return { platform: 'unknown', name: '未知平台' }
  }
}

// 获取平台选择选项
function getPlatformOptions() {
  const currentPlatform = getCurrentPlatform()

  // 根据当前操作系统定义支持的平台
  const supportedPlatforms = {
    macos: ['macos', 'ios', 'android'], // macOS 可以打包 macOS、iOS、Android
    windows: ['windows', 'android'], // Windows 可以打包 Windows、Android
    linux: ['linux', 'android'] // Linux 可以打包 Linux、Android
  }

  const allPlatforms = [
    {
      name: `MacOS${currentPlatform.platform === 'macos' ? ' (当前平台)' : ''}`,
      value: 'macos',
      description: '打包 macOS 应用',
      isCurrent: currentPlatform.platform === 'macos'
    },
    {
      name: `Windows${currentPlatform.platform === 'windows' ? ' (当前平台)' : ''}`,
      value: 'windows',
      description: '打包 Windows 应用',
      isCurrent: currentPlatform.platform === 'windows'
    },
    {
      name: `Linux${currentPlatform.platform === 'linux' ? ' (当前平台)' : ''}`,
      value: 'linux',
      description: '打包 Linux 应用',
      isCurrent: currentPlatform.platform === 'linux'
    },
    {
      name: 'Android',
      value: 'android',
      description: '打包 Android APK',
      isCurrent: false
    },
    {
      name: 'IOS',
      value: 'ios',
      description: '打包 IOS 应用',
      isCurrent: false
    },
    {
      name: '取消',
      value: 'cancel',
      description: '退出打包',
      isCurrent: false
    }
  ]

  // 获取当前系统支持的平台列表
  const supported = supportedPlatforms[currentPlatform.platform] || []

  // 过滤出支持的平台，保留取消选项
  const platforms = allPlatforms.filter((platform) => supported.includes(platform.value) || platform.value === 'cancel')

  // 将当前平台排在第一位
  return platforms.sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1
    if (!a.isCurrent && b.isCurrent) return 1
    return 0
  })
}

// 获取包格式选项
function getBundleOptions(platform) {
  switch (platform) {
    case 'macos':
      return [
        {
          name: '📦  dmg 磁盘映像',
          value: 'dmg',
          description: '生成 .dmg 安装包 (推荐)',
          command: 'tauri build --bundles dmg'
        },
        {
          name: '📁  app 应用包',
          value: 'app',
          description: '生成 .app 应用包',
          command: 'tauri build --bundles app'
        },
        {
          name: '📦  全部格式',
          value: 'all',
          description: '生成所有支持的格式 (.app, .dmg)',
          command: 'tauri build'
        },
        {
          name: '🔙  返回上一步',
          value: 'back',
          description: '返回平台选择',
          command: null
        }
      ]

    case 'windows':
      return [
        {
          name: '📦  msi 安装包',
          value: 'msi',
          description: '生成 .msi 安装包 (推荐)',
          command: 'tauri build --bundles msi'
        },
        {
          name: '📦  nsis 安装程序',
          value: 'nsis',
          description: '生成 NSIS 安装程序',
          command: 'tauri build --bundles nsis'
        },
        {
          name: '📦  全部格式',
          value: 'all',
          description: '生成所有支持的格式',
          command: 'tauri build'
        },
        {
          name: '🔙  返回上一步',
          value: 'back',
          description: '返回平台选择',
          command: null
        }
      ]

    case 'linux':
      return [
        {
          name: '📦  deb 软件包',
          value: 'deb',
          description: '生成 .deb 软件包 (Ubuntu/Debian)',
          command: 'tauri build --bundles deb'
        },
        {
          name: '📁  AppImage',
          value: 'appimage',
          description: '生成 .AppImage 便携应用',
          command: 'tauri build --bundles appimage'
        },
        {
          name: '📦  rpm 软件包',
          value: 'rpm',
          description: '生成 .rpm 软件包 (RedHat/CentOS)',
          command: 'tauri build --bundles rpm'
        },
        {
          name: '📦  全部格式',
          value: 'all',
          description: '生成所有支持的格式',
          command: 'tauri build'
        },
        {
          name: '🔙  返回上一步',
          value: 'back',
          description: '返回平台选择',
          command: null
        }
      ]

    case 'android':
      return [
        {
          name: '📱  apk 安装包',
          value: 'apk',
          description: '生成 Android APK 安装包',
          command: 'tauri android build'
        },
        {
          name: '🔙  返回上一步',
          value: 'back',
          description: '返回平台选择',
          command: null
        }
      ]

    case 'ios':
      return [
        {
          name: '📱  IOS 应用',
          value: 'ios',
          description: '生成 IOS 应用包',
          command: 'tauri ios build --export-method app-store-connect'
        },
        {
          name: '🔙  返回上一步',
          value: 'back',
          description: '返回平台选择',
          command: null
        }
      ]

    default:
      return []
  }
}

// 获取调试模式选项
function getDebugOptions() {
  return [
    {
      name: '🚀  正式版本',
      value: 'release',
      description: '生成正式版本',
      isDebug: false
    },
    {
      name: '🔧  调试版本',
      value: 'debug',
      description: '生成调试版本 (可弹出控制台)',
      isDebug: true
    },
    {
      name: '🔙  返回上一步',
      value: 'back',
      description: '返回包格式选择',
      isDebug: null
    }
  ]
}

// 执行打包命令
async function executeBuild(command, isDebug = false) {
  // 如果是调试模式，添加 --debug 参数
  const finalCommand = isDebug ? `${command} --debug` : command
  const [cmd, ...args] = finalCommand.split(' ')

  const child = spawn(cmd, args, {
    stdio: 'inherit', // 直接继承父进程的 stdio，保留颜色输出
    shell: true
  })

  return new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0) {
        console.log('\n🎉 打包完成')
        resolve(code)
      } else {
        console.log(`\n❌ 打包失败，退出代码: ${code}`)
        resolve(code)
      }
    })

    child.on('error', (error) => {
      console.error(`\n❌ 执行错误: ${error.message}`)
      reject(error)
    })
  })
}

// 选择平台的函数
async function selectPlatform() {
  const platformOptions = getPlatformOptions()

  const selectedPlatform = await select({
    message: '请选择要打包的平台:',
    choices: platformOptions.map((option) => ({
      name: option.name,
      value: option.value,
      description: `\x1b[90m${option.description}\x1b[0m`
    })),
    pageSize: 8,
    loop: false
  })

  if (selectedPlatform === 'cancel') {
    console.log('\n👋 已取消打包')
    process.exit(0)
  }

  return { selectedPlatform, platformOptions }
}

// 选择调试模式的函数
async function selectDebugMode() {
  const debugOptions = getDebugOptions()

  const selectedDebug = await select({
    message: '第三步：请选择版本类型:',
    choices: debugOptions.map((option) => ({
      name: option.name,
      value: option.value,
      description: `\x1b[90m${option.description}\x1b[0m`
    })),
    pageSize: 4,
    loop: false
  })

  if (selectedDebug === 'back') {
    return 'back'
  }

  const selectedOption = debugOptions.find((option) => option.value === selectedDebug)
  return selectedOption.isDebug
}

// 选择包格式的函数
async function selectBundle(selectedPlatform) {
  const bundleOptions = getBundleOptions(selectedPlatform)

  if (bundleOptions.length === 0) {
    console.log('\n❌ 该平台暂不支持')
    return 'back' // 返回平台选择
  }

  const selectedBundle = await select({
    message: `请选择${selectedPlatform}的打包格式:`,
    choices: bundleOptions.map((option) => ({
      name: option.name,
      value: option.value,
      description: `\x1b[90m${option.description}\x1b[0m`
    })),
    pageSize: 6,
    loop: false
  })

  if (selectedBundle === 'back') {
    return 'back' // 返回上一步
  }

  // 找到选中的选项
  const selectedOption = bundleOptions.find((option) => option.value === selectedBundle)

  if (!selectedOption || !selectedOption.command) {
    console.log('\n👋 已取消打包操作')
    process.exit(0)
  }

  return selectedOption
}

async function main() {
  try {
    // 主循环
    while (true) {
      // 第一步：选择平台
      const { selectedPlatform } = await selectPlatform()

      // 第二步:选择包格式
      while (true) {
        const bundleResult = await selectBundle(selectedPlatform)

        // 如果返回 'back'，返回平台选择
        if (bundleResult === 'back') {
          break
        }

        // 移动端平台（iOS 和 Android）直接打包正式版本，不需要选择调试模式
        const isMobilePlatform = selectedPlatform === 'ios' || selectedPlatform === 'android'

        if (isMobilePlatform) {
          const exitCode = await executeBuild(bundleResult.command, false)
          process.exit(exitCode)
        } else {
          // 桌面端平台需要选择调试模式
          // 第三步：选择调试模式
          while (true) {
            const debugResult = await selectDebugMode()

            // 如果返回 'back'，返回包格式选择
            if (debugResult === 'back') {
              break
            }

            const exitCode = await executeBuild(bundleResult.command, debugResult)
            process.exit(exitCode)
          }
        }
      }
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      // 用户按了 Ctrl+C
      console.log('\n👋 已取消操作')
      process.exit(0)
    } else {
      console.error('发生错误:', error)
      process.exit(1)
    }
  }
}

main()
