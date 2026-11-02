# MATRIKS KETERLACAKAN SISTEM TERINTEGRASI (TRACEABILITY MATRIX)
## Stealth Password Vault Ecosystem v1.0.0
**Mata Kuliah Terintegrasi:**
- **Kriptografi (052357)** · Dosen: Muhammad Fakhrul Safitra, S.Kom., M.Kom.
- **Keamanan Komputasi dan Siber (052353)** · Dosen: Muhammad Fakhrul Safitra, S.Kom., M.Kom.
- **Pengembangan Aplikasi Web (052355 / 052356)** · Dosen: Muhammad Fakhrul Safitra, S.Kom., M.Kom.

---

### Struktur Keterlacakan (Kebutuhan → Fitur → Kriptografi → Kontrol Keamanan → Bukti Uji)

| ID | Kebutuhan Pengguna / Sistem | Fitur Produk & Platform | Mekanisme Kriptografi | Kontrol Keamanan (Register Risiko) | Bukti Uji & Verifikasi |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **K-01** | Pengguna dapat menyimpan kredensial akun secara rahasia dan aman tanpa jejak plain-text di disk | Form Tambah Password, Vault Storage (`app-gui`, `MobilePMSV`, `Extension`) | Enkripsi simetris AES-256-GCM / ChaCha20-Poly1305 untuk payload vault; Master Key Derivation | **R-01** (Pencurian file disk forensik / T1005): File `vault_store.bin` disimpan di SystemCache tersembunyi dengan enkripsi penuh | `test_persistent_state_roundtrip_integrity` (LULUS); Uji inspeksi biner hexdump |
| **K-02** | Hanya pemilik Master Password yang sah yang dapat mendekripsi dan mengakses brankas | Master Password Unlock Screen & CLI Launcher | Derivasi kunci KDF (Key Derivation Function) berbasis PBKDF2/Argon2id dengan Salt dinamis | **R-02** (Brute-force offline / T1110): Komparasi hash master password resisten time-attack; memori segera dibersihkan saat sesi ditutup | `test_tampered_json_deserialization_fails` (LULUS); Simulasi auth salah ditolak rollback |
| **K-03** | Aplikasi desktop tidak boleh meninggalkan jejak di Start Menu, Taskbar, atau Desktop | Stealth Windows Launcher via `Win + R` (`launcher.exe`) | Key Verification Token & SHA-256 Digest | **R-03** (Forensic inspection / T1083): Registrasi dinamis Windows App Paths `HKCU\...\App Paths\RunPass.exe` tanpa ikon desktop | Uji jalan via Win+R `RunPass`; Verifikasi registry key HKCU |
| **K-04** | Installer harus memasang payload lalu menghapus file installer itu sendiri tanpa jejak | Dynamic Setup Wizard (`PcPMSV-Installer.exe` / `smart_installer.exe`) | Payload Embedding via Rust `include_bytes!` makro | **R-04** (Artefak installer disita / T1070.004): Self-deletion asinkronus via CMD timeout del process | Uji instalasi: biner installer terhapus otomatis 2 detik pasca sukses pasang |
| **K-05** | Pengguna dapat menyinkronkan data antar-perangkat PC dan HP Android secara peer-to-peer tanpa cloud | P2P Wi-Fi Sync Server (Port 14202) & Mobile QR Scanner | Autentikasi Zero-Knowledge Bearer Token; CRDT (Conflict-free Replicated Data Type) Last-Write-Wins | **R-05** (Man-in-the-Middle / T1557): Port lokal hanya menerima bearer sync token valid; tidak ada relay cloud pihak ketiga | `test_merge_crdt_conflict_resolution_newer_wins`, `test_merge_crdt_older_timestamp_ignored` (LULUS) |
| **K-06** | Browser Extension dapat mengisi otomatis dan menyimpan sandi baru secara instan ke PC | Browser Extension MV3 & Local HTTP IPC (Port 14201) | Header Authorization Token + Localhost Bound Socket IPC | **R-06** (Cross-Extension Stealing / T1552): Socket IPC terikat hanya pada loopback IP `127.0.0.1:14201` dengan CORS restriktif | Uji tangkap kredensial web dan sync instan ke desktop |
| **K-07** | Pengguna dapat memantau kesehatan sandi, rasio duplikasi sandi, dan kekuatan kombinasi | Password Health Monitoring Dashboard & Dynamic Progress Bar | Penghitungan Entropi Shannon (Bit Strength) & Deteksi Hash Duplikasi Identik | **R-07** (Credential Stuffing / T1110.004): Peringatan dini penggunaan sandi sama di berbagai platform perbankan/sosmed | `test_generate_password_symbols_included`, `test_generate_password_length_constraint` (LULUS) |
| **K-08** | Aplikasi Android berjalan penuh tanpa terpotong navigasi sistem dan responsif terhadap orientasi | Android Immersive Mobile App (`MobilePMSV.apk`) | Keamanan Storage Terisolasi Sandboxed Scoped Storage Android | **R-08** (Mobile App Reverse Engineering / T1407): APK ditandatangani Signature Scheme v2/v3 + Zipalign 4-byte | Uji instalasi APK via WhatsApp/USB: Sukses parse & install; UI immersive |
| **K-09** | Hub web menyediakan dokumentasi interaktif, simulasi lab, dan verifikasi kurikulum | Next.js 16 Web Hub (`web-password-stealth-vault`) | Cookie HTTP Session HttpOnly + SameSite=Lax; Validasi Zod 4 di Server Actions | **R-09** (XSS & CSRF pada Web / OWASP A01/A03): Server Actions memvalidasi input secara skema sintaks dan semantik | Uji build Next.js sukses; Form Zod 4 menolak input invalid |
| **K-10** | Tanggap darurat insiden (Incident Response) dan zeroization memori saat serangan terdeteksi | Emergency Panic Memset & Retest Audit | Pembersihan memori in-memory (`zeroize` / `memset 0`) pada volatile buffer | **R-10** (Cold Boot Attack / Memory Dumping / T1003): Tidak ada kredensial mengendap di pagefile swap atau residual RAM | Playbook PB-01 Tanggap Darurat & Uji Panic Memset |

---

### Verifikasi Kelengkapan 5 Butir Integrasi (RPS Pekan 16):
1. **(a) Fitur Inti Aplikasi Berjalan:** Terbukti berjalan pada PC (`PcPMSV.exe`), Android (`MobilePMSV.apk`), Extension, dan Web Hub.
2. **(b) Mekanisme Kriptografi Terapan:** AES-256-GCM, PBKDF2/Argon2id, CRDT LWW Timestamp, Entropi Password, Tokenized P2P Sync.
3. **(c) Kontrol Keamanan Merujuk Register Risiko:** Setiap kontrol merujuk ID risiko R-01 s.d R-10 dan taktik MITRE ATT&CK.
4. **(d) Uji End-to-End Pada Rilis Bersama:** Seluruh komponen diuji pada versi rilis v1.0.0 (`cargo test` lulus 100%, Next.js build sukses).
5. **(e) Matriks Keterlacakan Lengkap:** Tersedia dan tertelusur pada dokumen ini.

