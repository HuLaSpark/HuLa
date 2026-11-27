/**
 * Browser replacement of @tauri-apps/api/webview. Embedded child webviews do not exist in the
 * browser: creating one reports tauri://error so callers fall back to opening the URL.
 */
import { LABEL } from '../../runtime/label'
import { windowExists } from '../../runtime/windows'
import { WebWindow, windowFor } from './window'

export class Webview extends WebWindow {
  constructor(...args: [window: unknown, label: string, options?: unknown]) {
    super(args[1])
    setTimeout(() => this.emitLocal('tauri://error', 'embedded webviews are not available in the browser'), 0)
  }
  static getCurrent(): Webview {
    return windowFor(LABEL) as Webview
  }
  static async getAll(): Promise<Webview[]> {
    return [Webview.getCurrent()]
  }
  static async getByLabel(label: string): Promise<Webview | null> {
    return windowExists(label) ? (windowFor(label) as Webview) : null
  }
}

export function getCurrentWebview(): Webview {
  return Webview.getCurrent()
}

export async function getAllWebviews(): Promise<Webview[]> {
  return Webview.getAll()
}
