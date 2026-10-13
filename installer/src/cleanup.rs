use std::env;
use std::process::{Command, Stdio};

pub struct CleanupEngine;

impl CleanupEngine {
    /// Memicu proses CMD asinkronus untuk menghapus file installer .exe milik sendiri
    pub fn trigger_self_deletion() -> Result<(), String> {
        let current_exe = env::current_exe()
            .map_err(|e| format!("Gagal mendapatkan path installer: {}", e))?;

        let exe_path = current_exe.to_str()
            .ok_or_else(|| "Path file tidak valid".to_string())?;

        println!("\n[CLEANUP] Mempersiapkan penghapusan file installer...");
        println!("          Target: {}", exe_path);

        #[cfg(windows)]
        {
            let cleanup_cmd = format!(
                "choice /C Y /N /D Y /T 2 > NUL & del /f /q \"{}\"",
                exe_path
            );

            Command::new("cmd.exe")
                .args(["/C", &cleanup_cmd])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .stdin(Stdio::null())
                .spawn()
                .map_err(|e| format!("Gagal memicu proses self-deletion: {}", e))?;
        }

        Ok(())
    }
}