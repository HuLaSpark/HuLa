import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth, request } from '../commands/http'
import { IM_URLS } from '../commands/imUrls'
import { convertFileSrc, invoke } from '../tauri/api/core'
import { emit, emitTo, listen } from '../tauri/api/event'
import { join } from '../tauri/api/path'
import { getCurrentWebviewWindow, WebviewWindow } from '../tauri/api/webviewWindow'
import { create, exists, readDir, readFile, stat, writeFile } from '../tauri/plugin/fs'

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

describe('http layer (same rules as the Rust ImRequestClient)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    auth.set({ token: 't1', refreshToken: 'r1', uid: '1' })
  })

  it('refreshes the token on 406 and retries', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ code: 406, msg: 'expired' }))
      .mockResolvedValueOnce(json({ code: 200, data: { token: 't2', refreshToken: 'r2' } }))
      .mockResolvedValueOnce(json({ code: 200, data: { ok: true } }))
    await expect(request('GET', 'im/user/info')).resolves.toEqual({ ok: true })
    expect(auth.get()).toMatchObject({ token: 't2', refreshToken: 'r2', uid: '1' })
    expect(String(fetchMock.mock.calls[1][0])).toContain(IM_URLS.refreshToken[1])
    expect((fetchMock.mock.calls[2][1]?.headers as Record<string, string>).token).toBe('t2')
  })

  it('rejects with the Rust error text on 401 and on business errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ code: 401, msg: 'no' }))
    await expect(request('GET', 'im/user/info')).rejects.toBe('请重新登录')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ code: 500, msg: '用户不存在' }))
    await expect(request('GET', 'im/user/info')).rejects.toBe('用户不存在')
  })

  it('maps ImUrlEnum names through im_request_command, GET params in the query', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ code: 200, data: [1] }))
    await expect(
      invoke('im_request_command', { url: 'getContactList', body: null, params: { a: 1 } })
    ).resolves.toEqual([1])
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/\/api\/im\/chat\/contact\/list\?a=1$/)
    expect(init?.method).toBe('GET')
    expect(init?.body).toBeUndefined()
  })

  it('rejects unknown commands with a string', async () => {
    await expect(invoke('no_such_command')).rejects.toBe('command no_such_command is not available in the browser')
  })
})

describe('events', () => {
  it('delivers emit and emitTo for this window, not emitTo for other windows', async () => {
    const seen: string[] = []
    const label = getCurrentWebviewWindow().label
    const unlisten = await listen<string>('probe', (e) => seen.push(e.payload))
    await emit('probe', 'global')
    await emitTo(label, 'probe', 'mine')
    await emitTo(`${label}-other`, 'probe', 'other')
    unlisten()
    await emit('probe', 'after-unlisten')
    expect(seen).toEqual(['global', 'mine'])
  })

  it('window-bound listeners receive events of their own window only', async () => {
    const seen: unknown[] = []
    await getCurrentWebviewWindow().listen('bound', (e) => seen.push(e.payload))
    await emit('bound', 1)
    expect(seen).toEqual([1])
  })
})

describe('windows', () => {
  it('opens a tab named after the label and reports tauri://created', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const win = new WebviewWindow('settings', { url: '/settings' })
    const created = await new Promise((resolve) => win.once('tauri://created', () => resolve(true)))
    expect(created).toBe(true)
    expect(open).toHaveBeenCalledWith('/settings', 'settings')
    // native-only calls are accepted and do nothing
    await expect((win as any).setSize({ width: 1, height: 1 })).resolves.toBeNull()
    await expect(WebviewWindow.getByLabel('does-not-exist')).resolves.toBeNull()
  })

  it('reports tauri://error when the window already exists', async () => {
    const label = getCurrentWebviewWindow().label
    const win = new WebviewWindow(label)
    await expect(new Promise((resolve) => win.once('tauri://error', () => resolve(true)))).resolves.toBe(true)
  })
})

describe('file system', () => {
  it('stores files in memory under any base directory', async () => {
    const path = await join('/web/app', 'cache', 'a.txt')
    await writeFile(path, new TextEncoder().encode('hello'))
    expect(await exists(path)).toBe(true)
    // the same file through its relative form
    expect(new TextDecoder().decode(await readFile('cache/a.txt'))).toBe('hello')
    expect((await stat(path)).size).toBe(5)
    expect(await readDir('/web/app/cache')).toEqual([
      { name: 'a.txt', isDirectory: false, isFile: true, isSymlink: false }
    ])
    expect(await exists('cache/missing.txt')).toBe(false)
  })

  it('file handles accept ArrayBuffer and Uint8Array writes', async () => {
    const handle = await create('cache/img/c.bin')
    await handle.write(new Uint8Array([1, 2]).buffer)
    await handle.write(new Uint8Array([3]))
    await handle.close()
    expect(Array.from(await readFile('cache/img/c.bin'))).toEqual([1, 2, 3])
  })

  it('convertFileSrc keeps URLs and turns staged files into blob URLs', async () => {
    expect(convertFileSrc('https://example.com/a.png')).toBe('https://example.com/a.png')
    await writeFile('/web/app/img/b.png', new Uint8Array([1, 2, 3]))
    expect(convertFileSrc('/web/app/img/b.png')).toMatch(/^blob:/)
  })
})

describe('websocket commands', () => {
  it('refuses to send without a connection', async () => {
    await expect(invoke('ws_send_message', { params: { data: { type: 2 } } })).rejects.toBe('WebSocket not connected')
    await expect(invoke('ws_get_state')).resolves.toBe('DISCONNECTED')
  })
})
