pub mod commands;

use local_ip_address::local_ip;
use rand::Rng;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Emitter;
use tauri::Manager;
use tauri::State;
use tiny_http::{Header, Response, Server};
use qr_code::QrCode;

#[cfg(windows)]
use winreg::enums::*;
#[cfg(windows)]
use winreg::RegKey;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VaultItem {
    pub id: String,
    pub site: String,
    pub username: String,
    pub password: String,
    pub category: String,
    pub history: Vec<String>,
    pub updated_at: u64,
    pub is_deleted: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PersistentState {
    pub master_password: String,
    pub current_alias: String,
    pub items: Vec<VaultItem>,
}

#[derive(Serialize, Deserialize)]
pub struct SyncPayload {
    pub alias_token: String,
    pub vault_data: String,
}

pub struct VaultState {
    pub items: Mutex<Vec<VaultItem>>,
    pub master_password: Mutex<String>,
    pub current_alias: Mutex<String>,
}

#[derive(Serialize)]
pub struct P2pPairingData {
    pub local_ip: String,
    pub port: u16,
    pub sync_key: String,
    pub alias_token: String,
}

#[derive(Deserialize)]
struct ExtensionPayload {
    #[serde(rename = "aliasToken")]
    alias_token: String,
    #[serde(rename = "masterPassword")]
    master_password: String,
    data: ExtensionItem,
}

#[derive(Deserialize)]
struct ExtensionItem {
    site: String,
    username: String,
    password: String,
}

#[derive(Deserialize)]
struct MobileSyncPayload {
    vault_items: Vec<VaultItem>,
}

pub fn current_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

pub fn merge_crdt_items(local: &mut Vec<VaultItem>, incoming: Vec<VaultItem>) -> bool {
    let mut has_changes = false;

    for inc_item in incoming {
        if let Some(existing) = local.iter_mut().find(|i| i.id == inc_item.id) {
            if inc_item.updated_at >= existing.updated_at {
                *existing = inc_item;
                has_changes = true;
            }
        } else {
            local.push(inc_item);
            has_changes = true;
        }
    }

    has_changes
}

fn get_storage_path(app_handle: Option<&tauri::AppHandle>) -> PathBuf {
    let dir = if let Some(app) = app_handle {
        app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."))
    } else {
        #[cfg(windows)]
        {
            let appdata = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(appdata).join("Microsoft").join("SystemCache")
        }
        #[cfg(not(windows))]
        {
            PathBuf::from(".")
        }
    };

    let _ = fs::create_dir_all(&dir);
    dir.join("vault_store.bin")
}

fn save_persistent_state(master_password: &str, current_alias: &str, items: &[VaultItem], app_handle: Option<&tauri::AppHandle>) {
    let state_data = PersistentState {
        master_password: master_password.to_string(),
        current_alias: current_alias.to_string(),
        items: items.to_vec(),
    };
    if let Ok(json_str) = serde_json::to_string(&state_data) {
        let path = get_storage_path(app_handle);
        let _ = fs::write(path, json_str);
    }
}

fn load_persistent_state(app_handle: Option<&tauri::AppHandle>) -> PersistentState {
    let path = get_storage_path(app_handle);
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(parsed) = serde_json::from_str::<PersistentState>(&content) {
            return parsed;
        }
    }
    PersistentState {
        master_password: "admin123".to_string(),
        current_alias: "RunPass".to_string(),
        items: vec![],
    }
}

