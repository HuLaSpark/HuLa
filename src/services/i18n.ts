/**
 * Each locale is split into multiple domain-based translation fragments
 * eg: (home.json, room.json, common.json...) stored in locales/{lang}/.
 * This fragmented structure improves maintainability and prevents large
 * single-file translation bundles.
 *
 * On language switch, all fragments of the selected locale are dynamically
 * imported and merged into a complete message set.
 */

import { App } from 'vue'
import { createI18n } from 'vue-i18n'
import type { Locale } from 'vue-i18n'
import { useSettingStore } from '../stores/setting'

const i18n = createI18n({
  legacy: false,
  locale: ''
})

/**
 * 在 setup 外使用，这似乎与 vue-i18n v9.x 相悖
 * 如非必要，请不要直接使用它!!!
 */
export const useI18nGlobal = () => i18n.global

// 动态导入所有 JSON 文件
type LoadLocale = () => Promise<{ default: Record<string, string> }>

const locales = Object.entries(import.meta.glob('../../locales/**/*.json'))
  .map(([path, loader]) => {
    const match = path.match(/\/locales\/([\w-]+)\/([\w-]+)\.json$/)
    if (!match) return null

    const [, locale, part] = match
    return [locale, part, loader as LoadLocale] as const
  })
  .reduce(
    (acc, item) => {
      if (!item) return acc
      const [locale, part, loader] = item
      acc[locale] ??= {}
      acc[locale][part] = loader
      return acc
    },
    {} as Record<Locale, Record<string, LoadLocale>>
  )

export const availableLocales = Object.keys(locales)

export function setI18nLanguage(lang: Locale) {
  i18n.global.locale.value = lang
  if (typeof document !== 'undefined') {
    document.querySelector('html')?.setAttribute('lang', lang)
  }
  return lang
}

const loadedLanguages: Locale[] = []

// Obtain language prefix
function getLangPrefix(lang: string) {
  const normalized = lang.replace('_', '-').trim()
  const parts = normalized.split('-')
  return parts[0].toLowerCase()
}

function findLocales(lang: string) {
  const exact = locales[lang]
  if (exact) return exact

  const prefix = getLangPrefix(lang)
  const like = availableLocales.find((lang) => getLangPrefix(lang) === prefix)
  // When “lang" does not exist, "zh-CN" as the default value.
  return locales[like ?? 'zh-CN']
}

export async function loadLanguage(lang: Locale) {
  if (i18n.global.locale.value === lang) {
    return setI18nLanguage(lang)
  }

  if (loadedLanguages.includes(lang)) {
    return setI18nLanguage(lang)
  }

  const messageParts = findLocales(lang)
  if (!messageParts) {
    console.warn(`No locale data found for: ${lang}`)
    return
  }

  // 将每个文件的 Promise 收集起来
  const tasks = Object.entries(messageParts).map(async ([key, loader]) => {
    const mod = await loader()
    return [key, mod.default]
  })

  // 等待所有 JSON 完成加载
  const modules = await Promise.all(tasks)

  // 文件结构是 { home: {...}, room: {...} }
  // 合并成一个 messages = { ...home, ...room }
  const messages = Object.fromEntries(modules)

  // 设置语言包
  i18n.global.setLocaleMessage(lang, messages)

  loadedLanguages.push(lang)

  return setI18nLanguage(lang)
}

/**
 * Ensure that pinia is initialized first.
 */
export const setupI18n = (app: App) => {
  const settingStore = useSettingStore()

  loadLanguage(settingStore.page.lang ?? 'en')
  app.use(i18n)
}
