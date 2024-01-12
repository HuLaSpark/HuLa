export class Common {
  /**
   * 去除两边空格
   * @param value 待处理字符串
   */
  public static noSideSpace(value: string): boolean {
    return !value.startsWith(' ') && !value.endsWith(' ')
  }
}
