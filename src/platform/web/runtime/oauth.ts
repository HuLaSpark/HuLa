/**
 * Third-party login callback. The server redirects to `<origin>/?secret=...&token=...` (or `code=`
 * for Gitee). This tab checks the one-time secret written by start_oauth_server, hands the result to
 * the login window over the event bus and closes itself.
 */
import { emitEvent } from './bus'

const OAUTH_SECRET_KEY = '__web_oauth_secret'

export function handleOauthCallback(): boolean {
  // the server appends "?token=..." to a redirect that already has "?secret=...", so read both parts
  const query = new URLSearchParams(location.search.replace(/\?/g, '&'))
  const secret = query.get('secret')
  if (!secret || (!query.get('token') && !query.get('code'))) return false
  const expected = localStorage.getItem(OAUTH_SECRET_KEY)
  const ok = !!expected && expected === secret
  if (ok) {
    localStorage.removeItem(OAUTH_SECRET_KEY)
    if (query.get('token')) {
      const payload = `token=${query.get('token')}&refreshToken=${query.get('refreshToken') || ''}&uid=${query.get('uid') || ''}`
      emitEvent('oauth-token', payload)
    } else {
      emitEvent('gitee-auth-code', query.get('code'))
    }
  }
  window.stop()
  document.documentElement.innerHTML = ok
    ? "<body style='display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif'><h1>登录成功</h1><p>您可以关闭此窗口返回应用。</p></body>"
    : '<body>invalid or missing secret</body>'
  if (ok) setTimeout(() => window.close(), 2000)
  return true
}
