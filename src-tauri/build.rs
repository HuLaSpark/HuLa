use std::{env, fs, io};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    ensure_frontend_dist()?;
    tauri_build::build();

    Ok(())
}

fn ensure_frontend_dist() -> Result<(), Box<dyn std::error::Error>> {
    let current_dir = env::current_dir()?;
    let parent_dir = current_dir
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Cannot find parent directory!"))?;
    let frontend_dist = parent_dir.join("dist");

    //  There should not be this directory.
    let exists = frontend_dist.exists() && frontend_dist.is_dir();

    if !exists {
        fs::create_dir(&frontend_dist)?;
    }

    Ok(())
}
