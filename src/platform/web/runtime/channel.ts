/**
 * Browser counterpart of Tauri's Channel: commands push ordered messages straight to onmessage.
 */
let channelSeq = 1

export class Channel<T = unknown> {
  readonly id = channelSeq++
  #onmessage: (response: T) => void = () => {}

  constructor(onmessage?: (response: T) => void) {
    if (onmessage) this.#onmessage = onmessage
  }

  set onmessage(handler: (response: T) => void) {
    this.#onmessage = handler
  }

  get onmessage(): (response: T) => void {
    return this.#onmessage
  }

  /** Used by the browser command implementations. */
  send(message: T) {
    try {
      this.#onmessage(message)
    } catch (e) {
      console.error('[web] channel handler failed', e)
    }
  }

  toJSON(): string {
    return `__CHANNEL__:${this.id}`
  }
}

/** Sends to a channel argument when the caller passed one. */
export function channelSend(channel: unknown, message: unknown) {
  if (channel instanceof Channel) channel.send(message)
}
