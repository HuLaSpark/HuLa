/**
 * 用于处理头像相关操作的实用类
 */
export class AvatarUtils {
  private static readonly DEFAULT_AVATAR_RANGE = {
    start: '001',
    end: '021'
  }

  private static readonly RANGE_START = parseInt(AvatarUtils.DEFAULT_AVATAR_RANGE.start, 10)
  private static readonly RANGE_END = parseInt(AvatarUtils.DEFAULT_AVATAR_RANGE.end, 10)

  /**
   * 检查头像字符串是否为默认头像 (001-021)
   * @param avatar - 要检查的头像字符串
   * @returns 布尔值指示是否是默认头像
   */
  public static isDefaultAvatar(avatar: string): boolean {
    // 快速判断：如果为空或长度不是3，直接返回false
    if (!avatar || avatar.length !== 3) return false

    // 检查是否全是数字
    const num = parseInt(avatar, 10)
    if (isNaN(num)) return false

    // 数字范围检查 (001-021)
    return num >= this.RANGE_START && num <= this.RANGE_END
  }

  /**
   * 根据头像值获取头像URL
   * @param avatar - 头像字符串或URL
   * @returns 头像字符串或URL
   */
  public static getAvatarUrl(avatar: string): string {
    if (this.isDefaultAvatar(avatar)) {
      return `/avatar/${avatar}.png`
    }
    return avatar
  }
}
