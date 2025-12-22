/**
 * 给一个不是'/'开头的字符串的头部添加一个'/'
 * @param originPath
 */
export const addSlashToHead = (originPath: string) => {
  return originPath.startsWith('/') ? originPath : '/' + originPath
}
