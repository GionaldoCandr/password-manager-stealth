# CHANGELOG
Semua perubahan penting pada ekosistem **Stealth Password Vault** didokumentasikan dalam berkas ini.
Format penomoran versi mengikuti pedoman [Semantic Versioning (SemVer)](https://semver.org/).

---

## [1.0.0] - 2026-11-02 (Rilis Bersama Final Project Terintegrasi)

### Ditambahkan (Added)
- **Password Health Monitoring Dashboard:**
  - Perhitungan persentase kesehatan brankas real-time berdasarkan variasi karakter dan entropi.
  - Pendeteksi kata sandi duplikat di berbagai akun layanan (mencegah bahaya credential stuffing).
  - Bar kekuatan kata sandi dinamis pada formulir penambahan sandi (Sangat Lemah, Cukup, Kuat, Sangat Kuat).
  - Filter cepat satu-klik: "Semua", "Duplikat", "Sandi Lemah", dan per Kategori.
- **P2P Wi-Fi Sync Server & Pairing:**
  - Peluncuran HTTP server lokal otomatis pada port `14202` di desktop PC.
  - Generator QR Code pairing dengan token acak unik untuk pairing instan ke HP Android.
  - Algoritma CRDT (Conflict-free Replicated Data Type) Last-Write-Wins (LWW) di Rust untuk penggabungan data nir-konflik.
- **MobilePMSV Android Application:**
  - Pemindai kamera QR Code untuk pairing otomatis dengan IP PC.
  - Tampilan layar penuh (*fullscreen immersive*) tanpa terpotong tombol sistem navigasi Android.
  - Paket APK resmi bertanda tangan Signature Scheme v2 & v3 dengan 4-byte zipalign.
- **Browser Extension (Chrome / Edge / Brave):**
  - Ekstensi Manifest V3 dengan popup interaktif, indikator kesehatan, autofill, dan sinkronisasi ke port 14201.
- **Interactive Documentation & Lab Hub (`web-password-stealth-vault`):**
  - Aplikasi web Next.js 16 App Router dengan panduan instalasi visual, simulasi lab interaktif (Lab 01 s.d 03), dan materi kurikulum 16 pekan terintegrasi.
- **Automated Test Suite:**
  - 8 skenario pengujian otomatis pada `app-gui/src-tauri/src/lib.rs` yang mencakup 3 skenario negatif bermakna dan 1 uji kritis integritas serialisasi data (`cargo test` lulus 100%).

### Diperbaiki (Fixed)
- Memperbaiki masalah WebView2 `ERR_CONNECTION_REFUSED` pada desktop PC dengan melakukan kompilasi penuh menggunakan `tauri build --no-bundle`, menyematkan seluruh aset frontend `dist/` ke dalam biner offline.
- Memperbaiki logo aplikasi di semua platform (PC, Android, Extension) dengan desain stealth elegan tanpa tepi kotak putih (*transparent background*).
- Menghilangkan jejak installer pada sistem setelah instalasi selesai melalui mekanisme *asynchronous timeout self-deletion*.

---

## [0.3.0] - 2026-10-22 (Pekan 13 - Tugas 3)
### Ditambahkan
- API endpoint sinkronisasi lokal dan listener port IPC 14201 untuk komunikasi ekstensi peramban.
- Validasi formulir Server Actions Zod 4 dan session cookie HttpOnly.
- Pendaftaran kata kunci dinamis Windows `Win + R` (`RunPass`).

---

## [0.2.0] - 2026-10-13 (Pekan 6 - Tugas 2)
### Ditambahkan
- Penyimpanan data kredensial persisten `vault_store.bin` di direktori tersembunyi `Microsoft\SystemCache`.
- Fitur CRUD dasar kredensial akun dan generator kata sandi acak.

---

## [0.1.0] - 2026-09-28 (Pekan 3 - Tugas 1)
### Ditambahkan
- Inisialisasi antarmuka pengguna berbasis React, Tailwind CSS, dan komponen tema gelap (*Cyber Stealth UI*).

