// 在 Web Worker 中接收消息
self.onmessage = (event) => {
  const number = event.data

  // 执行一些耗时的操作
  const result = calculateSquare(number)

  // 将结果发送回主线程
  self.postMessage(result)
}

// 一些耗时的操作
const calculateSquare = (number: any) => {
  return number * number
}
