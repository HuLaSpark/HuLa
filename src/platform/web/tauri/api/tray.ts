/** Browser replacement of @tauri-apps/api/tray: there is no system tray in the browser. */
export class TrayIcon {
  id: string
  constructor(id = 'web-tray') {
    this.id = id
  }
  static async new(options: { id?: string } = {}) {
    return new TrayIcon(options.id)
  }
  static async getById() {
    return null
  }
  static async removeById() {}
  async setIcon() {}
  async setMenu() {}
  async setTooltip() {}
  async setTitle() {}
  async setVisible() {}
  async setTempDirPath() {}
  async setIconAsTemplate() {}
  async setMenuOnLeftClick() {}
  async setShowMenuOnLeftClick() {}
  async close() {}
}
