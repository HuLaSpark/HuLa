import { animalEmojis, expressionEmojis, gestureEmojis } from '@/components/rightBox/emoticon/material'
import { useI18nGlobal } from '@/services/i18n'

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
  const { t } = useI18nGlobal()

  return {
    expressionEmojis: { name: t('emoticon.categories.expression'), value: emojiArr[0] },
    animalEmojis: { name: t('emoticon.categories.animal'), value: emojiArr[1] },
    gestureEmojis: { name: t('emoticon.categories.gesture'), value: emojiArr[2] }
  }
}
export { getAllTypeEmojis }
