export class RegExp {
  /**
   * 使用正则来校验邮箱是否正确
   * @param email 邮箱
   */
  public static isEmail(email: string): boolean {
    // 正则表达式判断邮箱格式
    const emailRegex =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return emailRegex.test(email)
  }

  /**
   * 使用正则来校验密码的复制度
   * @param password 密码
   */
  public static isPasswordComplex(password: string): boolean {
    // 判断密码是否符合复杂度要求
    const passwordRegex = /^\S*(?=\S{6,})(?=\S*\d)(?=\S*[A-Z])(?=\S*[a-z])(?=\S*[!@#$%^&*?.])\S*$/
    return passwordRegex.test(password)
  }

  /**
   * 检验是否只包含英文或者数字
   * @param val 输入框的值
   */
  public static isEngORNub(val: string): boolean {
    // 判断是否只包含英文和数字
    const standardRegex = /^[a-zA-Z0-9]+$/
    return standardRegex.test(val)
  }

  /**
   * 判断是否包含超链接
   * @param content 文本内容
   * @returns hyperlinkRegex 正则表达式，foundHyperlinks 匹配到的超链接
   */
  public static isHyperlink(content: string) {
    const hyperlinkRegex = /(\b(?:https?:\/\/|www)[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi
    const foundHyperlinks = content.match(hyperlinkRegex)
    return { hyperlinkRegex, foundHyperlinks }
  }
}
