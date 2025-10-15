/** 检查字符串是否包含特殊字符 */
export const validateSpecialChar = (value: string, patten = /[!@#¥$%.&*^()_+=\-~]/) => patten.test(value)

/** 检查字符是否包含英文和数字 */
export const validateAlphaNumeric = (value: string) => {
  const hasLetter = /[a-zA-Z]/.test(value)
  const hasNumber = /[0-9]/.test(value)
  return hasLetter && hasNumber
}
