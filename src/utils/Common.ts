import { pkgJson } from '~/build/config/version.ts'
const { VITE_APP_NAME } = import.meta.env

/** 控制台打印版本信息 */
export const consolePrint = () => {
  console.log(
    `%c 🍀 ${VITE_APP_NAME} ${pkgJson.version}`,
    'font-size:20px;border-left: 4px solid #13987f;background: #cef9ec;font-family: Comic Sans MS, cursive;color:#581845;padding:10px;border-radius:4px;',
    `${pkgJson.author.url}`
  )
}
