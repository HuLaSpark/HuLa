/** Browser replacement of @tauri-apps/plugin-shell: open() opens links in a new tab. */
export async function open(path: string): Promise<void> {
  window.open(path, '_blank', 'noopener')
}

export class Command {
  static create(): Command {
    return new Command()
  }
  async execute(): Promise<never> {
    throw 'shell commands are not available in the browser'
  }
  async spawn(): Promise<never> {
    throw 'shell commands are not available in the browser'
  }
}