// 1. HTTP Listener untuk Chrome Extension (Port 14201)
fn start_extension_listener(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        let server = match Server::http("127.0.0.1:14201") {
            Ok(s) => s,
            Err(e) => {
                println!("[Extension Listener] Gagal membuka port 14201: {}", e);
                return;
            }
        };

        for mut request in server.incoming_requests() {
            if request.method() == &tiny_http::Method::Options {
                let mut response = Response::empty(200);
                response.add_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
                response.add_header(Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"POST, OPTIONS"[..]).unwrap());
                response.add_header(Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type"[..]).unwrap());
                let _ = request.respond(response);
                continue;
            }

            if request.url() == "/sync-pass" && request.method() == &tiny_http::Method::Post {
                let mut content = String::new();
                use std::io::Read;
                let _ = request.as_reader().read_to_string(&mut content);

                let cors = Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap();
                let content_type = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();

                if let Ok(payload) = serde_json::from_str::<ExtensionPayload>(&content) {
                    let state = app_handle.state::<VaultState>();
                    let current_master = state.master_password.lock().unwrap();
                    let current_alias = state.current_alias.lock().unwrap();

                    if payload.alias_token == *current_alias && payload.master_password == *current_master {
                        let mut items = state.items.lock().unwrap();
                        let new_item = VaultItem {
                            id: format!("{}", items.len() + 1),
                            site: payload.data.site,
                            username: payload.data.username,
                            password: payload.data.password,
                            category: "Browser Sync".to_string(),
                            history: Vec::new(),
                            updated_at: current_timestamp_ms(),
                            is_deleted: false,
                        };
                        items.push(new_item);

                        save_persistent_state(&current_master, &current_alias, &items, Some(&app_handle));

                        let json_res = r#"{"success":true,"message":"Data disimpan ke Vault!"}"#;
                        let mut response = Response::from_string(json_res).with_status_code(200);
                        response.add_header(cors);
                        response.add_header(content_type);
                        let _ = request.respond(response);
                    } else {
                        let json_res = r#"{"success":false,"message":"Token Win+R atau Master Password salah!"}"#;
                        let mut response = Response::from_string(json_res).with_status_code(401);
                        response.add_header(cors);
                        response.add_header(content_type);
                        let _ = request.respond(response);
                    }
                } else {
                    let json_res = r#"{"success":false,"message":"Format JSON tidak valid!"}"#;
                    let mut response = Response::from_string(json_res).with_status_code(400);
                    response.add_header(cors);
                    response.add_header(content_type);
                    let _ = request.respond(response);
                }
            }
        }
    });
}

// 2. HTTP Listener P2P Sync 2-Arah (HP ⇄ PC) di Port 14202
fn start_p2p_server(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        let server = match Server::http("0.0.0.0:14202") {
            Ok(s) => s,
            Err(e) => {
                println!("[P2P Sync Server] Gagal membuka port 14202: {}", e);
                return;
            }
        };

        println!("[P2P Sync Server] Berjalan di 0.0.0.0:14202");

        for mut request in server.incoming_requests() {
            if request.method() == &tiny_http::Method::Options {
                let mut response = Response::empty(200);
                response.add_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
                response.add_header(Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"POST, GET, OPTIONS"[..]).unwrap());
                response.add_header(Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type, Authorization"[..]).unwrap());
                let _ = request.respond(response);
                continue;
            }

            if request.url().starts_with("/api/sync") || request.url().starts_with("/sync") {
                let cors = Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap();
                let content_type = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();

                // DITERIMA DARI HP (POST)
                if request.method() == &tiny_http::Method::Post {
                    let mut content = String::new();
                    use std::io::Read;
                    let _ = request.as_reader().read_to_string(&mut content);

                    let state = app_handle.state::<VaultState>();
                    let mut local_items = state.items.lock().unwrap();
                    let current_master = state.master_password.lock().unwrap();
                    let current_alias = state.current_alias.lock().unwrap();

                    if let Ok(payload) = serde_json::from_str::<MobileSyncPayload>(&content) {
                        let has_changes = merge_crdt_items(&mut local_items, payload.vault_items);

                        if has_changes {
                            save_persistent_state(&current_master, &current_alias, &local_items, Some(&app_handle));
                        }

                        // EMIT EVENT UNTUK REFRESH UI PC SECARA REAL-TIME
                        let _ = app_handle.emit("p2p-data-updated", ());

                        let json_res = r#"{"success":true,"message":"Data HP berhasil diterima & digabung di PC!"}"#;
                        let mut response = Response::from_string(json_res).with_status_code(200);
                        response.add_header(cors);
                        response.add_header(content_type);
                        let _ = request.respond(response);
                    } else {
                        let json_res = r#"{"success":false,"message":"Payload sync tidak valid"}"#;
                        let mut response = Response::from_string(json_res).with_status_code(400);
                        response.add_header(cors);
                        response.add_header(content_type);
                        let _ = request.respond(response);
                    }
                } 
                // DIKIRIM KE HP (GET)
                else {
                    let state = app_handle.state::<VaultState>();
                    let items = state.items.lock().unwrap();
                    let active_items: Vec<VaultItem> = items.iter().filter(|i| !i.is_deleted).cloned().collect();

                    let json_data = serde_json::to_string(&active_items).unwrap_or_else(|_| "[]".to_string());

                    let mut response = Response::from_string(json_data).with_status_code(200);
                    response.add_header(cors);
                    response.add_header(content_type);
                    let _ = request.respond(response);
                }
            }
        }
    });
}

