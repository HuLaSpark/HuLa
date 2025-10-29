import type { Metric } from 'web-vitals'
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

type WebVitalMetric =
  | (Metric & { type: 'web-vital' })
  | {
      type: 'longtask'
      name: string
      startTime: number
      duration: number
      attribution?: Record<string, unknown>
    }

type Reporter = (metric: WebVitalMetric) => void

const defaultReporter: Reporter = (metric) => {
  const label = metric.type === 'web-vital' ? metric.name : 'longtask'
  console.info('[performance]', label, metric)
}

let hasStarted = false

export const startWebVitalObserver = (reporter: Reporter = defaultReporter) => {
  if (hasStarted || typeof window === 'undefined') return
  hasStarted = true

  const report = (metric: Metric) => {
    reporter({
      ...metric,
      type: 'web-vital'
    })
  }

  onCLS(report, { reportAllChanges: true })
  onFCP(report)
  onINP(report, { reportAllChanges: true })
  onLCP(report, { reportAllChanges: true })
  onTTFB(report)

  if (
    'PerformanceObserver' in window &&
    Array.isArray((PerformanceObserver as any).supportedEntryTypes) &&
    (PerformanceObserver as any).supportedEntryTypes.includes('longtask')
  ) {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        reporter({
          type: 'longtask',
          name: entry.name || 'longtask',
          startTime: entry.startTime,
          duration: entry.duration,
          attribution: (entry as any).attribution
        })
      }
    })

    try {
      observer.observe({ type: 'longtask', buffered: true })
    } catch (error) {
      console.warn('[performance] longtask observer failed:', error)
    }
  }
}
