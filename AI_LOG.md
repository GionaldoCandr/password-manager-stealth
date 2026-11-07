# LOG PENGGUNAAN KECERDASAN BUATAN (AI_LOG.md)
## Stealth Password Vault Ecosystem v1.0.0
**Mata Kuliah:** Kriptografi (052357), Keamanan Komputasi dan Siber (052353), Pengembangan Aplikasi Web (052355/052356)  
**Mahasiswa:** Gionaldo Chandrawansah (NIM: 105224031)  
**Dosen Pengampu:** Muhammad Fakhrul Safitra, S.Kom., M.Kom.  
**Program Studi:** Ilmu Komputer, Universitas Pertamina  

---

### Pernyataan Kejujuran Akademik
Dokumen ini disusun sebagai wujud transparansi, akuntabilitas, dan integritas akademik dalam pemanfaatan alat bantu Kecerdasan Buatan (AI) selama pengerjaan Final Project terintegrasi. Mahasiswa memahami sepenuhnya seluruh arsitektur, basis kode, mekanisme kriptografi, dan kontrol keamanan yang diimplementasikan, serta bertanggung jawab penuh atas setiap baris kode pada demonstrasi individual.

---

### Catatan Penggunaan AI per Tahapan Pengembangan

| No | Tanggal & Sesi | Alat AI | Peran & Prompt Permintaan | Saran / Kode yang Dihasilkan AI | Verifikasi & Keputusan Mahasiswa |
| :---: | :---: | :---: | :--- | :--- | :--- |
| 1 | Pekan 03–04 | Antigravity AI / Claude 3.5 | Merancang skema Zod 4 dan Server Actions pada Next.js | Menyarankan struktur validasi sintaks form dan pemanggilan `cookies()` HttpOnly | **Diverifikasi & Disesuaikan:** Mahasiswa memisahkan validasi semantik (pengecekan hash) ke dalam Server Action terpisah agar tidak membocorkan logika ke client bundle. |
| 2 | Pekan 06–08 | Antigravity AI | Merancang algoritma sinkronisasi P2P multi-device | Menyarankan penggunaan model CRDT (Conflict-free Replicated Data Type) Last-Write-Wins | **Diverifikasi & Diuji:** Mahasiswa menuliskan fungsi `merge_crdt_items` di Rust dan menambahkan penanganan timestamp millisecond UTC agar tahan jeda clock skew. |
| 3 | Pekan 11–12 | Antigravity AI | Pemetaan register risiko ke taktik MITRE ATT&CK | Mengidentifikasi teknik T1056.001 (Keylogging), T1005 (Data from Local System), dan T1070.004 (File Deletion) | **Diverifikasi:** Mahasiswa mencocokkan teknik dengan arsitektur memori in-memory volatile store dan launcher `Win + R`. |
| 4 | Pekan 14–15 | Antigravity AI | Penandatanganan biner APK Android dan Zipalign | Menyusun draft skrip PowerShell untuk memanggil `apksigner` dan `zipalign` Android Build-Tools | **Diverifikasi:** Mahasiswa memvalidasi path SDK lokal, membuat keystore debug resmi, dan menguji instalasi langsung pada perangkat smartphone fisik. |
| 5 | Pekan 16 | Antigravity AI | Pemecahan masalah error `localhost:1420` WebView2 pada PC | Mengidentifikasi bahwa biner ter-compile via raw `cargo build` bukan `tauri build` | **Diverifikasi & Diperbaiki:** Mahasiswa menjalankan kompilasi ulang dengan `tauri build --no-bundle` sehingga seluruh frontend assets ter-bundle offline di dalam binary `.exe`. |
| 6 | Pekan 16 | Antigravity AI | Penyusunan test suite otomatis di Rust (`cargo test`) | Menyarankan 8 skenario pengujian unit & integrasi untuk `lib.rs` | **Diverifikasi:** Mahasiswa memastikan terdapat 3 uji negatif bermakna dan 1 uji kritis integritas data (`test_persistent_state_roundtrip_integrity`) yang lulus 100%. |
| 7 | Pekan 06 | Antigravity AI | Perumusan matriks kontrol akses, pengerasan container Docker, dan analisis audit Lynis/Trivy (Tugas 2 KKS) | Menyarankan struktur matriks 4 peran dengan rasio uji negatif 50%, parameter `cap_drop: ALL`, dan format CycloneDX SBOM | **Diverifikasi & Disesuaikan:** Mahasiswa memvalidasi parameter fungsi hash lambat Argon2id ($m=19\text{ MiB}, t=2, p=1$), memastikan `sudo sshd -T` mematikan password dan root login, serta memastikan image akhir bebas kerentanan CRITICAL (0 Critical). |

---

### Bagian Kode yang Ditolak atau Diubah dari Saran AI
1. **Penyimpanan Kunci Kriptografi di LocalStorage Browser:** AI sempat menyarankan penyimpanan token sinkronisasi pada LocalStorage extension; mahasiswa menolaknya dan menggantinya dengan in-memory session variable untuk mencegah pencurian token oleh ekstensi lain (*Cross-Extension Scripting*).
2. **Penggunaan Cloud WebSocket Relay:** AI awalnya menyarankan penggunaan WebSocket server pihak ketiga untuk sinkronisasi HP-PC; mahasiswa menolak skema cloud tersebut dan mempertahankan protokol murni P2P Wi-Fi Socket (*Zero-Knowledge, Zero-Cloud*) demi kedaulatan privasi data pengguna.

