/** Browser replacement of @tauri-apps/plugin-barcode-scanner (mobile only). */
export enum Format {
  QRCode = 'QR_CODE',
  UPC_A = 'UPC_A',
  UPC_E = 'UPC_E',
  EAN8 = 'EAN_8',
  EAN13 = 'EAN_13',
  Code39 = 'CODE_39',
  Code93 = 'CODE_93',
  Code128 = 'CODE_128',
  Codabar = 'CODABAR',
  ITF = 'ITF',
  Aztec = 'AZTEC',
  DataMatrix = 'DATA_MATRIX',
  PDF417 = 'PDF_417',
  GS1DataBar = 'GS1_DATA_BAR',
  GS1DataBarLimited = 'GS1_DATA_BAR_LIMITED',
  GS1DataBarExpanded = 'GS1_DATA_BAR_EXPANDED'
}
export async function scan(): Promise<never> {
  throw 'barcode scanning is not available in the browser'
}
export async function cancel(): Promise<void> {}
export async function openAppSettings(): Promise<void> {}
export async function checkPermissions(): Promise<string> {
  return 'denied'
}
export async function requestPermissions(): Promise<string> {
  return 'denied'
}
