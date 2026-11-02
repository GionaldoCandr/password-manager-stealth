# Teks Daring Pengumpulan Tugas 2
## Enkripsi Terautentikasi dan Integritas Data (Mata Kuliah Kriptografi)

Salin seluruh teks di bawah ini ke dalam kolom teks daring penyerahan tugas di LMS e-learning:

---

**Tugas 2 — Enkripsi Terautentikasi dan Integritas Data**  
- **Nama Mahasiswa:** Gionaldo Chandrawansah  
- **NIM:** 105224031  
- **Mata Kuliah:** Kriptografi (052357)  
- **Produk:** Password Stealth Vault  
- **Tautan Repositori:** https://github.com/GionaldoCandr/password-manager-stealth  
- **Milestone Tag:** `v0.2`  
- **Tautan Tag v0.2:** https://github.com/GionaldoCandr/password-manager-stealth/tree/v0.2  
- **Direktori Berkas Tugas 2:** `docs/kriptografi/pekan6/`

---

### Ringkasan Pemenuhan Rubrik Penilaian R2 (100 Poin)

#### 1. Pemilihan Mekanisme & Dokumen Keputusan (K1 - 20 Poin)
- Dokumen lengkap tersedia pada berkas `docs/kriptografi/pekan6/KEPUTUSAN.md`.
- **Pemetaan Kebutuhan $\rightarrow$ Mekanisme $\rightarrow$ Alasan:**
  1. *Kerahasiaan & Keutuhan Password Brankas:* AES-256-GCM (AEAD) dipilih karena memberikan kerahasiaan dan integritas terautentikasi secara simultan dalam 1 operasi matematis terakselerasi hardware. Menolak ECB (membocorkan pola) dan CBC (rentan *padding oracle*).
  2. *Proteksi Master Password:* PBKDF2-HMAC-SHA256 (600.000 iterasi) dengan salt CSPRNG 16-byte untuk memperlambat serangan *brute-force* / GPU dictionary.
  3. *Key Separation:* HKDF (RFC 5869 berbasis SHA-256) untuk memisahkan kunci enkripsi vault (`stealth-vault-encryption-key-v1`) dan kunci autentikasi sekunder (`stealth-vault-auth-key-v1`) dari master secret tunggal.
  4. *Pencegahan Ciphertext Transplant:* Pengikatan konteks data terasosiasi (AAD: `situs:username`) pada perhitungan GMAC.

#### 2. Implementasi & Parameter Terdokumentasi (K2 - 30 Poin)
- Pustaka terpelihara: `cryptography` (pyca/cryptography).
- **Spesifikasi Parameter:**
  - *Panjang Kunci:* 256 bit (32 byte).
  - *Nonce / IV:* 96 bit (12 byte) dibangkitkan acak via CSPRNG `os.urandom(12)` unik untuk setiap operasi enkripsi (mencegah bahaya Two-Time Pad).
  - *Authentication Tag:* 128 bit (16 byte) via GMAC.
  - *Associated Data (AAD):* `situs:username` dalam bytes UTF-8.
  - *Format Payload:* Base64 dari `Nonce (12B) || Ciphertext || Tag (16B)`.

#### 3. Penanganan Masukan dan Kunci (K3 - 15 Poin)
- **Zero Secrets in Repository:** Kunci dibangkitkan dengan CSPRNG dan dikelola melalui *Environment Variable* sistem (`STEALTH_VAULT_MASTER_KEY`). Berkas rahasia seperti `.env` dan `*.key` dikecualikan secara ketat oleh `.gitignore`. Tidak ada secrets/data pribadi yang dikomit ke repositori.
- **Fail-Closed Input Validation:** Masukan divalidasi ketat (menolak string kosong atau tipe non-string dengan `ValueError`). Kesalahan integritas (bit-flip, tag korup, AAD mismatch, atau wrong key) langsung memicu penolakan seketika dengan `InvalidTag` tanpa pernah mengembalikan plaintext rusak.

#### 4. Pengujian dan Respons Kondisi Tidak Sah (K4 - 25 Poin)
Dibuat 7 skenario pengujian unit komprehensif pada `docs/kriptografi/pekan6/test_tugas2.py` (**100% lulus / 7 passed in 0.29s**):
1. **Skenario 1 (Positif):** Enkripsi dan dekripsi roundtrip berhasil utuh.
2. **Skenario 2 (Negatif):** Modifikasi 1 bit ciphertext (*bit-flipping*) ditolak (`InvalidTag`).
3. **Skenario 3 (Negatif):** Modifikasi tag autentikasi 128-bit ditolak (`InvalidTag`).
4. **Skenario 4 (Negatif):** Pemindahan ciphertext ke akun/situs lain (AAD mismatch) ditolak (`InvalidTag`).
5. **Skenario 5 (Negatif):** Dekripsi dengan kunci yang salah ditolak (`InvalidTag`).
6. **Skenario 6 (Batas):** Masukan kosong atau format Base64 rusak gagal tertutup (`ValueError`).
7. **Skenario 7 (Kriptografis):** Uji 500 nonce berturut-turut menghasilkan 500 nilai unik tanpa tabrakan.

#### 5. Dokumentasi, Demonstrasi, dan AI_LOG.md (K5 - 10 Poin)
- `README.md`: Dokumentasi lengkap struktur modul, tabel parameter, log uji pytest, dan panduan demonstrasi 3 menit (lokasi penyimpanan kunci & bahaya *nonce reuse*).
- `AI_LOG.md`: Log audit transparan perancangan modul, instruksi prompt, verifikasi NIST SP 800-38D, dan pernyataan pemahaman kode.
