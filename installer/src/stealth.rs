use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

// Satukan semua import Windows-spesifik di tingkat modul
#[cfg(windows)]
use windows_sys::Win32::Storage::FileSystem::{
    SetFileAttributesW, FILE_ATTRIBUTE_HIDDEN, FILE_ATTRIBUTE_READONLY, FILE_ATTRIBUTE_SYSTEM,
};
#[cfg(windows)]
use windows_sys::Win32::System::Registry::{
    RegCloseKey, RegCreateKeyW, RegSetValueExW, HKEY_CURRENT_USER, REG_SZ,
};

pub struct StealthEngine;

impl StealthEngine {
    /// MODEL 1: Menulis file partisi dan menerapkan Atribut System (+h +s +r)
    pub fn write_system_protected_file(file_path: &str, data: &[u8]) -> Result<(), String> {
        fs::write(file_path, data)
            .map_err(|e| format!("Gagal menulis file partisi: {}", e))?;

        #[cfg(windows)]
        {
            use std::os::windows::ffi::OsStrExt;
            let wide_path: Vec<u16> = std::ffi::OsStr::new(file_path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            let attributes = FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM | FILE_ATTRIBUTE_READONLY;
            unsafe {
                let success = SetFileAttributesW(wide_path.as_ptr(), attributes);
                if success == 0 {
                    return Err("Gagal menerapkan atribut System (+h +s +r) pada file.".to_string());
                }
            }
        }

        println!(" [SUCCESS] File '{}' berhasil dibuat dengan atribut System (+h +s +r).", file_path);
        Ok(())
    }

    /// MODEL 2: Menulis file partisi ke dalam NTFS Alternate Data Stream (ADS)
    pub fn write_ntfs_ads(base_file: &str, stream_name: &str, data: &[u8]) -> Result<(), String> {
        if !Path::new(base_file).exists() {
            fs::write(base_file, "System Log File Data")
                .map_err(|e| format!("Gagal membuat carrier file: {}", e))?;
        }

        let ads_path = format!("{}:{}", base_file, stream_name);
        let mut file = File::create(&ads_path)
            .map_err(|e| format!("Gagal membuat NTFS Stream: {}", e))?;

        file.write_all(data)
            .map_err(|e| format!("Gagal menulis ke NTFS Stream: {}", e))?;

        println!(" [SUCCESS] Partisi berhasil disembunyikan di NTFS ADS: '{}'", ads_path);
        Ok(())
    }

    /// MODEL REGISTER: Mendaftarkan biner launcher ke Windows App Paths agar bisa dipanggil global
    pub fn register_global_alias(alias_name: &str, target_exe_path: &str) -> Result<(), String> {
        #[cfg(windows)]
        {
            use std::os::windows::ffi::OsStrExt;
            let reg_subkey = format!(
                "Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\{}.exe",
                alias_name
            );

            let wide_key: Vec<u16> = std::ffi::OsStr::new(&reg_subkey)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            let wide_path: Vec<u16> = std::ffi::OsStr::new(target_exe_path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            let mut hkey: isize = 0;
            unsafe {
                // RegCreateKeyW hanya menerima 3 parameter: (HKEY, SubKey, &out_hkey)
                let status = RegCreateKeyW(
                    HKEY_CURRENT_USER,
                    wide_key.as_ptr(),
                    &mut hkey,
                );

                if status != 0 {
                    return Err("Gagal membuat kunci registri App Paths.".to_string());
                }

                // Set Default Value registry ke path .exe launcher
                let set_status = RegSetValueExW(
                    hkey,
                    std::ptr::null_mut(),
                    0,
                    REG_SZ,
                    wide_path.as_ptr() as *const u8,
                    (wide_path.len() * 2) as u32,
                );

                RegCloseKey(hkey);

                if set_status != 0 {
                    return Err("Gagal menulis nilai path ke registri.".to_string());
                }
            }

            println!(" [SUCCESS] Alias Terminal '{}.exe' berhasil terdaftar secara global!", alias_name);
            Ok(())
        }

        #[cfg(not(windows))]
        {
            let _ = alias_name;
            let _ = target_exe_path;
            Err("Fungsi registri ini hanya didukung di platform Windows.".to_string())
        }
    }
}