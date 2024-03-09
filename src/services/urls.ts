import { URLEnum } from '@/enums'

const { PROD, VITE_SERVICE_URL } = import.meta.env
// 本地配置到 .env.dev 里面修改。生产配置在 .env.prod 里面
const prefix = PROD ? VITE_SERVICE_URL : ''

export default {
  login: `${prefix + URLEnum.USER}/login`,
  logout: `${prefix + URLEnum.USER}/logout`,
  articlePage: `${prefix + URLEnum.ARTICLE}/page`
}
