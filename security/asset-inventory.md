# Asset Inventory - Stealth Password Vault

Dokumen ini mencantumkan inventaris aset utama pada ekosistem Stealth Password Vault beserta penilaian kerahasiaan (*Confidentiality*), integritas (*Integrity*), dan ketersediaan (*Availability*) berdasarkan standar FIPS 199.

## 1. Daftar Aset Sistem

| ID Asset | Nama Asset | Kategori | Lokasi Simpan / Eksekusi | C | I | A | Alasan Rating & Proteksi Kriptografi |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **AST-01** | Master Password | Data / Kredensial | Memori RAM (In-Memory KDF) | **H** | **H** | **M** | **Kritis:** Kebocoran membuka seluruh vault. Diturunkan menjadi kunci 256-bit via Argon2id (KDF) di RAM dan dibersihkan paksa via `zeroize`. |
| **AST-02** | Encrypted Vault Data (`vault_store.bin`) | Data / Storage | `%LOCALAPPDATA%\Microsoft\SystemCache` (NTFS ADS) | **H** | **H** | **H** | **Kritis:** Berisi seluruh akun & password pengguna. Dilindungi enkripsi simetris **AES-256-GCM** dengan Nonce 96-bit dan disembunyikan via NTFS Alternate Data Streams (`sys_data.log:part_01.dat`). |
| **AST-03** | Local Sync HTTP Gateway Key / Token | Secret / Token | Memori RAM Desktop & Local Storage Extension | **H** | **H** | **M** | **Tinggi:** Kunci sesi/token lokal untuk mengautentikasi request IPC dari Browser Extension ke port `127.0.0.1:14201`. |
| **AST-04** | P2P Pairing Secret / QR Token | Secret / Auth | Memori RAM Process Desktop & Mobile | **H** | **H** | **M** | **Tinggi:** Digunakan untuk *handshake* dan verifikasi otentikasi awal antara PC dan Mobile sebelum pertukaran data P2P (UDP `14202`). |
| **AST-05** | Master Local Data Provider (Desktop Core Engine) | Software / Binary | `%LOCALAPPDATA%\Microsoft\SystemCache\win_service_host.exe` | **M** | **H** | **H** | **Tinggi:** Biner utama Rust/Tauri v2 yang mengelola enkripsi, dekripsi RAM, dan server P2P. Integritas biner dijaga agar tidak diinjeksi malware. |
| **AST-06** | Browser Auto-Fill Extension | Software / Extension | Web Browser (Chrome/Edge Unpacked Manifest V3) | **M** | **H** | **M** | **Sedang:** Komponen penangkap form pendaftaran/login di browser. Dilengkapi pemisahan *Content Script* dan *Background Service Worker* untuk mencegah kebocoran CSP. |
| **AST-07** | Windows App Paths Registry | Konfigurasi OS | `HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\MyPass.exe` | **L** | **H** | **M** | **Sedang:** Kunci registri Windows yang memetakan perintah rahasia `Win+R` (MyPass) ke lokasi biner stealth. Modifikasi tanpa izin merusak fitur launcher. |
| **AST-08** | Android Mobile App & Local SQLite | Software / Mobile | Perangkat Android (APK Standalone Signed) | **H** | **H** | **M** | **Tinggi:** Biner Android yang menyimpan salinan lokal vault terenkripsi dan mengeksekusi penggabungan data CRDT LWW. Biner ditandatangani dengan Java Keystore (`release-key.jks`). |
| **AST-09** | Application Logs & CRDT Metadata | Log / Metadata | Memori RAM & Disk Lokal | **L** | **M** | **L** | **Rendah:** Berisi timestamp milidetik (`updated_at`) dan bendera hapus (`is_deleted` / Tombstone) untuk sinkronisasi CRDT. Tidak memuat plaintext password. |

*Keterangan Rating: **H** = High (Tinggi), **M** = Moderate (Sedang), **L** = Low (Rendah)*