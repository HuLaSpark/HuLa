import chalk from 'chalk'
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { platform } from 'os'
import { join } from 'path'

// 环境安装指南
const INSTALL_GUIDES = {
  'Node.js': 'https://nodejs.org/zh-cn/download/',
  pnpm: 'https://pnpm.io/zh/installation',
  Rust: 'https://www.rust-lang.org/tools/install',
  'WebView2 Runtime': 'https://developer.microsoft.com/microsoft-edge/webview2/',
  Perl: 'https://strawberryperl.com/'
}

// 更新指南
const UPDATE_GUIDES = {
  Rust: '请运行 `rustup update` 命令更新 Rust 版本'
}

// Windows 特定的检查路径（只检查默认安装路径）
const WINDOWS_PATHS = {
  'WebView2 Runtime': [
    'C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application',
    'C:\\Program Files\\Microsoft\\EdgeWebView\\Application'
  ]
}

// 默认安装路径（winget 安装的固定路径）
const PERL_DEFAULT_PATH = 'C:\\Strawberry\\perl\\bin'
const PERL_DEFAULT_EXECUTABLE = join(PERL_DEFAULT_PATH, 'perl.exe')
const REQUIRED_PERL_OS = 'MSWin32'
const REQUIRED_PERL_ARCH_KEYWORD = 'mswin32-x64-multi-thread'
const PERL_INFO_ARGS = '-MConfig -e "print join(q{|}, $Config{osname}, $Config{archname}, $Config{prefix})"'

// 错误信息映射
const ERROR_MESSAGES = {
  ENOENT: '命令未找到',
  EPERM: '权限不足',
  EACCES: '访问被拒绝'
}

const checks = [
  {
    name: 'Node.js',
    command: 'node --version',
    versionExtractor: (output) => output.replace('v', ''),
    minVersion: '^20.19.0 || >=22.12.0',
    isRequired: true
  },
  {
    name: 'pnpm',
    command: 'pnpm --version',
    versionExtractor: (output) => output.trim(),
    minVersion: '10.0.0',
    isRequired: true
  },
  {
    name: 'Rust',
    command: 'rustc --version',
    versionExtractor: (output) => output.split(' ')[1],
    minVersion: '1.88.0',
    isRequired: true
  }
]

/**
 * 检查 WebView2 是否安装
 * @returns {boolean}
 */
const checkWebView2 = () => {
  try {
    // 检查注册表
    const regQuery =
      'reg query "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv'
    execSync(regQuery, { stdio: 'ignore' })
    return true
  } catch {
    // 如果注册表查询失败，检查文件路径
    return WINDOWS_PATHS['WebView2 Runtime'].some((path) => existsSync(path))
  }
}

const quoteIfNeeded = (value) => {
  if (!value) return ''
  if (value.startsWith('"') && value.endsWith('"')) return value
  return value.includes(' ') ? `"${value}"` : value
}

/**
 * 读取当前 perl 的平台信息
 * @param {string} [executable] 指定 perl 可执行文件
 * @returns {{osname: string, archname: string, prefix: string}|null}
 */
const tryGetPerlInfo = (executable = 'perl') => {
  try {
    const command = `${quoteIfNeeded(executable)} ${PERL_INFO_ARGS}`
    const output = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    const [osname = '', archname = '', prefix = ''] = output.split('|')
    return { osname, archname, prefix }
  } catch {
    return null
  }
}

/**
 * 判断 perl 是否为原生 64 位 Windows Perl（适用于 OpenSSL 编译）
 * 支持 Strawberry Perl、ActivePerl 等原生 64 位 Windows Perl
 * @param {{osname: string, archname: string, prefix: string}|null} info
 * @returns {boolean}
 */
const isNativeWindowsPerl = (info) => {
  if (!info) return false
  const arch = info.archname?.toLowerCase() || ''
  // 核心要求：原生 64 位 Windows Perl，不能是 Cygwin/MSYS 版本
  return info.osname === REQUIRED_PERL_OS && arch.includes(REQUIRED_PERL_ARCH_KEYWORD)
}

/**
 * 检查 Perl 是否安装，优先使用用户环境中的 Perl
 * @returns {boolean}
 */
