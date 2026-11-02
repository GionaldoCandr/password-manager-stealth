# PENGAKUAN ATRIBUSI KARYA DAN PUSTAKA PIHAK KETIGA (ATTRIBUTION.md)
## Stealth Password Vault Ecosystem v1.0.0

Proyek ini dibangun menggunakan pustaka sumber terbuka (*open source*) dan komponen pihak ketiga yang diakui secara terhormat sesuai ketentuan lisensi masing-masing:

### 1. Ekosistem Desktop & Sistem (Rust / Tauri):
- **Tauri 2.0 (Apache-2.0 / MIT):** Kerangka kerja multi-platform aplikasi desktop dan mobile berbasis webview hemat memori.
- **tiny_http (Apache-2.0 / MIT):** Server HTTP ringan berbasis socket tanpa dependensi asinkron berat untuk IPC lokal dan sinkronisasi P2P Wi-Fi.
- **winreg (MIT):** Pengelolaan registry Windows untuk registrasi kata kunci Win+R pada `HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths`.
- **serde / serde_json (MIT / Apache-2.0):** Serialisasi dan deserialisasi struktur data `VaultItem` dan `PersistentState`.
- **qr_code (MIT / Apache-2.0):** Pembuatan QR code matriks biner untuk proses pairing tanpa kabel antar-perangkat.
- **local_ip_address (MIT / Apache-2.0):** Deteksi antarmuka jaringan lokal untuk koneksi P2P.

### 2. Ekosistem Antarmuka Web & Frontend:
- **Next.js 16 (MIT):** Kerangka kerja React untuk aplikasi web dokumentasi dan simulasi lab terintegrasi.
- **React 19 (MIT):** Pustaka antarmuka pengguna berbasis komponen.
- **Tailwind CSS (MIT):** Kerangka kerja styling berbasis utility-first.
- **Lucide React (ISC):** Ikonografi vektor grafis untuk status keamanan, vault, dan kontrol UI.
- **Zod 4 (MIT):** Skema deklaratif untuk validasi formulir dan verifikasi payload.
- **Zustand (MIT):** Manajemen state sisi klien untuk simulator lab dan navigasi dokumentasi.

### 3. Ekosistem Mobile Android:
- **Android NDK & Rust Toolchain (Google / Mozilla):** Kompilasi arsitektur biner `aarch64-linux-android` dan `x86_64-linux-android`.
- **Android Build-Tools (Google):** Perangkat lunak `zipalign` dan `apksigner` untuk penandatanganan paket APK.

