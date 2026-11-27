/**
 * Browser replacement of tauri-plugin-mic-recorder-api on MediaRecorder. stopRecording() returns
 * the path of the recording in the in-memory file system, like the plugin returns a file path.
 */
import { vfsPut } from '../../runtime/vfs'

let recorder: MediaRecorder | null = null
let chunks: Blob[] = []
let seq = 1

export async function startRecording(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  chunks = []
  recorder = new MediaRecorder(stream)
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  recorder.start()
}

export async function stopRecording(): Promise<string | null> {
  const current = recorder
  if (!current) return null
  recorder = null
  const stopped = new Promise<void>((resolve) => current.addEventListener('stop', () => resolve(), { once: true }))
  if (current.state !== 'inactive') current.stop()
  await stopped
  current.stream.getTracks().forEach((t) => t.stop())
  const type = current.mimeType || 'audio/webm'
  const blob = new Blob(chunks, { type })
  const path = `/recordings/${seq++}.${type.includes('ogg') ? 'ogg' : 'webm'}`
  vfsPut(path, new Uint8Array(await blob.arrayBuffer()), type)
  return path
}
