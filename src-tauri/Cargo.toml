[package]
name = "peredyshka"
version = "1.1.0"
description = "Таймер перерывов с упражнениями"
edition = "2021"
rust-version = "1.77.2"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-png"] }
tauri-plugin-notification = "2"
tauri-plugin-single-instance = "2"
tauri-plugin-autostart = "2"
tauri-plugin-opener = "2"

# Настройки ради размера бинарника — это одна из причин переезда на Tauri
[profile.release]
opt-level = "s"
lto = true
codegen-units = 1
panic = "abort"
strip = true
