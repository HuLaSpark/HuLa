declare module 'postcss-pxtorem' {
  import type { PluginCreator } from 'postcss'

  interface Options {
    rootValue?: number
    unitPrecision?: number
    propList?: string[]
    selectorBlackList?: (string | RegExp)[]
    replace?: boolean
    mediaQuery?: boolean
    minPixelValue?: number
    exclude?: string | RegExp | ((file: string) => boolean)
  }

  const pxtorem: PluginCreator<Options>
  export default pxtorem
}

