// 跨标签页处理
const channel = new BroadcastChannel('cross-tab-msg')
/**
 * 发送消息
 * @param type 类型
 * @param content 内容
 * 如果是代理对象需要进行展开{ ...obj }
 */
export const sendMsg = (type: any, content: any) => {
  channel.postMessage({ type, content })
}

/**
 * 监听消息
 * @param callback 回调函数
 */
export const listenMsg = (callback: any) => {
  channel.addEventListener('message', (event) => {
    callback && callback(event.data)
  })
}
