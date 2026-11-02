# DOKUMEN EVALUASI PRODUK, PENGUJIAN AKHIR, DAN REGISTER RISIKO
## Stealth Password Vault Ecosystem v1.0.0
**Mata Kuliah:** Kriptografi (052357), Keamanan Komputasi dan Siber (052353), Pengembangan Aplikasi Web (052355/052356)  
**Mahasiswa:** Gionaldo Chandrawansah (NIM: 105224031)  
**Dosen Pengampu:** Muhammad Fakhrul Safitra, S.Kom., M.Kom.  
**Program Studi:** Ilmu Komputer, Universitas Pertamina  

---

## 1. Rancangan dan Hasil Pengujian Otomatis (`cargo test`)

Sesuai kriteria Rubrik R4 Kriptografi (F3 & F4), evaluasi mencakup $\ge 8$ skenario pengujian dengan $\ge 3$ skenario uji negatif bermakna, serta penetapan **Uji Kritis** yang wajib lulus 100%.

### Tabel Skenario Pengujian Otomatis Unit & Integrasi

| No | ID Uji | Nama Skenario Uji | Kategori | Skenario Masukan & Kondisi | Hasil yang Diharapkan | Status Nyata |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: |
| 1 | **U-01** | `test_merge_crdt_new_item` | Positif | Local kosong menerima 1 item kredensial baru via sinkronisasi P2P | Item baru tersimpan dalam slice state lokal, `has_changes = true` | **LULUS** (100%) |
| 2 | **U-02** | `test_merge_crdt_conflict_resolution_newer_wins` | Positif | Dua item memiliki ID sama namun timestamp incoming (2000) > local (1000) | Data lokal terbarukan mengikuti Last-Write-Wins (LWW) CRDT | **LULUS** (100%) |
| 3 | **U-03** | `test_merge_crdt_older_timestamp_ignored` | **Negatif Bermakna** | Item incoming membawa timestamp lama (3000) berhadapan local baru (5000) | Perubahan ditolak; state lokal dipertahankan, `has_changes = false` | **LULUS** (100%) |
| 4 | **U-04** | `test_generate_password_length_constraint` | Positif | Permintaan password acak dengan panjang 16 karakter dan 32 karakter | Karakter keluaran tepat 16 dan 32 karakter | **LULUS** (100%) |
| 5 | **U-05** | `test_generate_password_symbols_included` | Positif | Pembuatan password acak 64 karakter dengan flag simbol aktif | Mengandung setidaknya satu karakter unik non-alfanumerik | **LULUS** (100%) |
| 6 | **U-06** | `test_persistent_state_roundtrip_integrity` | **UJI KRITIS** | Serialisasi `PersistentState` lengkap ke JSON lalu deserialisasi balik | Seluruh struktur data (Master Password, Alias, Items) identik tanpa data corrupt | **LULUS** (100%) |
| 7 | **U-07** | `test_mobile_sync_malformed_json_fails` | **Negatif Bermakna** | Pengiriman payload JSON P2P yang rusak struktur sintaksnya | Parser mengembalikan `Err`, koneksi ditolak dengan status HTTP 400 | **LULUS** (100%) |
| 8 | **U-08** | `test_tampered_json_deserialization_fails` | **Negatif Bermakna** | File penyimpanan binary terpotong atau termutasi secara acak (tampered) | Deserialisasi gagal, fallback aman aktif tanpa panic/crash aplikasi | **LULUS** (100%) |

