import { styleText } from 'node:util'

const createStyle = (format) => (text) => styleText(format, String(text))

export const chalk = {
  blue: createStyle('blue'),
  cyan: createStyle('cyan'),
  gray: createStyle('gray'),
  green: createStyle('green'),
  red: createStyle('red'),
  yellow: createStyle('yellow')
}
