import { invoke } from '@tauri-apps/api/core'

export type Settings = {
  database: {
    sqlite_file: string
  }
  backend: {
    base_url: string
    ws_url: string
  }
  youdao: {
    app_key: string
    app_secret: string
  }
  tencent: {
    api_key: string
    secret_id: string
  }
}

export const getSettings = async (): Promise<Settings> => {
  return await invoke('get_settings')
}
