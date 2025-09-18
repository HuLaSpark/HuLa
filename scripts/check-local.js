import chalk from 'chalk'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// 用于检查和创建 src-tauri/configuration/local.yaml 配置文件
const configDir = join(process.cwd(), 'src-tauri', 'configuration')
const localConfigPath = join(configDir, 'local.yaml')
const productionConfigPath = join(configDir, 'production.yaml')

try {
  if (existsSync(localConfigPath)) {
    console.log(chalk.green('✅ 检测到 local.yaml 已存在，跳过创建'))
    process.exit(0)
  }

  let content = ''

  // 优先使用 production.yaml 作为模板，因为它包含更完整的配置
  if (existsSync(productionConfigPath)) {
    content = readFileSync(productionConfigPath, 'utf8')
    console.log(chalk.blue('📋 使用 production.yaml 作为模板'))
  } else {
    console.log(chalk.red('❌ 未找到任何配置文件模板'))
    process.exit(1)
  }

  writeFileSync(localConfigPath, content, 'utf8')
  console.log(chalk.green('✨ 已创建 local.yaml 配置文件'))
} catch (error) {
  console.log(chalk.red('\n❌ 处理 local.yaml 文件失败：'), error.message)
  process.exit(1)
}
