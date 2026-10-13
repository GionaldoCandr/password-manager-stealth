# Asset Inventory - Stealth Password Vault

Dokumen ini memuat inventaris aset ekosistem Stealth Password Vault berdasarkan FIPS 199.

## Daftar Aset Sistem

| ID Asset | Nama Asset | Kategori | Lokasi Simpan / Eksekusi | C | I | A | Alasan Rating & Proteksi Kriptografi |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **AST-01** | Master Password | Data / Credential | Memori RAM (KDF Process) | **H** | **H** | **M** | **Kritis:** Akses tunggal ke vault. Diturunkan via Argon2id menjadi kunci 256-bit dan dibersihkan paksa via `zeroize`. |
| **AST-02** | Encrypted Vault Data (`vault_store.bin`) | Data / Storage | `%LOCALAPPDATA%\Microsoft\SystemCache` | **H** | **H** | **H** | **Kritis:** Menyimpan akun & password. Enkripsi simetris **AES-256-GCM** (Nonce 96-bit) di dalam NTFS Alternate Data Streams (`sys_data.log:part_01.dat`). |
| **AST-03** | Local Sync HTTP Token | Secret / Token | Memori RAM & Extension Local Storage | **H** | **H** | **M** | **Tinggi:** Mengautentikasi request IPC dari Browser Extension ke port `127.0.0.1:14201`. |
| **AST-04** | P2P Pairing Secret / QR Token | Secret / Auth | Memori RAM Desktop & Mobile | **H** | **H** | **M** | **Tinggi:** Digunakan saat handshake otentikasi awal antara PC dan Mobile sebelum pertukaran data P2P (UDP `14202`). |
| **AST-05** | Master Local Data Provider (Desktop Core Engine) | Software / Binary | `%LOCALAPPDATA%\Microsoft\SystemCache\win_service_host.exe` | **M** | **H** | **H** | **Tinggi:** Biner Rust/Tauri v2 yang mengelola dekripsi RAM, server P2P, dan registry `HKCU App Paths`. |
| **AST-06** | Browser Auto-Fill Extension | Software / Extension | Chrome/Edge Unpacked (Manifest V3) | **M** | **H** | **M** | **Sedang:** Penangkap form pendaftaran/login. Menggunakan pemisahan Content Script dan Background Worker. |
| **AST-07** | Windows App Paths Registry | Konfigurasi OS | `HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\MyPass.exe` | **L** | **H** | **M** | **Sedang:** Pemetaan perintah rahasia `Win+R` (`MyPass`). Modifikasi tanpa izin merusak fitur stealth launcher. |
| **AST-08** | Android Mobile App & Local Storage | Software / Mobile | Perangkat Android (APK Standalone Signed) | **H** | **H** | **M** | **Tinggi:** Menyimpan salinan vault terenkripsi dan mengeksekusi CRDT LWW. Ditandatangani Java Keystore (`release-key.jks`). |
| **AST-09** | Application Logs & CRDT Metadata | Log / Metadata | Memori RAM & Disk Lokal | **L** | **M** | **L** | **Rendah:** Berisi timestamp `updated_at` dan flag `is_deleted` (Tombstone). Tidak memuat plaintext password. |

*Rating: **H** = High, **M** = Moderate, **L** = Low*