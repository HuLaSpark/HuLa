/**
 * Browser replacement of @tauri-apps/plugin-dialog. open() uses a hidden file input and returns
 * in-memory paths; save() returns a path in the "save as" folder, and writing it downloads the file.
 */
import { log } from '../../runtime/label'
import { SAVE_DIR, storeBrowserFile } from '../../runtime/vfs'

type DialogFilter = { name: string; extensions: string[] }
type OpenOptions = { multiple?: boolean; directory?: boolean; filters?: DialogFilter[]; title?: string }

const INPUT_ID = '__web_file_input'

export async function open(options: OpenOptions = {}): Promise<any> {
  if (options.directory) return null
  const input = document.createElement('input')
  input.type = 'file'
  input.id = INPUT_ID
  input.multiple = !!options.multiple
  const exts = (options.filters || []).flatMap((f) => f.extensions || []).filter((e) => e && e !== '*')
  if (exts.length) input.accept = exts.map((e) => `.${e}`).join(',')
  input.style.display = 'none'
  document.getElementById(INPUT_ID)?.dispatchEvent(new Event('web-replaced'))
  document.body.appendChild(input)
  return new Promise((resolve) => {
    const openedAt = Date.now()
    const finish = (value: unknown) => {
      input.remove()
      resolve(value)
    }
    input.addEventListener('web-replaced', () => finish(null))
    // A headless browser cancels the chooser at once; keep the input so automation can set its files.
    input.addEventListener('cancel', () => {
      if (Date.now() - openedAt > 1000) finish(null)
    })
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || [])
      if (!files.length) return finish(null)
      const paths = await Promise.all(files.map(storeBrowserFile))
      finish(options.multiple ? paths : paths[0])
    })
    try {
      input.click()
    } catch (e) {
      log('file picker blocked', e)
    }
  })
}

export async function save(options: { defaultPath?: string } = {}): Promise<string | null> {
  const name = String(options.defaultPath || 'download')
    .split(/[\\/]/)
    .pop()
  return SAVE_DIR + name
}

export async function ask(message: string): Promise<boolean> {
  return window.confirm(message)
}

export async function confirm(message: string): Promise<boolean> {
  return window.confirm(message)
}

export async function message(text: string): Promise<string> {
  window.alert(text)
  return 'Ok'
}
