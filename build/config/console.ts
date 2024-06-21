import pkg from '../../package.json'

/**
 * 启动时打印信息
 * @param env 环境变量
 * @param mode 运行模式
 */
export const atStartup = (env: { [key: string]: string }, mode: string) => {
  return () => {
    if (mode === 'dev') {
      console.log(
        `  🍀 ${'\x1b[32m'}${'\x1b[38;2;19;152;127m'}${env.VITE_APP_NAME} ${'\x1b[0m'}${'\x1b[90m'}${pkg.version}${'\x1b[0m'}`
      )
      console.log(
        `  ${'\u001b[38;2;26;178;146m'}${'\x1b[1m'}${'➜'}${'\x1b[0m'}  ` +
          `${'当前环境: '}` +
          `${'\x1b[38;2;215;95;135m'}${mode}${'\x1b[0m'}`
      )
      console.log(
        `  ${'\u001b[38;2;26;178;146m'}${'\x1b[1m'}${'➜'}${'\x1b[0m'}  ${'\x1b[38;2;0;215;175m'}${'\x1b[1m'}${'Vue'}${'\x1b[0m'}: ` +
          `${'\x1b[90m'}${pkg.dependencies.vue}${'\x1b[0m'}` +
          ` ${'\x1b[38;2;95;215;255m'}${'\x1b[1m'}${'Vite'}${'\x1b[0m'}: ` +
          `${'\x1b[90m'}${pkg.devDependencies.vite}${'\x1b[0m'}` +
          ` ${'\u001b[38;5;33m'}${'\x1b[1m'}${'Node.js'}${'\x1b[0m'}: ` +
          `${'\x1b[90m'}${process.version}${'\x1b[0m'}`
      )
      console.log(
        `  ${'\u001b[38;2;26;178;146m'}${'\x1b[1m'}${'➜'}${'\x1b[0m'}  ` +
          `当前 ${'\x1b[38;2;215;135;0m'}${'\x1b[1m'}Tauri${'\x1b[0m'} 版本: `,
        `${'\x1b[90m'}${pkg.dependencies['@tauri-apps/api']}${'\x1b[0m'}`
      )
      console.log(
        `  ${'\u001b[38;2;26;178;146m'}${'\x1b[1m'}${'\u001b[2m'}${'➜'}${'\x1b[0m'}  ` +
          '后端服务地址: ' +
          `${'\x1b[38;2;95;175;255m'}https://github.com/nongyehong/HuLa-IM-Server${'\x1b[0m'}`
      )
      console.log(
        `  ${'\u001b[38;2;26;178;146m'}${'\x1b[1m'}${'\u001b[2m'}${'➜'}${'\x1b[0m'}  ` +
          '项目地址: ' +
          `${pkg.author.url}`
      )
    }
  }
}