const checkPerl = () => {
  // 1. 先检查用户 PATH 中是否有原生 Windows Perl
  const info = tryGetPerlInfo()
  if (isNativeWindowsPerl(info)) {
    return true
  }

  // 2. 检查默认路径是否存在 Strawberry Perl
  if (existsSync(PERL_DEFAULT_EXECUTABLE)) {
    const fallbackInfo = tryGetPerlInfo(PERL_DEFAULT_EXECUTABLE)
    if (isNativeWindowsPerl(fallbackInfo)) {
      return true
    }
  }

  return false
}

/**
 * 安装 Strawberry Perl（使用 winget）
 * @returns {Promise<boolean>}
 */
const installStrawberryPerl = async () => {
  try {
    console.log(chalk.blue('  正在使用 winget 安装 Strawberry Perl...'))
    execSync(
      'winget install --id StrawberryPerl.StrawberryPerl --accept-source-agreements --accept-package-agreements',
      {
        stdio: 'inherit'
      }
    )

    console.log(chalk.green('  ✅ Strawberry Perl 安装成功！'))
    console.log(chalk.gray('  💡 .cargo/config.toml 已预配置 PERL 路径，无需额外配置'))
    return true
  } catch (error) {
    console.log(chalk.red(`  ❌ Perl 安装失败: ${error.message}`))
    console.log(chalk.gray(`  请手动安装: ${INSTALL_GUIDES.Perl}`))
    return false
  }
}

// Windows 特定的检查
const windowsChecks = [
  {
    name: 'WebView2 Runtime',
    checkInstalled: checkWebView2,
    isRequired: true
  },
  {
    name: 'Perl',
    checkInstalled: checkPerl,
    installer: installStrawberryPerl,
    isRequired: true,
    description: 'OpenSSL 编译依赖'
  }
]

/**
 * 获取友好的错误提示
 * @param {Error} error 错误对象
 * @returns {string} 错误提示
 */
const getFriendlyErrorMessage = (error) => {
  const code = error.code || ''
  return ERROR_MESSAGES[code] || error.message || '未知错误'
}

/**
 * 比较版本号
 * @param {string} version1 当前版本
 * @param {string} version2 所需版本
 * @returns {number} 1: version1 大, -1: version2 大, 0: 相等
 */
