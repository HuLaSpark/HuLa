/**
 * 全局枚举文件
 * 如果枚举值需要在全局使用，那么请在此文件中定义。其他枚举值请在对应的文件中定义。
 * 定义规则：
 *  枚举名：XxxEnum
 *  枚举值：全部大写，单词间用下划线分割
 */

/**请求响应码类型*/
export enum RCodeEnum {
  /**成功请求*/
  OK = '200',
  /**请求错误*/
  FAIL = '400',
  /**服务器出现问题*/
  SERVE_EXCEPTION = '500',
  /**业务出现问题*/
  BUSINESS_EXCEPTION = '600'
}
/**URL*/
export enum URLEnum {
  /**用户*/
  USER = '/user',
  /**文章*/
  ARTICLE = '/article'
}

/*全局状态类型*/
export enum GlobalStatusEnum {
  'default',
  'tertiary',
  'primary',
  'success',
  'info',
  'warning',
  'error'
}
