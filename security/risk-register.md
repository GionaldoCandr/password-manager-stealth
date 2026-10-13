# Risk Register & Action Plan

Dokumen ini memuat analisis risiko (Likelihood x Impact) berdasarkan kondisi riil produk Stealth Password Vault serta pemetaan rencana kontrol ke Tugas 2 dan Tugas 3.

## 1. Skala Penilaian
* **Likelihood (L):** 1 (Very Low) - 5 (Very High)
* **Impact (I):** 1 (Very Low) - 5 (Very High)
* **Risk Score:** L x I (1 - 25)

## 2. Risk Assessment Table

| Risk ID | Threat ID | Control Saat Ini | L | Alasan Likelihood | I | Alasan Impact | Risk Score | Prioritas | Response | Rencana Kontrol | Pemetaan Tugas |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- | :---: | :---: | :---: | :--- | :--- |
| **R-01** | **T-05** | Dekripsi RAM terbatas | 3 | Diperlukan akses lokal OS untuk dump RAM, namun proses Rust berjalan terus saat unlocked. | 5 | Plaintext password dan kunci 256-bit bocor total ke attacker. | **15** | **Ya (#1)** | Mitigate | Implementasi `zeroize` pada struct RAM, pembatasan password history (maks 5), dan auto-lock timer 180 detik. | **Tugas 2** (System Hardening) |
| **R-02** | **T-01** | Port HTTP 14201 terbuka lokal | 4 | Port loopback mudah dipindai oleh skrip atau aplikasi lain yang berjalan di PC. | 4 | Attacker dapat menyuntikkan data vault palsu ke dalam sistem. | **16** | **Ya (#2)** | Mitigate | Penerapan token autentikasi Win+R dinamis pada header request & penanganan ketat CORS Preflight (OPTIONS). | **Tugas 2** (Access Control) |
| **R-03** | **T-03** | Jalur P2P Wi-Fi lokal | 3 | Mencegat UDP port 14202 membutuhkan posisi man-in-the-middle di Wi-Fi yang sama. | 5 | Transaksi byte data kata sandi yang disinkronkan dapat dibaca/diubah. | **15** | **Ya (#3)** | Mitigate | Enkripsi simetris end-to-end AES-256-GCM dengan Nonce acak 96-bit dan validasi QR pairing token. | **Tugas 3A** (Jaringan & Data) |
| **R-04** | **T-09** | Registri `HKCU` tidak dikunci | 4 | Kunci registri `HKCU` dapat diubah oleh proses apa pun yang berjalan pada privilege user biasa. | 3 | Perintah `Win+R` mengeksekusi biner jahat alih-alih Stealth Vault. | **12** | **Ya (#4)** | Mitigate | Pemeriksaan hash sha256 biner target dan verifikasi integritas subkey registri secara berkala saat launcher start. | **Tugas 2** (System Hardening) |
| **R-05** | **T-10** | Algoritma CRDT LWW standar | 3 | Perangkat P2P terhubung yang sudah di-pair dapat memanipulasi payload JSON P2P. | 4 | Kata sandi asli di PC dapat tertimpa permanen oleh data palsu berkode waktu masa depan. | **12** | **Ya (#5)** | Mitigate | Penerapan Clock Drift Check (toleransi max 5 menit) & pembatasan mutasi data berbasis otentikasi pairing. | **Tugas 3B** (Detection & Response) |
| **R-06** | **T-02** | File ADS lokal | 2 | File ADS tersembunyi (+h +s +r), sulit ditemukan malware biasa tanpa path spesifik. | 5 | Struktur biner terenkripsi rusak, mengakibatkan kegagalan dekripsi total. | **10** | Tidak | Accept | Melakukan verifikasi checksum AES-GCM saat load; menolak data jika terdeteksi tamper. | Final Project |
| **R-07** | **T-06** | Clipboard OS Windows | 4 | Aplikasi background biasa di OS bisa membaca clipboard tanpa indikator khusus. | 2 | Hanya 1 password yang tersalin di clipboard yang terekspos. | **8** | Tidak | Mitigate | Auto-clear clipboard memory dalam hitungan mundur 15 detik setelah tombol copy diklik. | Tugas 2 |
| **R-08** | **T-07** | Extension Manifest V3 | 2 | Manifest V3 mengisolasi Service Worker dari pemicu script di halaman web utama. | 3 | Kredensial satu situs yang sedang di-input pengguna dapat terekspos. | **6** | Tidak | Accept | Menggunakan Message Passing tertutup dari `content.js` ke `background.js`. | Final Project |
| **R-09** | **T-08** | Server `tiny_http` lokal | 3 | Aplikasi lokal bisa membuat loop request POST ke `127.0.0.1:14201`. | 2 | Aplikasi desktop hang sementara, tidak ada data yang bocor. | **6** | Tidak | Mitigate | Menerapkan rate limiting pada endpoint `/sync-pass`. | Tugas 3A |
| **R-10** | **T-04** | Sync P2P Mobile | 2 | Terjadi jika aplikasi crash saat menulis flag Tombstone. | 2 | Terjadi inkonsistensi sementara pada daftar kata sandi terhapus. | **4** | Tidak | Accept | Sinkronisasi ulang otomatis pada sesi P2P berikutnya. | Final Project |