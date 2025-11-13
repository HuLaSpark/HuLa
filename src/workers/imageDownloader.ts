/// <reference lib="webworker" />

type DownloadRequest = {
  url: string
}

self.addEventListener('message', async (event: MessageEvent<DownloadRequest>) => {
  const { url } = event.data

  if (!url) {
    self.postMessage({ success: false, url, error: 'url is required' })
    return
  }

  try {
    const response = await fetch(url)
    if (!response.ok || !response.body) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    console.log(`[ImageWorker] 文件下载成功: ${url}`)
    self.postMessage({ success: true, url, buffer }, [buffer])
  } catch (error) {
    self.postMessage({ success: false, url, error: error instanceof Error ? error.message : String(error) })
  }
})
