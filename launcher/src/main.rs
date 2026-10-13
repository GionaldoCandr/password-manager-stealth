use std::env;
use std::fs;
use std::io::{self, Write};
use std::path::PathBuf;
use std::process::Command;
use serde::Deserialize;

fn main() {
    let args: Vec<String> = env::args().collect();

    // Jika dipanggil via URI Protocol oleh Browser Extension
    if args.len() > 1 && args[1] == "--background-sync" {
        let appdata = env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
        let gui_path = PathBuf::from(appdata)
            .join("Microsoft")
            .join("SystemCache")
            .join("app-gui.exe");

        let final_gui_path = if gui_path.exists() {
            gui_path
        } else {
            PathBuf::from(r"C:\GIOIG\password-manager-stealth\target\release\app-gui.exe")
        };

        // Jalankan biner GUI secara silent / background
        let _ = Command::new(final_gui_path)
            .arg("--headless-listener")
            .spawn();

        return;
    }

    // Jalankan mode normal CLI Launcher jika dibuka dari Win+R ...
    println!("==================================================");
    println!("    STEALTH LAUNCHER - CLI PASSWORD MANAGER       ");
    println!("==================================================\n");

    print!("Masukkan Master Password: ");
    io::stdout().flush().unwrap();

    let mut master_password = String::new();
    io::stdin().read_line(&mut master_password).unwrap();
    let master_password = master_password.trim();

    let valid_password = get_current_master_password();

    if master_password == valid_password {
        println!("\n[SUCCESS] Autentikasi Berhasil! Membuka Stealth GUI...");

        let appdata = env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
        let gui_path = PathBuf::from(appdata)
            .join("Microsoft")
            .join("SystemCache")
            .join("app-gui.exe");

        let final_gui_path = if gui_path.exists() {
            gui_path
        } else {
            PathBuf::from(r"C:\GIOIG\password-manager-stealth\target\release\app-gui.exe")
        };

        let _ = Command::new(final_gui_path).status();
    } else {
        println!("\n[ERROR] Master Password salah! Akses ditolak.");
        println!("\nTekan Enter untuk keluar...");
        let mut pause = String::new();
        let _ = io::stdin().read_line(&mut pause);
    }
}

fn get_storage_path() -> PathBuf {
    let appdata = env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(appdata).join("Microsoft").join("SystemCache").join("vault_store.bin")
}

fn get_current_master_password() -> String {
    let path = get_storage_path();
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(parsed) = serde_json::from_str::<PersistentState>(&content) {
            return parsed.master_password;
        }
    }
    "admin123".to_string()
}

#[derive(Deserialize)]
struct PersistentState {
    master_password: String,
}