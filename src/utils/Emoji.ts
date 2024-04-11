import { animalEmojis, expressionEmojis, gestureEmojis } from '@/components/rightBox/emoji/material.ts'

/**
 *
 * @param inputs 参数一个或多个字符串
 * @returns 返回二维数组
 */
const splitEmoji = (...inputs: string[]) => {
  const emojiRegex: RegExp = /\p{Emoji}/u
  const emojiArrays: string[][] = []

  inputs.forEach((input) => {
    const emojiArray: string[] = []
    for (const char of input) {
      if (emojiRegex.test(char)) {
        emojiArray.push(char)
      }
    }
    emojiArrays.push(emojiArray)
  })

  return [...new Set(emojiArrays)]
}

/**
 * 获取所有表情类型及其对应的表情数组
 */
const getAllTypeEmojis = () => {
  const emojiArr = splitEmoji(expressionEmojis, animalEmojis, gestureEmojis)

  return {
    expressionEmojis: { name: '小黄脸表情', value: emojiArr[0] },
    animalEmojis: { name: '动物表情', value: emojiArr[1] },
    gestureEmojis: { name: '手势表情', value: emojiArr[2] }
  }
}
export { getAllTypeEmojis }
