use tauri::{Manager, Runtime};
use window_shadows::set_shadow;

pub fn set_window_shadow<R: Runtime>(app: &tauri::App<R>) {
  for (_, window) in app.windows() {
    set_shadow(&window, true).expect("Failed to set window shadow");
  }
}