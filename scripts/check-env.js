import chalk from 'chalk'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// 用于写入 .env.development.local 配置文件
const devEnvPath = join(process.cwd(), '.env.development')
const devLocalEnvPath = join(process.cwd(), '.env.development.local')

const defaultEnvContent = `# 有道云翻译key
VITE_YOUDAO_APP_KEY=
VITE_YOUDAO_APP_SECRET=
# 腾讯云翻译key
VITE_TENCENT_API_KEY=
VITE_TENCENT_SECRET_ID=
`

try {
  if (existsSync(devLocalEnvPath)) {
    console.log(chalk.green('✅ 检测到 .env.development.local 已存在，跳过创建'))
    process.exit(0)
  }

  let content = defaultEnvContent
  if (existsSync(devEnvPath)) {
    const devContent = readFileSync(devEnvPath, 'utf8')
    content += (content.endsWith('\n') ? '' : '\n') + devContent
  }

  writeFileSync(devLocalEnvPath, content, 'utf8')
  if (existsSync(devEnvPath)) {
    console.log(chalk.green('✨ 已创建 .env.development.local'))
  } else {
    console.log(chalk.yellow('⚠️ 未找到 .env.development，仅创建默认模板的 .env.development.local'))
  }
} catch (_error) {
  console.log(chalk.red('\n❌ 处理 .env.development.local 文件失败。'))
  process.exit(1)
}
