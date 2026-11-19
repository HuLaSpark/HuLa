/** Browser replacement of @tauri-apps/api/webviewWindow */
import { LABEL } from '../../runtime/label'
import { windowExists } from '../../runtime/windows'
import { createWindow, getAllLabels, WebWindow, windowFor } from './window'

export class WebviewWindow extends WebWindow {
  constructor(label: string, options: { url?: string; [key: string]: unknown } = {}) {
    super(label)
    createWindow(this, options)
  }
  static getCurrent(): WebviewWindow {
    return windowFor(LABEL) as WebviewWindow
  }
  static async getAll(): Promise<WebviewWindow[]> {
    return getAllLabels().map((label) => windowFor(label) as WebviewWindow)
  }
  static async getByLabel(label: string): Promise<WebviewWindow | null> {
    return windowExists(label) ? (windowFor(label) as WebviewWindow) : null
  }
}

export function getCurrentWebviewWindow(): WebviewWindow {
  return WebviewWindow.getCurrent()
}

export async function getAllWebviewWindows(): Promise<WebviewWindow[]> {
  return WebviewWindow.getAll()
}
