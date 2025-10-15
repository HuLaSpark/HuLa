import path from 'node:path'

function createCommand(prefix, join) {
  return (filenames) => `${prefix} ${filenames.map((f) => path.relative(process.cwd(), f)).join(` ${join} `)}`
}

export default {
  // JavaScript/TypeScript 文件使用 Biome (排除 .d.ts 文件和tauri-plugin-hula目录)
  '*.{js,jsx,ts,tsx,json}': [
    (filenames) => {
      const filteredFiles = filenames.filter((f) =>
        !f.includes('src-tauri/') &&
        !f.includes('tauri-plugin-hula/') &&
        !f.includes('public/') &&
        !f.endsWith('.d.ts')
      )
      return filteredFiles.length > 0
        ? `biome check --write --unsafe ${filteredFiles.map((f) => path.relative(process.cwd(), f)).join(' ')}`
        : 'echo "No files to check"'
    }
  ],
  // Vue 文件：使用 Biome 检查和修复，然后用 Prettier 格式化
  '*.vue': [
    createCommand('biome check --write --unsafe', ''),
    createCommand('prettier --write', '')
  ]
}
