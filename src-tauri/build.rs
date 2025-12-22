#[path = "src/mobiles/ios/build_support.rs"]
mod ios_build_support;

use std::{env, fs, io, path::PathBuf};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    ios_build_support::add_clang_runtime_search_path();
    ios_build_support::compile_ios_splash();
    ensure_frontend_dist()?;
    tauri_build::build();

    Ok(())
}

fn ensure_frontend_dist() -> Result<(), Box<dyn std::error::Error>> {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR")
        .map(PathBuf::from)
        .or_else(|_| env::current_dir())
        .map_err(|e| {
            io::Error::new(
                io::ErrorKind::NotFound,
                format!("Cannot resolve crate dir: {e}"),
            )
        })?;

    let project_root = manifest_dir.parent().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "Cannot find parent directory of CARGO_MANIFEST_DIR!",
        )
    })?;
    let frontend_dist = project_root.join("dist");

    if frontend_dist.exists() && !frontend_dist.is_dir() {
        return Err(Box::new(io::Error::new(
            io::ErrorKind::AlreadyExists,
            format!(
                "Frontend dist path exists but is not a directory: {}",
                frontend_dist.display()
            ),
        )));
    }

    if !frontend_dist.is_dir() {
        fs::create_dir_all(&frontend_dist)?;
    }

    Ok(())
}