#[tauri::command]
fn get_p2p_pairing_info() -> Result<serde_json::Value, String> {
    let my_local_ip = local_ip().map_err(|e| format!("Gagal mengambil IP lokal: {}", e))?.to_string();
    let session_token = "stealth-p2p-sync-key";

    let qr_payload = format!("http://{}:14202/api/sync", my_local_ip);

    let code = QrCode::new(qr_payload.as_bytes()).map_err(|e| format!("Gagal generate QR Code: {}", e))?;

    let width = code.width();
    let image_matrix = code.into_colors();
    let module_size = 8;
    let quiet_zone = 4 * module_size;
    let total_size = (width * module_size) + (quiet_zone * 2);

    let mut path_data = String::new();
    for y in 0..width {
        for x in 0..width {
            if image_matrix[y * width + x] == qr_code::Color::Dark {
                let px = (x * module_size) + quiet_zone;
                let py = (y * module_size) + quiet_zone;
                path_data.push_str(&format!("M{} {}h{}v{}h-{}z ", px, py, module_size, module_size, module_size));
            }
        }
    }

    let mut svg_string = String::new();
    svg_string.push_str("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ");
    svg_string.push_str(&total_size.to_string());
    svg_string.push(' ');
    svg_string.push_str(&total_size.to_string());
    svg_string.push_str("\" width=\"260\" height=\"260\"><rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/><path d=\"");
    svg_string.push_str(&path_data);
    svg_string.push_str("\" fill=\"#000000\"/></svg>");

    Ok(serde_json::json!({
        "ip": my_local_ip,
        "port": 14202,
        "token": session_token,
        "qr_svg": svg_string
    }))
}

#[tauri::command]
fn unlock_vault(master_password: String, state: State<'_, VaultState>) -> Result<String, String> {
    let current_master = state.master_password.lock().unwrap();
    if master_password == *current_master {
        let items = state.items.lock().unwrap();
        let active_items: Vec<VaultItem> = items.iter().filter(|i| !i.is_deleted).cloned().collect();
        serde_json::to_string(&active_items).map_err(|e| e.to_string())
    } else {
        Err("Master Password salah! Akses ditolak.".to_string())
    }
}

#[tauri::command]
fn change_master_password(
    app_handle: tauri::AppHandle,
    old_password: String,
    new_password: String,
    state: State<'_, VaultState>,
) -> Result<String, String> {
    let mut current_master = state.master_password.lock().unwrap();
    if old_password != *current_master {
        return Err("Master Password lama salah!".to_string());
    }
    if new_password.trim().is_empty() {
        return Err("Master Password baru tidak boleh kosong!".to_string());
    }

    *current_master = new_password.clone();

    let alias = state.current_alias.lock().unwrap();
    let items = state.items.lock().unwrap();
    save_persistent_state(&new_password, &alias, &items, Some(&app_handle));

    Ok("Master Password berhasil diperbarui dan disimpan!".to_string())
}

