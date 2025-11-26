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
import { setDayjsLocale } from '@/utils/ComputedTime'

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

const loadedLanguages: Locale[] = []

// Obtain language prefix
function getLangPrefix(lang: string) {
  const normalized = lang.replace('_', '-').trim()
  const parts = normalized.split('-')
  return parts[0].toLowerCase()
}

// 统一的前缀映射表，后续需要支持其他语言时只需在此添加映射
const PREFIX_LANG_MAP: Record<string, Locale> = {
  zh: 'zh-CN',
  en: 'en'
}

// 根据语言前缀映射受支持的 locale，未匹配则回退中文
const mapByPrefix = (lang: string): Locale => {
  return PREFIX_LANG_MAP[getLangPrefix(lang)] ?? 'zh-CN'
}

// AUTO 语言解析：使用映射表限定支持的前缀，其他一律回退中文
const resolveAutoLanguage = (): Locale => {
  if (typeof navigator !== 'undefined') {
    return mapByPrefix(navigator.language)
  }
  return 'zh-CN'
}

// 归一化语言值：优先显式支持的语言，其次按前缀映射，最后回退中文
const normalizeLang = (lang: string): Locale => {
  if (lang === 'AUTO') {
    return resolveAutoLanguage()
  }

  if (availableLocales.includes(lang)) {
    return lang as Locale
  }

  return mapByPrefix(lang)
}

// 应用语言到 i18n 和 html 标签
export function setI18nLanguage(lang: Locale) {
  const resolved = normalizeLang(lang)
  i18n.global.locale.value = resolved
  setDayjsLocale(resolved)
  if (typeof document !== 'undefined') {
    document.querySelector('html')?.setAttribute('lang', resolved)
  }
  return resolved
}

function findLocales(lang: string) {
  const exact = locales[lang]
  if (exact) return exact

  const prefix = getLangPrefix(lang)
  const like = availableLocales.find((lang) => getLangPrefix(lang) === prefix)
  // When “lang" does not exist, "zh-CN" as the default value.
  return locales[like ?? 'zh-CN']
}

// 加载语言包并切换语言，确保 lang 被归一化后再加载
export async function loadLanguage(lang: Locale) {
  const resolvedLang = normalizeLang(lang)
  if (i18n.global.locale.value === resolvedLang) {
    return setI18nLanguage(resolvedLang)
  }

  if (loadedLanguages.includes(resolvedLang)) {
    return setI18nLanguage(resolvedLang)
  }

  const messageParts = findLocales(resolvedLang)
  if (!messageParts) {
    console.warn(`No locale data found for: ${resolvedLang}`)
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
  i18n.global.setLocaleMessage(resolvedLang, messages)

  loadedLanguages.push(resolvedLang)

  return setI18nLanguage(resolvedLang)
}

/**
 * Ensure that pinia is initialized first.
 */
export const setupI18n = (app: App) => {
  const settingStore = useSettingStore()

  loadLanguage(settingStore.page.lang ?? 'en')
  app.use(i18n)
}
