# AI Log — Penggunaan Generative AI

**Mata Kuliah:** Kriptografi  
**Tugas:** Tugas 1 — Fondasi dan Komponen Dasar Kriptografi  
**Produk:** Password Stealth Vault  
**Nama Mahasiswa:** Gionaldo Chandrawansah  

---

## Log Aktivitas

### 1. Perancangan Komponen Utama AES-256-GCM
- **Alat AI:** Gemini 1.5 Pro
- **Tujuan:** Membantu pembuatan struktur komponen `VaultCryptoEngine` menggunakan AES-GCM dengan penanganan CSPRNG dan pemisahan encoding secara eksplisit.
- **Ringkasan Perintah (Prompt):** "Buatkan modul enkripsi AES-256-GCM menggunakan Python library cryptography, lengkap dengan validasi input, pemisahan encoding bytes/base64, dan pembangkitan nonce CSPRNG."
- **Bagian yang Dipakai / Diubah:** Struktur kelas `VaultCryptoEngine` diambil dan disesuaikan penanganan *error handling*-nya. Menambahkan validasi `ValueError` untuk *edge cases* masukan string kosong.
- **Cara Memeriksa:** Verifikasi manual pada dokumentasi pustaka `cryptography.hazmat.primitives.ciphers.aead.AESGCM` untuk memastikan *nonce length* (12 bytes/96-bit) dan ketersediaan *Authentication Tag*.

### 2. Pembuatan Skenario Uji Automasi (`pytest`)
- **Alat AI:** Gemini 1.5 Pro
- **Tujuan:** Menyusun 4 skenario uji otomatis sesuai rubrik K4 (Positif, Negatif, Batas, dan Uji Kunci Berbeda).
- **Ringkasan Perintah (Prompt):** "Buatkan skenario uji unit test pytest untuk modul AESGCM Vault yang mencakup uji positif, uji integritas payload terdistorsi, uji batas string kosong, dan uji beda kunci."
- **Bagian yang Dipakai / Diubah:** Menggunakan struktur `pytest.raises` untuk menangkap *exception* saat tampering dan input ilegal terjadi.
- **Cara Memeriksa:** Menjalankan perintah `pytest docs/KRIPTOGRAFI/test_crypto_vault.py -v` pada terminal dan memastikan keempat tes lulus (100% PASS).