use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Hula;
#[cfg(mobile)]
use mobile::Hula;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the hula APIs.
pub trait HulaExt<R: Runtime> {
  fn hula(&self) -> &Hula<R>;
}

impl<R: Runtime, T: Manager<R>> crate::HulaExt<R> for T {
  fn hula(&self) -> &Hula<R> {
    self.state::<Hula<R>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("hula")
    .invoke_handler(tauri::generate_handler![commands::ping])
    .setup(|app, api| {
      #[cfg(mobile)]
      let hula = mobile::init(app, api)?;
      #[cfg(desktop)]
      let hula = desktop::init(app, api)?;
      app.manage(hula);
      Ok(())
    })
    .build()
}