#[tauri::command]
fn update_winr_alias(
    app_handle: tauri::AppHandle,
    new_alias: String,
    state: State<'_, VaultState>,
) -> Result<String, String> {
    let clean_new_alias = new_alias.trim();
    if clean_new_alias.is_empty() {
        return Err("Nama alias Win+R tidak boleh kosong!".to_string());
    }

    #[cfg(windows)]
    {
        let mut alias_guard = state.current_alias.lock().unwrap();
        let old_alias = alias_guard.clone();

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let app_paths_base = r"Software\Microsoft\Windows\CurrentVersion\App Paths";

        if !old_alias.is_empty() && old_alias.to_lowercase() != clean_new_alias.to_lowercase() {
            let old_key_name = format!("{}.exe", old_alias);
            if let Ok(app_paths) = hkcu.open_subkey_with_flags(app_paths_base, KEY_ALL_ACCESS) {
                let _ = app_paths.delete_subkey_all(&old_key_name);
                let _ = app_paths.delete_subkey(&old_key_name);
            }
        }

        let new_key_path = format!(r"{}\{}.exe", app_paths_base, clean_new_alias);
        let target_launcher_path = match std::env::var("LOCALAPPDATA") {
            Ok(path) => format!(r"{}\Microsoft\SystemCache\win_service_host.exe", path),
            Err(_) => r"C:\GIOIG\password-manager-stealth\target\release\launcher.exe".to_string(),
        };

        let (key, _) = hkcu
            .create_subkey(&new_key_path)
            .map_err(|e| format!("Gagal membuat registry alias baru: {}", e))?;

        key.set_value("", &target_launcher_path)
            .map_err(|e| format!("Gagal mengatur path eksekusi: {}", e))?;

        *alias_guard = clean_new_alias.to_string();

        let master = state.master_password.lock().unwrap();
        let items = state.items.lock().unwrap();
        save_persistent_state(&master, clean_new_alias, &items, Some(&app_handle));

        Ok(format!(
            "Alias Win+R berhasil diubah dari '{}' menjadi '{}'!",
            old_alias, clean_new_alias
        ))
    }

    #[cfg(not(windows))]
    {
        let mut alias_guard = state.current_alias.lock().unwrap();
        *alias_guard = clean_new_alias.to_string();
        
        let master = state.master_password.lock().unwrap();
        let items = state.items.lock().unwrap();
        save_persistent_state(&master, clean_new_alias, &items, Some(&app_handle));

        Ok("Alias berhasil diperbarui di perangkat Android.".to_string())
    }
}

#[tauri::command]
fn get_current_alias(state: State<'_, VaultState>) -> String {
    let alias_guard = state.current_alias.lock().unwrap();
    alias_guard.clone()
}

