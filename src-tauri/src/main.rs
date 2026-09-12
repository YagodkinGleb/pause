// Убирает лишнее консольное окно в релизной сборке под Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use tauri::{
    image::Image,
    menu::{CheckMenuItem, CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;

const TRAY_WORK: &[u8] = include_bytes!("../icons/tray-work.png");
const TRAY_REST: &[u8] = include_bytes!("../icons/tray-rest.png");

/// Помним, мы ли развернули окно на перерыв.
/// Если окно открыл сам пользователь — прятать его при возврате к работе нельзя.
struct WindowRestore {
    visible: bool,
    minimized: bool,
}
struct Grabbed(Mutex<Option<WindowRestore>>);

fn show_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// Начался перерыв: развернуть окно на весь экран поверх всех программ.
#[tauri::command]
fn enter_rest(app: tauri::AppHandle, state: tauri::State<'_, Grabbed>) {
    let Ok(mut saved) = state.0.lock() else {
        return;
    };
    if saved.is_some() {
        return;
    }
    if let Some(w) = app.get_webview_window("main") {
        *saved = Some(WindowRestore {
            visible: w.is_visible().unwrap_or(false),
            minimized: w.is_minimized().unwrap_or(false),
        });
        let _ = w.unminimize();
        let _ = w.set_always_on_top(true);
        let _ = w.set_fullscreen(true);
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// Перерыв кончился: вернуть окно в обычный вид.
/// Прячем в трей только если разворачивали его мы сами.
#[tauri::command]
fn enter_work(app: tauri::AppHandle, state: tauri::State<'_, Grabbed>) {
    let Ok(mut saved) = state.0.lock() else {
        return;
    };
    let Some(before) = saved.take() else { return };
    if let Some(w) = app.get_webview_window("main") {
        // Hide before leaving fullscreen to avoid flashing a resized frame.
        if !before.visible || before.minimized {
            let _ = w.hide();
        }
        let _ = w.set_fullscreen(false);
        let _ = w.set_always_on_top(false);
        if before.visible {
            if before.minimized {
                let _ = w.minimize();
            }
            let _ = w.show();
        }
    }
}

/// Включён ли автозапуск — чтобы окно показало верное состояние тумблера.
#[tauri::command]
fn get_autostart(app: tauri::AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

/// Переключение автозапуска из окна, а не только из меню трея.
#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enabled: bool) -> bool {
    let mgr = app.autolaunch();
    let _ = if enabled { mgr.enable() } else { mgr.disable() };
    let actual = mgr.is_enabled().unwrap_or(false);
    if let Some(item) = app.try_state::<CheckMenuItem<tauri::Wry>>() {
        let _ = item.set_checked(actual);
    }
    actual
}

#[tauri::command]
fn open_support(app: tauri::AppHandle) -> bool {
    app.opener()
        .open_url("https://boosty.to/yagojeez/donate", None::<&str>)
        .is_ok()
}

#[tauri::command]
fn launched_at_login() -> bool {
    std::env::args().any(|arg| arg == "--autostart")
}

#[tauri::command]
fn notify(app: tauri::AppHandle, title: String, body: String) {
    let _ = app.notification().builder().title(title).body(body).show();
}

/// Подсказка и цвет иконки в трее: янтарная — работа, зелёная — перерыв.
#[tauri::command]
fn set_tray(app: tauri::AppHandle, phase: String, tooltip: String) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_tooltip(Some(tooltip.as_str()));
        let bytes: &[u8] = if phase == "rest" {
            TRAY_REST
        } else {
            TRAY_WORK
        };
        if let Ok(img) = Image::from_bytes(bytes) {
            let _ = tray.set_icon(Some(img));
        }
    }
}

fn main() {
    tauri::Builder::default()
        // Второй запуск не создаёт вторую иконку в трее, а показывает окно первой копии.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_window(app);
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .manage(Grabbed(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            enter_rest,
            enter_work,
            notify,
            set_tray,
            get_autostart,
            set_autostart,
            open_support,
            launched_at_login
        ])
        .setup(|app| {
            if !launched_at_login() {
                if let Some(w) = app.get_webview_window("main") {
                    w.show()?;
                }
            }
            let autostart_on = app.autolaunch().is_enabled().unwrap_or(false);

            let show_i = MenuItemBuilder::with_id("show", "Показать окно").build(app)?;
            let auto_i = CheckMenuItemBuilder::with_id("autostart", "Запускать при старте Windows")
                .checked(autostart_on)
                .build(app)?;
            let quit_i = MenuItemBuilder::with_id("quit", "Выход").build(app)?;

            let menu = MenuBuilder::new(app)
                .items(&[&show_i, &auto_i])
                .separator()
                .items(&[&quit_i])
                .build()?;

            let auto_handle = auto_i.clone();
            app.manage(auto_i.clone());

            TrayIconBuilder::with_id("main")
                .icon(Image::from_bytes(TRAY_WORK)?)
                .tooltip("Передышка")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => show_window(app),
                    "autostart" => {
                        let mgr = app.autolaunch();
                        let enabled = mgr.is_enabled().unwrap_or(false);
                        let _ = if enabled { mgr.disable() } else { mgr.enable() };
                        let now_on = mgr.is_enabled().unwrap_or(false);
                        let _ = auto_handle.set_checked(now_on);
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        // Крестик прячет окно в трей, а не закрывает программу.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("не удалось запустить приложение");
}
