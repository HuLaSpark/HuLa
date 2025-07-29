import path from 'node:path'

function createCommand(prefix, join) {
  return (filenames) => `${prefix} ${filenames.map((f) => path.relative(process.cwd(), f)).join(` ${join} `)}`
}

export default {
  // JavaScript/TypeScript 文件使用 Biome
  '*.{js,jsx,ts,tsx,json}': [
    (filenames) => {
      const filteredFiles = filenames.filter(f => !f.includes('src-tauri/'))
      return filteredFiles.length > 0 ? `biome check --write ${filteredFiles.map(f => path.relative(process.cwd(), f)).join(' ')}` : 'echo "No files to check"'
    },
  ],
  // Vue 文件：Biome 处理 script，Prettier 处理 template
  '*.vue': [
    createCommand('biome check --write', ''), // 处理 <script> 部分
    createCommand('prettier --write', ''), // 处理 <template> 部分
  ]
}