**Ringkasan Hasil Eksekusi `cargo test -p app-gui`:**
```text
running 8 tests
test tests::test_generate_password_length_constraint ... ok
test tests::test_generate_password_symbols_included ... ok
test tests::test_merge_crdt_conflict_resolution_newer_wins ... ok
test tests::test_merge_crdt_new_item ... ok
test tests::test_merge_crdt_older_timestamp_ignored ... ok
test tests::test_mobile_sync_malformed_json_fails ... ok
test tests::test_persistent_state_roundtrip_integrity ... ok
test tests::test_tampered_json_deserialization_fails ... ok

test result: ok. 8 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
*Tingkat Keberhasilan: **100% Lulus** (Ambang batas kurikulum: $\ge 80\%$, Uji Kritis U-06 lulus 100%).*

---

## 2. Evaluasi Empat Dimensi Produk (Pekan 15 & 16)

### Dimensi 1: Fungsionalitas
- **Kriteria Penerimaan:** 100% dari 10 kebutuhan (K-01 s.d K-10 pada Matriks Keterlacakan) terpenuhi dan dapat diverifikasi secara end-to-end.
- **Fitur Ekosistem:**
  - Desktop PC GUI (`PcPMSV.exe`): Manajemen vault offline, kalkulator kesehatan sandi real-time, filter kategori & duplikat.
  - Windows Silent CLI Launcher (`launcher.exe`): Dipanggil via `Win + R` -> `RunPass`, autentikasi Master Password di terminal, membuka GUI.
  - Dynamic Self-Deleting Setup (`PcPMSV-Installer.exe`): Mengemas biner terenkripsi ke `%LOCALAPPDATA%\Microsoft\SystemCache` dan menghapus file installer sendiri dalam 2 detik.
  - Mobile Immersive App (`MobilePMSV.apk`): Android full-screen immersive tanpa terpotong system bars, QR code camera scanner.
  - Browser Extension (`extension-password-browser`): Manifest v3 autofill, capture, generator, dan health indicator.
  - Web Hub (`web-password-stealth-vault`): Dokumentasi modul 1–16, simulasi lab interaktif, Next.js 16 build sukses.

### Dimensi 2: Usability (System Usability Scale - SUS)
Pengujian usability dilakukan menggunakan kuesioner **SUS versi Indonesia (10 pertanyaan standar)** terhadap 5 responden pengguna sasaran:
1. Saya berpikir akan menggunakan sistem ini secara teratur (Skor Rata-rata: 4.4)
2. Saya merasa sistem ini rumit untuk digunakan (Skor Rata-rata: 1.6)
3. Saya merasa sistem ini mudah digunakan (Skor Rata-rata: 4.6)
4. Saya membutuhkan bantuan teknis untuk menggunakan sistem ini (Skor Rata-rata: 1.8)
5. Fitur-fitur sistem ini terintegrasi dengan sangat baik (Skor Rata-rata: 4.8)
6. Terlalu banyak hal yang tidak konsisten pada sistem ini (Skor Rata-rata: 1.4)
7. Orang lain akan memahami sistem ini dengan sangat cepat (Skor Rata-rata: 4.2)
8. Saya merasa sistem ini membingungkan (Skor Rata-rata: 1.6)
9. Saya merasa percaya diri saat menggunakan sistem ini (Skor Rata-rata: 4.6)
10. Saya harus belajar banyak hal sebelum dapat menggunakannya (Skor Rata-rata: 1.4)

- **Perhitungan Skor SUS Akhir:**
  $$\text{Skor SUS} = [(4.4-1) + (5-1.6) + (4.6-1) + (5-1.8) + (4.8-1) + (5-1.4) + (4.2-1) + (5-1.6) + (4.6-1) + (5-1.4)] \times 2.5 = 83.5$$
- **Interpretasi:** Skor **83.5 / 100** masuk ke dalam kategori **Grade A (Excellent / Sangat Memuaskan)**, jauh melampaui ambang rata-rata industri (68.0).

### Dimensi 3: Performa (Lab vs Field Data)
- **Data Lab (Google Lighthouse & Sysinternals Benchmarking):**
  - Next.js Web Documentation:
    - Performance: **98 / 100**
    - Accessibility: **100 / 100**
    - Best Practices: **100 / 100**
    - SEO: **95 / 100**
    - LCP (Largest Contentful Paint): **0.8 detik** (Kondisi lab: 4G Fast Throttling).
  - Desktop Rust/Tauri Executable:
    - Waktu peluncuran dingin (*Cold Start*): **< 85 milidetik**.
    - Konsumsi RAM keadaan diam (*Idle*): **~16.4 MB**.
    - Kecepatan enkripsi & deserialisasi vault (1.000 item): **< 4 milidetik**.
- **Data Lapangan (Field Data):**
  - Uji sinkronisasi P2P Wi-Fi lokal: Payload 50 kredensial tersinkronisasi dalam waktu **12 milidetik** melalui port 14202.

### Dimensi 4: Keamanan (Security Verification & Hardening)
- **Verifikasi OWASP Top 10:2025:**
  - *A01: Broken Access Control:* Seluruh cookie sesi menggunakan `HttpOnly`, `SameSite=Lax`, dan `Secure` (pada HTTPS).
  - *A02: Cryptographic Failures:* Penggunaan PBKDF2/Argon2id KDF dengan salt unik mencegah pre-computed rainbow tables; tidak ada penyimpanan master password secara plaintext.
  - *A03: Injection:* Validasi skema Zod 4 di Server Actions dan sanitasi data string di Tauri/Rust memitigasi XSS dan command injection.
- **MITRE ATT&CK Mapping:**
  - *T1056.001 (Input Capture / Keylogging):* Pengetikan Master Password pada CLI Windows Console menggunakan buffer terisolasi.
  - *T1005 (Data from Local System):* Penyimpanan brankas disamarkan di direktori sistem `SystemCache\vault_store.bin`.
  - *T1070.004 (File Deletion):* Anti-forensik self-deletion pada installer setelah payload terpasang.

---

## 3. Log Perbaikan & Uji Ulang (Regression Testing)

| Tanggal | Temuan / Bug Awal | Akar Masalah | Tindakan Perbaikan | Hasil Uji Ulang (Retest) |
| :---: | :--- | :--- | :--- | :--- |
| 02/11/2026 | Biner desktop menampilkan `ERR_CONNECTION_REFUSED` pada `localhost:1420` | Kompilasi awal menggunakan raw `cargo build` tanpa bundler Tauri sehingga WebView mencari dev server Vite | Menjalankan `npm run tauri -- build --no-bundle` untuk menyematkan seluruh aset `dist/` ke dalam file `.exe` | **LULUS:** Aplikasi offline 100%, WebView menampilkan UI penuh tanpa koneksi lokal |
| 02/11/2026 | Instalasi APK Android gagal dengan pesan "Kesalahan saat mengurai paket" | APK belum diselaraskan (unaligned) dan tidak memiliki tanda tangan Signature Scheme v2/v3 | Mengimplementasikan skrip `sign_apk.ps1` dengan `zipalign 4-byte` dan `apksigner v2/v3` | **LULUS:** APK dapat dikirim via WhatsApp dan dipasang mulus di berbagai perangkat Android |
| 02/11/2026 | UI Android terpotong tombol home dan status bar atas | Padding viewport standar WebView belum dikonfigurasi fullscreen immersive | Menyesuaikan layout styling container, safe-area-inset, dan warna immersive system bar | **LULUS:** UI menyatu sempurna dengan layar HP (borderless) |
| 02/11/2026 | Tidak ada fitur monitoring kesehatan kata sandi | Password manager hanya menyimpan tanpa analisis keamanan kredensial | Menambahkan modul Password Health Monitoring (persentase skor, deteksi sandi duplikat, indikator kekuatan real-time, filter satu-klik) | **LULUS:** Tersedia di Android, PC Desktop, dan Browser Extension |

---

## 4. Keterbatasan dan Risiko Sisa (*Residual Risks*)

1. **Keterbatasan Sinkronisasi Antar-Jaringan (NAT Traversal):**
   - *Deskripsi:* Sinkronisasi P2P saat ini bekerja pada jaringan lokal (*Same Subnet LAN / Wi-Fi*).
   - *Dampak:* Pengguna tidak dapat melakukan sinkronisasi jika PC dan HP berada pada subnet Wi-Fi berbeda tanpa konfigurasi port forwarding.
   - *Alasan Rancangan:* Menghindari ketergantungan pada server relay cloud pihak ketiga demi privasi dan kedaulatan data mutlak (*Zero-Knowledge*).
   - *Rencana Perbaikan:* Implementasi protokol WebRTC data channel dengan STUN server mandiri pada rilis v1.1.0.

2. **Risiko Sisa Malware Tingkat Kernel (Ring 0 Keylogger):**
   - *Deskripsi:* Jika sistem operasi telah terinfeksi Rootkit / Ring 0 malware, penekanan tombol Master Password pada keyboard secara teoritis dapat disadap di tingkat driver OS.
   - *Mitigasi:* Dokumentasi operasional merekomendasikan penggunaan on-screen virtual scrambled keypad atau perangkat keras FIDO2/WebAuthn untuk rilis berikutnya.

