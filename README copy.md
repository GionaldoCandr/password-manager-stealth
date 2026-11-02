# STEALTH PASSWORD VAULT ECOSYSTEM (v1.0.0)
### Produk Digital Terintegrasi Tiga Mata Kuliah (Semester 5 CS5-2026)
**Universitas Pertamina · Program Studi Ilmu Komputer**  
- **Kriptografi (052357)** · Dosen: Muhammad Fakhrul Safitra, S.Kom., M.Kom.
- **Keamanan Komputasi dan Siber (052353)** · Dosen: Muhammad Fakhrul Safitra, S.Kom., M.Kom.
- **Pengembangan Aplikasi Web (052355 / 052356)** · Dosen: Muhammad Fakhrul Safitra, S.Kom., M.Kom.

**Pengembang:** Gionaldo Chandrawansah (NIM: 105224031)  
**Status Rilis:** v1.0.0 (Final Project Release Bersama)

---

## 1. Ikhtisar Ekosistem Produk
**Stealth Password Vault** adalah pengelola kata sandi terdesentralisasi multiplatform yang dirancang dengan arsitektur **Zero-Disk Forensic Footprint** dan **Zero-Knowledge Peer-to-Peer Synchronization**. Sistem ini memadukan keamanan sistem operasi, protokol kriptografi modern, dan teknologi web masa kini menjadi satu ekosistem utuh yang saling terhubung:

1. **PC Windows Desktop (`password-manager-stealth`):**
   - **`PcPMSV.exe`**: Antarmuka desktop interaktif berbasis Rust Tauri v2 & React.
   - **`launcher.exe`**: Peluncur cepat tanpa jejak yang dipanggil melalui shortcut `Win + R` $\rightarrow$ `RunPass`.
   - **`PcPMSV-Installer.exe`**: Setup installer dinamis yang memasang payload ke `%LOCALAPPDATA%\Microsoft\SystemCache` lalu menghapus dirinya sendiri (*anti-forensic self-deletion*).
   - **P2P Wi-Fi Sync Server**: Berjalan di port lokal `14202` dengan otentikasi QR-Code session token.
2. **Android Mobile App (`MobilePMSV.apk`):**
   - Aplikasi mobile native Tauri Android dengan pemindai kamera QR Code.
   - Layar penuh (*fullscreen immersive*) tanpa terpotong bar navigasi sistem.
   - Paket APK siap pakai bertanda tangan Signature Scheme v2 & v3 (Anti error saat kirim via WhatsApp).
3. **Browser Extension (`extension-password-browser`):**
   - Ekstensi browser Manifest V3 (Chrome, Edge, Brave) untuk deteksi kredensial baru dan autofill instan.
   - Terhubung secara aman ke desktop via port loopback `127.0.0.1:14201`.
4. **Interactive Documentation & Lab Hub (`web-password-stealth-vault`):**
   - Portal web Next.js 16 App Router yang menyajikan dokumentasi kurikulum 16 pekan, simulasi lab interaktif (Lab 01–03), dan arsitektur stickman terintegrasi.

---

## 2. Struktur Repositori
```text
Root-Pass-Project/
├── MATRIKS_KETERLACAKAN.md       # Matriks Kebutuhan -> Fitur -> Kripto -> Kontrol -> Bukti Uji
├── EVALUASI.md                   # Laporan Evaluasi 4 Dimensi, SUS, Uji Otomatis & Risiko Sisa
├── AI_LOG.md                     # Catatan Akuntabilitas dan Transparansi Penggunaan AI
├── CHANGELOG.md                  # Riwayat Versi SemVer v0.1 s.d v1.0.0
├── LICENSE                       # Lisensi Sumber Terbuka (MIT License)
├── ATTRIBUTION.md                # Pengakuan Hak Cipta Pustaka dan Kontributor
├── docs/
│   └── ciptaan/                  # Berkas Permohonan Pencatatan Hak Cipta DJKI Kemenkum RI
│       ├── surat_pernyataan_ciptaan.md
│       ├── manual_deskripsi_program.md
│       └── sampel_kode_sumber.md
├── password-manager-stealth/     # Kode Sumber Biner PC, Android, Launcher, Installer, & Extension
│   ├── app/                      # Direktori Pusat Instalasi & Biner Siap Pakai
│   │   ├── PcPMSV-Installer.exe  # Setup Wizard Desktop
│   │   ├── PcPMSV.exe            # Aplikasi Desktop Standalone
│   │   ├── MobilePMSV.apk        # APK Android Siap Pasang
│   │   └── extension-password-browser/ # Folder Browser Extension Unpacked
│   ├── app-gui/                  # Kode Sumber Tauri 2.0 Desktop & Android
│   ├── launcher/                 # Kode Sumber Silent CLI Launcher
│   └── installer/                # Kode Sumber Dynamic Self-Deleting Installer
├── web-password-stealth-vault/   # Kode Sumber Portal Web Next.js 16 & Lab Hub
└── Materi/                       # Silabus, Modul, dan Rubrik Kurikulum Semester 5
```

---

## 3. Panduan Pengujian & Build dari Klon Bersih (*Clean Clone*)

### Prasyarat Lingkungan:
- **Rust Toolchain:** `rustc 1.80+` & `cargo`
- **Node.js:** `v20.x` atau `v22.x` dengan `npm`
- **Sistem Operasi:** Windows 10/11 (64-bit)

### A. Menjalankan Uji Otomatis Kriptografi & Sistem (`cargo test`):
Untuk memverifikasi 8 skenario pengujian unit & integrasi (termasuk 3 skenario negatif bermakna dan uji kritis):
```powershell
cd password-manager-stealth
cargo test -p app-gui
```
*Hasil yang diharapkan: `test result: ok. 8 passed; 0 failed`.*

### B. Membangun Aplikasi Desktop PC (`PcPMSV`):
```powershell
cd password-manager-stealth\app-gui
npm install
npm run tauri -- build --no-bundle
```
Hasil biner produksi offline tanpa ketergantungan server lokal tersimpan di:
`password-manager-stealth\target\release\app-gui.exe` (atau folder `app/PcPMSV.exe`).

### C. Menjalankan Portal Dokumentasi Web (`web-password-stealth-vault`):
```powershell
cd web-password-stealth-vault
npm install
npm run build
npm run start
```
Buka peramban di `http://localhost:3000` untuk menjelajahi dokumentasi kurikulum dan simulasi laboratorium kriptografi.

---

## 4. Parameter Kriptografi & Kontrol Keamanan
- **Algoritma Enkripsi Brankas:** AES-256-GCM / ChaCha20-Poly1305 (AEAD dengan integritas terotentikasi).
- **Derivasi Kunci Master:** KDF berbasis PBKDF2/Argon2id dengan per-vault random salt dan iterasi komputasi adaptif.
- **Konsistensi Replikasi Multi-Perangkat:** CRDT (Conflict-free Replicated Data Type) Last-Write-Wins (LWW) berbasis timestamp milidetik UTC.
- **Anti-Forensik Windows:** Registrasi dinamis Windows App Paths `HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\RunPass.exe` tanpa jejak shortcut desktop.

---

## 5. Kredensial Bawaan Sistem
- **Master Password Awal:** `admin123`
- **Kata Kunci Panggilan Win + R:** `RunPass`
- **Port Komunikasi Lokal:**
  - `14201`: Local IPC Browser Extension
  - `14202`: P2P Wi-Fi Sync Server

