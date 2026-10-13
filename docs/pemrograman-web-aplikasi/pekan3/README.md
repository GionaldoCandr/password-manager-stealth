# Tugas 1 — Milestone 1: Antarmuka Produk Web Responsif dan Aksesibel

**Mata Kuliah**: Pengembangan Aplikasi Web (PAW - 052355)  
**Pekan**: 3  
**Tag Rilis**: `v0.1`  
**Nama Mahasiswa**: Gionaldo Chandrawansah  
**Nama Produk**: Stealth Password Vault  

---

## 📌 1. Konsep Produk & Masalah
* **Permasalahan**: Pengelola kata sandi cloud rentan terhadap kebocoran database terpusat, sedangkan pengelola lokal biasa meninggalkan peninggalan data forensik di piringan disk.
* **Solusi**: Stealth Vault mengisolasi dekripsi data hanya pada RAM (*RAM-only execution*), menyediakan injeksi registry dynamic shortcut (`Win + R`), serta melakukan sinkronisasi P2P dua arah berbasis CRDT tanpa server terpusat.
* **Sasaran Pengguna**: Mahasiswa, praktisi keamanan siber, dan pengguna yang membutuhkan perlindungan privasi tinggi.

---

## 🚀 2. Fitur Awal Milestone 1 (v0.1)
1. **Dashboard Vault & Health Score**: Tampilan manajemen kredensial berdasarkan kategori (*Kampus, Pekerjaan, Sosmed, Keuangan, Lainnya*) beserta pemantauan kesehatan password.
2. **Formulir Kredensial & Validasi Client-Side**: Form interaktif terkontrol dilengkapi generator password acak 16-bit, indikator kekuatan password real-time, dan aturan proteksi *reuse* 5 kata sandi terakhir.
3. **Pengaturan Stealth & Win+R Registry**: Fitur pengubahan kata kunci alias panggilan Windows (`Win + R`) secara dinamis.
4. **Modal P2P Sync & QR Scanner**: Komponen modal interaktif untuk pairing QR Code dan sinkronisasi data antarperangkat (PC ⇄ Mobile Android).
5. **Antarmuka Responsif & Aksesibel**: Tata letak teroptimasi untuk ukuran Ponsel (≤ 640px), Tablet (768px), dan Desktop (≥ 1024px) dengan skor Lighthouse Accessibility ≥ 85.

---

## 🛠️ 3. Stack Teknologi
* **Frontend**: React 19, Tailwind CSS v4, Lucide React (`app-gui/src/`)
* **Backend Bridge**: Tauri 2 Framework (`app-gui/src-tauri/`)
* **Pemeriksaan Tipe Data**: JSDoc (`checkJs: true` via `jsconfig.json` / `npx tsc --noEmit`)

---

## 📁 4. Pemetaan Struktur Kode Sumber Proyek
```text
password-manager-stealth/
├── app-gui/                      # Frontend GUI Utama (React + Tauri 2)
│   ├── src/
│   │   ├── components/           # Komponen Reusable
│   │   │   ├── P2pModal.jsx      # Modal Tampilan QR Code Pairing P2P PC
│   │   │   └── QrScannerModal.jsx# Modal Kamera Pemindai QR Code Mobile
│   │   ├── App.jsx               # Entry Point Routing Dual-Mode (PC / Mobile)
│   │   ├── AppPC.jsx             # Antarmuka Utama Desktop (Dashboard, Form, Settings)
│   │   ├── AppMobile.jsx         # Antarmuka Utama Mobile / Android
│   │   └── main.jsx              # React Entry Point & Tailwind CSS
│   └── src-tauri/                # Backend Rust Tauri (lib.rs, commands.rs)
├── browser-extension/            # Unpacked Chrome Extension (Auto-detect & Sync)
├── docs/                         # Dokumentasi Proyek Terisolasi per Matkul
│   ├── keamanan-komputasi-siber/ # Modul KKS
│   ├── kriptografi/              # Modul Kriptografi
│   └── pemrograman-web-aplikasi/ # Modul PAW
│       └── pekan3/               # Tempat Berkas README.md, AI_LOG.md, dan Screenshot
├── installer/                    # Source Code Smart Installer CLI
└── launcher/                     # Source Code Stealth Launcher Win+R