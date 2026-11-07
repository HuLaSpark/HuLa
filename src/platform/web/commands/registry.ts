import { errorText } from '../runtime/bytes'
import { log } from '../runtime/label'

export type CommandArgs = Record<string, any>
export type CommandOptions = { headers?: Record<string, string> } | undefined
export type CommandHandler = (args: CommandArgs, options: CommandOptions) => unknown

const handlers = new Map<string, CommandHandler>()

/** Commands without a browser implementation, for diagnostics (window.__WEB_RUNTIME__.unhandled). */
export const unhandled = new Set<string>()
export const failures: { cmd: string; error: string }[] = []

export function registerCommands(map: Record<string, CommandHandler>) {
  for (const [name, handler] of Object.entries(map)) handlers.set(name, handler)
}

/** Runs a Rust command's browser implementation. Rejections are strings, as with the Rust layer. */
export async function runCommand<T>(cmd: string, args?: CommandArgs, options?: CommandOptions): Promise<T> {
  const handler = handlers.get(cmd)
  if (!handler) {
    unhandled.add(cmd)
    console.warn('[web] unsupported command', cmd, args)
    throw `command ${cmd} is not available in the browser`
  }
  try {
    return (await handler(args || {}, options)) as T
  } catch (e) {
    const error = errorText(e)
    log('command failed', cmd, error)
    failures.push({ cmd, error })
    throw error
  }
}