#[tauri::command]
fn add_vault_item(
    app_handle: tauri::AppHandle,
    site: String,
    username: String,
    password: String,
    category: String,
    state: State<'_, VaultState>,
) -> Result<String, String> {
    let mut items = state.items.lock().unwrap();
    let new_item = VaultItem {
        id: format!("{}", items.len() + 1),
        site,
        username,
        password,
        category: if category.trim().is_empty() {
            "Lainnya".to_string()
        } else {
            category
        },
        history: Vec::new(),
        updated_at: current_timestamp_ms(),
        is_deleted: false,
    };
    items.push(new_item);

    let master = state.master_password.lock().unwrap();
    let alias = state.current_alias.lock().unwrap();
    save_persistent_state(&master, &alias, &items, Some(&app_handle));

    let active_items: Vec<VaultItem> = items.iter().filter(|i| !i.is_deleted).cloned().collect();
    serde_json::to_string(&active_items).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_vault_item(
    app_handle: tauri::AppHandle,
    id: String,
    state: State<'_, VaultState>,
) -> Result<String, String> {
    let mut items = state.items.lock().unwrap();
    if let Some(item) = items.iter_mut().find(|i| i.id == id) {
        item.is_deleted = true;
        item.updated_at = current_timestamp_ms();
    }

    let master = state.master_password.lock().unwrap();
    let alias = state.current_alias.lock().unwrap();
    save_persistent_state(&master, &alias, &items, Some(&app_handle));

    let active_items: Vec<VaultItem> = items.iter().filter(|i| !i.is_deleted).cloned().collect();
    serde_json::to_string(&active_items).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_vault_item(
    app_handle: tauri::AppHandle,
    id: String,
    site: String,
    username: String,
    password: String,
    category: String,
    state: State<'_, VaultState>,
) -> Result<String, String> {
    let mut items = state.items.lock().unwrap();
    if let Some(item) = items.iter_mut().find(|i| i.id == id) {
        if password == item.password {
            return Err("Password baru tidak boleh sama dengan password saat ini!".to_string());
        }

        let recent_history: Vec<String> = item.history.iter().rev().take(4).cloned().collect();
        if recent_history.contains(&password) {
            return Err("Aturan Keamanan: Password ini pernah dipakai!".to_string());
        }

        item.history.push(item.password.clone());
        item.site = site;
        item.username = username;
        item.password = password;
        item.category = if category.trim().is_empty() {
            "Lainnya".to_string()
        } else {
            category
        };
        item.updated_at = current_timestamp_ms();
    }

    let master = state.master_password.lock().unwrap();
    let alias = state.current_alias.lock().unwrap();
    save_persistent_state(&master, &alias, &items, Some(&app_handle));

    let active_items: Vec<VaultItem> = items.iter().filter(|i| !i.is_deleted).cloned().collect();
    serde_json::to_string(&active_items).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_vault_data(
    app_handle: tauri::AppHandle,
    imported_json: String,
    state: State<'_, VaultState>,
) -> Result<String, String> {
    let parsed: Vec<VaultItem> =
        serde_json::from_str(&imported_json).map_err(|_| "Format JSON cadangan tidak valid!".to_string())?;
    let mut items = state.items.lock().unwrap();
    *items = parsed;

    let master = state.master_password.lock().unwrap();
    let alias = state.current_alias.lock().unwrap();
    save_persistent_state(&master, &alias, &items, Some(&app_handle));

    let active_items: Vec<VaultItem> = items.iter().filter(|i| !i.is_deleted).cloned().collect();
    serde_json::to_string(&active_items).map_err(|e| e.to_string())
}

#[tauri::command]
fn generate_password(length: usize, include_symbols: bool) -> String {
    let mut charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".to_string();
    if include_symbols {
        charset.push_str("!@#$%^&*()_+-=[]{}|;:,.<>?");
    }

    let mut rng = rand::thread_rng();
    let charset_bytes = charset.as_bytes();

    (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..charset_bytes.len());
            charset_bytes[idx] as char
        })
        .collect()
}

#[tauri::command]
fn exit_app() {
    std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Load state menggunakan AppHandle resmi agar path-nya konsisten
            let saved_state = load_persistent_state(Some(app.handle()));
            
            app.manage(VaultState {
                items: Mutex::new(saved_state.items),
                master_password: Mutex::new(saved_state.master_password),
                current_alias: Mutex::new(saved_state.current_alias),
            });

            #[cfg(not(mobile))]
            {
                start_extension_listener(app.handle().clone());
                start_p2p_server(app.handle().clone());
            }
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            unlock_vault,
            change_master_password,
            update_winr_alias,
            get_current_alias,
            add_vault_item,
            delete_vault_item,
            update_vault_item,
            import_vault_data,
            generate_password,
            get_p2p_pairing_info,
            commands::execute_p2p_sync,
            exit_app
        ])
        .run(tauri::generate_context!())
        .expect("Error saat menjalankan aplikasi Tauri");
}