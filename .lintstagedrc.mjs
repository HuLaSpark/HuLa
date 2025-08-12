import path from 'node:path'

function createCommand(prefix, join) {
  return (filenames) => `${prefix} ${filenames.map((f) => path.relative(process.cwd(), f)).join(` ${join} `)}`
}

export default {
  // JavaScript/TypeScript 文件使用 Biome (排除 .d.ts 文件)
  '*.{js,jsx,ts,tsx,json}': [
    (filenames) => {
      const filteredFiles = filenames.filter((f) => !f.includes('src-tauri/') && !f.endsWith('.d.ts'))
      return filteredFiles.length > 0
        ? `biome check --write ${filteredFiles.map((f) => path.relative(process.cwd(), f)).join(' ')}`
        : 'echo "No files to check"'
    }
  ],
  // Vue 文件：只使用 Prettier 处理（Biome 对 Vue 文件支持有限）
  '*.vue': [
    (filenames) => {
      // 分别处理每个文件，避免命令行过长
      return filenames.map((filename) => `prettier --write ${path.relative(process.cwd(), filename)}`)
    }
  ]
}
