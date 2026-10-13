use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{Argon2, Params};

pub struct CryptoEngine;

impl CryptoEngine {
    /// KDF: Mengubah Master Password menjadi Kunci 256-bit via Argon2id
    pub fn derive_key(master_password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
        let mut derived_key = [0u8; 32];
        let params = Params::new(65536, 3, 1, Some(32))
            .map_err(|e| format!("Error parameter Argon2: {}", e))?;
        let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);

        argon2
            .hash_password_into(master_password.as_bytes(), salt, &mut derived_key)
            .map_err(|e| format!("Gagal Argon2id KDF: {}", e))?;

        Ok(derived_key)
    }

    /// Dekripsi RAM: AES-256-GCM
    pub fn decrypt(ciphertext: &[u8], key: &[u8; 32], nonce_bytes: &[u8; 12]) -> Result<Vec<u8>, String> {
        let cipher = Aes256Gcm::new_from_slice(key)
            .map_err(|e| format!("AES-GCM Init Error: {}", e))?;
        let nonce = Nonce::from_slice(nonce_bytes);

        cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| "Master Password salah atau data partisi korup!".to_string())
    }
}