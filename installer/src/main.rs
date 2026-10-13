use std::fs;
use std::io::{self, Write};
use std::path::PathBuf;
use std::process::Command;
use winreg::enums::*;
use winreg::RegKey;

// Mengemas biner hasil build release secara otomatis ke dalam installer
const LAUNCHER_BYTES: &[u8] = include_bytes!("../../target/release/launcher.exe");
const GUI_BYTES: &[u8] = include_bytes!("../../target/release/app-gui.exe");

fn print_banner() {
    println!(r#"
  ██████╗████████╗███████╗ █████╗ ██╗  ████████╗██╗  ██╗
 ██╔════╝╚══██╔══╝██╔════╝██╔══██╗██║  ╚══██╔══╝██║  ██║
 ╚█████╗    ██║   █████╗  ███████║██║     ██║   ███████║
  ╚═══██╗   ██║   ██╔══╝  ██╔══██║██║     ██║   ██╔══██║
 ██████╔╝   ██║   ███████╗██║  ██║███████╗██║   ██║  ██║
 ╚═════╝    ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝   ╚═╝  ╚═╝
           STEALTH VAULT - DYNAMIC SETUP WIZARD
    "#);
}

fn main() {
    print_banner();

    println!("------------------------------------------------------------");
    println!(" [!] Selamat datang di installer Stealth Password Manager.");
    println!(" [!] Konfigurasi ini akan memasang vault tanpa jejak di disk.");
    println!("------------------------------------------------------------\n");

    // 1. Interactive Setup Wizard: Input Alias Custom
    print!("> Masukkan kata kunci panggilan Win + R (Default: RunPass): ");
    io::stdout().flush().unwrap();
    
    let mut alias_input = String::new();
    io::stdin().read_line(&mut alias_input).unwrap();
    let alias_input = alias_input.trim();

    let final_alias = if alias_input.is_empty() {
        "RunPass"
    } else {
        alias_input
    };

    println!("[+] Alias terkonfigurasi: {}", final_alias);

    // 2. Tentukan Direktori Tersembunyi (SystemCache)
    let appdata = match std::env::var("LOCALAPPDATA") {
        Ok(path) => path,
        Err(_) => {
            println!("[ERROR] Tidak dapat membaca variabel direktori sistem.");
            return;
        }
    };

    let target_dir = PathBuf::from(appdata).join("Microsoft").join("SystemCache");
    if let Err(e) = fs::create_dir_all(&target_dir) {
        println!("[ERROR] Gagal membuat direktori tersembunyi: {}", e);
        return;
    }

    let launcher_target = target_dir.join("win_service_host.exe");
    let gui_target = target_dir.join("app-gui.exe");

    println!("[1/3] Menuliskan payload terenkripsi ke direktori tersembunyi...");
    if let Err(e) = fs::write(&launcher_target, LAUNCHER_BYTES) {
        println!("[ERROR] Gagal menyalin biner launcher: {}", e);
        return;
    }
    if let Err(e) = fs::write(&gui_target, GUI_BYTES) {
        println!("[ERROR] Gagal menyalin biner GUI: {}", e);
        return;
    }

    // 3. Pendaftaran Registry Dynamic App Paths (Win + R)
    println!("[2/3] Mendaftarkan kata kunci '{}' ke Windows Registry...", final_alias);
    if let Err(e) = register_winr_alias(final_alias, &launcher_target.to_string_lossy()) {
        println!("[ERROR] Gagal memperbarui Windows Registry: {}", e);
        return;
    }

    println!("\n============================================================");
    println!(" [SUCCESS] Pemasangan Stealth Vault Berhasil!");
    println!(" [INFO] Kamu bisa menekan [Win + R], ketik '{}', lalu Enter.", final_alias);
    println!("============================================================\n");

    // 4. Memicu Anti-Forensic Self-Deletion
    println!("[3/3] Membersihkan installer ini dari memori dan disk...");
    trigger_self_deletion();
}

fn register_winr_alias(alias: &str, executable_path: &str) -> io::Result<()> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let subkey_path = format!(r"Software\Microsoft\Windows\CurrentVersion\App Paths\{}.exe", alias);
    let (key, _) = hkcu.create_subkey(&subkey_path)?;
    key.set_value("", &executable_path)?;
    Ok(())
}

fn trigger_self_deletion() {
    if let Ok(current_exe) = std::env::current_exe() {
        // Menggunakan cmd asynchronous dengan pemicu timeout 2 detik untuk menghapus installer
        let cmd = format!(
            "timeout /t 2 /nobreak > NUL & del \"{}\"",
            current_exe.display()
        );

        Command::new("cmd")
            .args(["/C", &cmd])
            .spawn()
            .ok();
    }
}