let wasmMd5Instance: { digest_u8: (data: Uint8Array) => Promise<string> } | null = null

export const getWasmMd5 = async () => {
  if (!wasmMd5Instance) {
    const module = await import('digest-wasm')
    wasmMd5Instance = module.Md5
  }
  return wasmMd5Instance
}

export const md5FromString = async (value: string) => {
  const md5 = await getWasmMd5()
  const encoder = new TextEncoder()
  return md5.digest_u8(encoder.encode(value))
}
