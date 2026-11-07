/**
 * Browser replacement of @tauri-apps/plugin-clipboard-manager. Text goes through the async
 * clipboard API; images are written as PNG. Reading images is not offered, so callers fall back
 * to text (pasting images with Ctrl+V still works through the paste event).
 */
export async function writeText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  area.remove()
}

export async function readText(): Promise<string> {
  return (await navigator.clipboard?.readText?.()) ?? ''
}

export async function writeImage(image: Uint8Array | ArrayBuffer | number[] | string): Promise<void> {
  if (typeof image === 'string') throw 'writing an image file path is not available in the browser'
  const bytes = image instanceof Uint8Array ? image : new Uint8Array(image as ArrayBuffer)
  const blob = await toPng(new Blob([bytes as BlobPart]))
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

export async function readImage(): Promise<never> {
  throw 'reading images from the clipboard is not available in the browser'
}

export async function writeHtml(html: string, altText?: string): Promise<void> {
  const item = new ClipboardItem({
    'text/html': new Blob([html], { type: 'text/html' }),
    'text/plain': new Blob([altText ?? html], { type: 'text/plain' })
  })
  await navigator.clipboard.write([item])
}

export async function clear(): Promise<void> {
  await writeText('')
}

// The async clipboard only accepts PNG images.
async function toPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject('image conversion failed')), 'image/png')
  )
}
