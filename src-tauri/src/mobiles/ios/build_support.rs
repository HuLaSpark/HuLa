use std::{env, process::Command};

pub(crate) fn add_clang_runtime_search_path() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("ios") {
        return;
    }

    println!("cargo:rerun-if-env-changed=DEVELOPER_DIR");
    println!("cargo:rerun-if-env-changed=SDKROOT");
    println!("cargo:rerun-if-env-changed=TARGET");

    let target = env::var("TARGET").unwrap_or_default();
    let is_simulator = target.contains("apple-ios-sim")
        || target.starts_with("x86_64-apple-ios")
        || target.starts_with("i386-apple-ios");

    let sdk = if is_simulator {
        "iphonesimulator"
    } else {
        "iphoneos"
    };

    let Ok(output) = Command::new("xcrun")
        .args(["--sdk", sdk, "clang", "-print-resource-dir"])
        .output()
    else {
        return;
    };

    if !output.status.success() {
        return;
    }

    let resource_dir = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if resource_dir.is_empty() {
        return;
    }

    let darwin_lib_dir = std::path::Path::new(&resource_dir)
        .join("lib")
        .join("darwin");
    if darwin_lib_dir.is_dir() {
        println!(
            "cargo:rustc-link-search=native={}",
            darwin_lib_dir.display()
        );
    }
}

pub(crate) fn compile_ios_splash() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("ios") {
        return;
    }

    println!("cargo:rerun-if-changed=gen/apple/Sources/hula/SplashScreen.mm");

    cc::Build::new()
        .file("gen/apple/Sources/hula/SplashScreen.mm")
        .flag("-fobjc-arc")
        .compile("hula_ios_splash");
}
