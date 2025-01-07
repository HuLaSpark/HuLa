import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'

// 用于写入.env.local配置文件，该文件默认不会被git管理，所以不必担心会提交到远程仓库
const envPath = join(process.cwd(), '.env.local')

if (!existsSync(envPath)) {
  const defaultEnvContent = `# 有道云翻译key
VITE_YOUDAO_APP_KEY=
VITE_YOUDAO_APP_SECRET=
# 腾讯云翻译key
VITE_TENCENT_API_KEY=
VITE_TENCENT_SECRET_ID=
`

  try {
    writeFileSync(envPath, defaultEnvContent, 'utf8')
    console.log('✨ 成功创建.env.local文件')
  } catch (error) {
    console.error('❌ 创建.env.local文件失败:', error)
    process.exit(1)
  }
} else {
  console.log('✅ .env.local文件已存在')
}
