import path from 'node:path'

function createCommand(prefix, join) {
  return (filenames) => `${prefix} ${filenames.map((f) => path.relative(process.cwd(), f)).join(` ${join} `)}`
}

export default {
  '*.{js,jsx,ts,tsx,vue}': [
    'oxlint src',
    createCommand('pnpm eslint --fix', ''),
    createCommand('prettier --write', '--write'),
    // () => 'pnpm test:run',
    () => 'vue-tsc --noEmit'
  ]
}
