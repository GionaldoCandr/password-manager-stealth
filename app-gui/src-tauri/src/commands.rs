use tauri::State;
use crate::{VaultState, VaultItem, SyncPayload, merge_crdt_items, save_persistent_state};

#[tauri::command]
pub async fn execute_p2p_sync(
    pc_ip: String,
    port: u16,
    alias_token: String,
    master_password: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/api/sync", pc_ip, port);

    let res = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", alias_token))
        .json(&serde_json::json!({ "master_password": master_password }))
        .send()
        .await
        .map_err(|e| format!("Gagal terhubung ke PC ({}:{}): {}", pc_ip, port, e))?;

    if res.status().is_success() {
        Ok("Sinkronisasi P2P Berhasil! Data Vault diperbarui.".to_string())
    } else {
        Err(format!("PC Menolak Koneksi: Status {}", res.status()))
    }
}