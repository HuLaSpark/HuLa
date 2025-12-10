import { fetch } from '@tauri-apps/plugin-http'
import { AppException } from '@/common/exception.ts'
import { getSettings } from '@/services/tauriCommand'
import type { TranslateProvider } from './types.ts'

// 入参、翻译平台
interface TranslateResult {
  text: string
  provider: string
}

interface BackendTranslateResponse {
  text: string
  provider: string
}

interface BackendTranslateSegmentsResponse {
  segments: string[]
  provider: string
}

/**
 * 普通翻译（一次性返回）
 * @param text 待翻译文本
 * @param provider 翻译提供商（默认读取后端配置，未传时为 tencent）
 */
export const translateText = async (
  text: string,
  provider: TranslateProvider = 'tencent'
): Promise<TranslateResult> => {
  if (!text?.trim()) throw new AppException('翻译文本不能为空')
  const settings = await getSettings()
  const resp = await fetch(`${settings.backend.base_url}/system/anyTenant/translate/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, provider })
  })
  const json = (await resp.json()) as { code?: number; data?: BackendTranslateResponse; msg?: string }
  if (!json || json.code !== 200 || !json.data) throw new AppException(json?.msg || '翻译失败')
  return { text: json.data.text, provider: json.data.provider }
}

/**
 * 流式翻译
 * 最终合并所有段返回完整译文
 * @param onSegment 分段到达时的回调（用于实时渲染）
 */
export const translateTextStream = async (
  text: string,
  provider: TranslateProvider = 'tencent',
  onSegment?: (seg: string) => void
): Promise<TranslateResult> => {
  if (!text?.trim()) throw new AppException('翻译文本不能为空')
  const settings = await getSettings()
  const url = `${settings.backend.base_url}/system/anyTenant/translate/stream?text=${encodeURIComponent(text)}&provider=${encodeURIComponent(provider)}`
  return new Promise<TranslateResult>((resolve, reject) => {
    let full = ''
    const es = new EventSource(url)
    es.addEventListener('segment', (ev: MessageEvent) => {
      const chunk = String(ev.data || '')
      full += chunk
      onSegment?.(chunk)
    })
    es.addEventListener('end', () => {
      es.close()
      resolve({ text: full, provider })
    })
    es.addEventListener('error', () => {
      es.close()
      reject(new AppException('流式翻译失败'))
    })
  })
}

/**
 * 段式数组翻译（写好暂时不调用）
 * @param text 待翻译文本
 * @param provider 翻译提供商（默认 tencent）
 */
export const translateTextSegments = async (
  text: string,
  provider: TranslateProvider = 'tencent'
): Promise<{ segments: string[]; provider: string }> => {
  if (!text?.trim()) throw new AppException('翻译文本不能为空')
  const settings = await getSettings()
  const resp = await fetch(`${settings.backend.base_url}/system/anyTenant/translate/segment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, provider })
  })
  const json = (await resp.json()) as { code?: number; data?: BackendTranslateSegmentsResponse; msg?: string }
  if (!json || json.code !== 200 || !json.data) throw new AppException(json?.msg || '翻译失败')
  return { segments: json.data.segments, provider: json.data.provider }
}
