/** Browser replacement of @tauri-apps/plugin-notification on the Notification API. */
type Options = string | { title: string; body?: string; icon?: string }

export async function isPermissionGranted(): Promise<boolean> {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

export async function requestPermission(): Promise<NotificationPermission> {
  return typeof Notification === 'undefined' ? 'denied' : Notification.requestPermission()
}

export function sendNotification(options: Options): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const opts = typeof options === 'string' ? { title: options } : options
  new Notification(opts.title, { body: opts.body, icon: opts.icon })
}