const compareVersions = (version1, version2) => {
  const v1 = version1.replace(/[^0-9.]/g, '').split('.')
  const v2 = version2.replace(/[^0-9.]/g, '').split('.')

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = parseInt(v1[i] || '0', 10)
    const num2 = parseInt(v2[i] || '0', 10)
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

/**
 * 检查版本是否满足 ^ 范围（主版本相同，次版本和补丁版本可以更高）
 * @param {string} version 当前版本
 * @param {string} requiredVersion 要求的版本
 * @returns {boolean}
 */
const satisfiesCaretRange = (version, requiredVersion) => {
  const [vMajor, vMinor, vPatch] = version.split('.').map(Number)
  const [rMajor, rMinor, rPatch] = requiredVersion.split('.').map(Number)

  // 主版本必须相同
  if (vMajor !== rMajor) return false

  // 次版本和补丁版本需要 >= 要求的版本
  if (vMinor > rMinor) return true
  if (vMinor < rMinor) return false
  return vPatch >= rPatch
}

/**
 * 检查版本是否满足版本范围要求（支持 ||、^、>= 语法）
 * @param {string} version 当前版本
 * @param {string} range 版本范围（如 '^20.19.0 || >=22.12.0'）
 * @returns {boolean}
 */
const satisfiesVersionRange = (version, range) => {
  // 处理 || 分隔的多个条件
  const conditions = range.split('||').map((s) => s.trim())

  // 只要满足任一条件即可
  return conditions.some((condition) => {
    if (condition.startsWith('^')) {
      // 处理 ^ 语法：主版本相同，次版本和补丁版本可以更高
      const requiredVersion = condition.slice(1).trim()
      return satisfiesCaretRange(version, requiredVersion)
    } else if (condition.startsWith('>=')) {
      // 处理 >= 语法
      const requiredVersion = condition.slice(2).trim()
      return compareVersions(version, requiredVersion) >= 0
    }
    // 默认使用 >= 比较
    return compareVersions(version, condition) >= 0
  })
}

function checkDependency(check) {
  try {
    const output = execSync(check.command).toString().trim()
    const version = check.versionExtractor(output)

    // 判断版本是否有效
    let isVersionValid
    if (check.minVersion.includes('||') || check.minVersion.startsWith('^')) {
      // 如果包含 || 或 ^，使用新的版本范围判断逻辑
      isVersionValid = satisfiesVersionRange(version, check.minVersion)
    } else {
      // 否则使用简单的版本比较
      isVersionValid = compareVersions(version, check.minVersion) >= 0
    }

    if (isVersionValid) {
      console.log(chalk.green(`✅ ${check.name} 版本 ${output} 已安装\n`))
      return true
    } else {
      console.log(chalk.yellow(`⚠️ ${check.name} 版本过低`))
      console.log(chalk.yellow(`  当前版本: ${output}`))
      console.log(chalk.yellow(`  需要版本: ${check.minVersion}`))

      // 对 Rust 进行特殊处理，提示使用 rustup update
      if (check.name === 'Rust') {
        console.log(chalk.yellow(`  ${UPDATE_GUIDES[check.name]}`))
      }

      console.log(chalk.gray(`  👉 升级指南: ${INSTALL_GUIDES[check.name]}`))
      return false
    }
  } catch (error) {
    const errorMessage = getFriendlyErrorMessage(error)
    console.log(chalk.red(`❌ ${check.name} 未安装`))
    console.log(chalk.red(`  原因: ${errorMessage}`))
    console.log(chalk.gray(`  👉 安装指南: ${INSTALL_GUIDES[check.name]}`))
    return false
  }
}

/**
 * 检查 Windows 特定的依赖
 * @param {Object} check 检查项
 * @returns {Promise<boolean>} 是否通过检查
 */
async function checkWindowsDependency(check) {
  try {
    const isInstalled = check.checkInstalled()
    if (isInstalled) {
      const desc = check.description ? ` (${check.description})` : ''
      console.log(chalk.green(`✅ ${check.name} 已安装${desc}`))
      return true
    } else {
      const desc = check.description ? ` (${check.description})` : ''
      console.log(chalk.yellow(`⚠️ ${check.name} 未安装${desc}`))

      // 如果有自动安装器，尝试自动安装
      if (check.installer) {
        console.log(chalk.blue(`  正在尝试自动安装 ${check.name}...`))
        const installSuccess = await check.installer()
        if (installSuccess) {
          // 安装后再次检查
          if (check.checkInstalled()) {
            console.log(chalk.green(`✅ ${check.name} 安装成功并已配置`))
            return true
          }
          // 即使检查失败，可能需要重启终端
          console.log(chalk.yellow(`  ⚠️ ${check.name} 已安装，但可能需要重启终端才能生效`))
          return true
        }
      }

      if (check.isRequired) {
        console.log(chalk.red(`❌ ${check.name} 是必需的依赖`))
        console.log(chalk.gray(`  👉 安装指南: ${INSTALL_GUIDES[check.name]}`))
        return false
      } else {
        console.log(chalk.yellow(`  跳过可选依赖 ${check.name}`))
        return true
      }
    }
  } catch (error) {
    const errorMessage = getFriendlyErrorMessage(error)
    console.log(chalk.red(`❌ ${check.name} 检查失败`))
    console.log(chalk.red(`  原因: ${errorMessage}`))
    return !check.isRequired
  }
}

async function main() {
  const isWindows = platform() === 'win32'

  // 执行基本检查
  const results = checks.map(checkDependency)

  // 在 Windows 上执行额外检查
  if (isWindows) {
    console.log(chalk.blue(`\n[HuLa ${new Date().toLocaleTimeString()}] 正在检查 Windows 开发环境...\n`))
    for (const check of windowsChecks) {
      const result = await checkWindowsDependency(check)
      results.push(result)
    }
  }

  if (results.every(Boolean)) {
    console.log(chalk.green('\n✅ 所有环境检查通过！'))
    process.exit(0)
  } else {
    console.log(chalk.red('\n❌ 环境依赖检查失败，请按照上述提示安装或更新依赖。'))
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(chalk.red('检查过程中发生错误：'))
  console.error(chalk.yellow(error.stack || error))
  process.exit(1)
})
