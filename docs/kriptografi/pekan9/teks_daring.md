# Teks Daring Pengumpulan Latihan Pekan 9
## Kunci Publik dan Tanda Tangan Digital (Mata Kuliah Kriptografi)

Salin seluruh teks di bawah ini ke dalam kolom teks daring penyerahan latihan di LMS e-learning:

---

**Latihan Pekan 9 — Kunci Publik dan Tanda Tangan Digital**  
- **Nama Mahasiswa:** Gionaldo Chandrawansah  
- **NIM:** 105224031  
- **Mata Kuliah:** Kriptografi (052357) · Semester 5  
- **Dosen Pengampu:** Muhammad Fakhrul Safitra, S.Kom., M.Kom.  
- **Produk Digital:** Stealth Password Vault  
- **Cabang Latihan:** `latihan-9`  
- **Tautan Repositori Cabang:** https://github.com/GionaldoCandr/password-manager-stealth/tree/latihan-9  
- **Direktori Berkas Modul:** `docs/kriptografi/pekan9/`  

---

### 1. Tabel Peran Kunci Produk (4 Kolom Sesuai Ketentuan)

| Kunci | Dipegang (Pemilik) | Untuk Apa | Tempat Simpan |
|---|---|---|---|
| **Ed25519 Privat (256-bit)** | Perangkat Pengirim (Mobile Android / PC Vault) | Menandatangani (*Sign*) paket sinkronisasi P2P dan catatan audit perubahan brankas secara nirsangkal (*non-repudiation*). | Penyimpanan aman lokal perangkat (*Keystore / DPAPI / berkas 600 di luar repositori*). Tidak pernah dikomit ke Git. |
| **Ed25519 Publik (256-bit)** | Perangkat Penerima P2P / Sync Server / Registry | Memverifikasi (*Verify*) keaslian asal perangkat dan keutuhan paket data tanpa memiliki kemampuan memalsukan tanda tangan. | Terdaftar terbuka di repositori, basis data lokal perangkat peer, atau registry publik. |
| **AES-256-GCM (v0.2)** | Perangkat Vault Lokal | Melindungi kerahasiaan (*confidentiality*) dan keutuhan (*integrity*) kata sandi yang tersimpan di brankas. | Diturunkan secara dinamis saat brankas dibuka via KDF; tidak disimpan mentah di disk. |
| **Master Secret / Key** | Pengguna Pemilik Akun | Kunci induk untuk menurunkan kunci simetris dan seed kunci privat asimetris via HKDF. | Disimpan hanya di memori volatil (*RAM*) selama sesi login aktif (*Zero-Disk Exposure*). |

---

### 2. Penjelasan Singkat Alur & Ketepatan Konsep

1. **Pemilihan Algoritma Ed25519 (RFC 8032):**
   - Dipilih karena efisiensi tinggi (kunci publik hanya 32 byte, tanda tangan 64 byte), sangat optimal untuk pertukaran paket sinkronisasi P2P antar-perangkat dibanding RSA-3072 (384 byte).
   - Bersifat deterministik: kebal terhadap serangan kebocoran kunci akibat pengulangan nonce RNG (seperti kasus Sony PS3 pada ECDSA).
2. **Kanonisasi Data Deterministic:**
   - Menghindari galat umum penandatanganan string sembarang `str(dict)`. Modul menggunakan serialisasi JSON kanonis (`sort_keys=True`, tanpa spasi redundan) agar hasil byte deterministik di seluruh sistem operasi.
3. **Protokol Rantai Tanda Tangan (*Chained Signature*):**
   - Setiap catatan audit log diikatkan ke tanda tangan sebelumnya ($\text{ttd}_i = \text{Sign}(\text{ttd}_{i-1} \parallel \text{catatan}_i)$). Memastikan riwayat audit kebal terhadap manipulasi urutan (*reordering*) atau penghapusan catatan di tengah rantai (*deletion attack*).
4. **Prinsip Gagal Tertutup (*Fail-Closed*):**
   - Jika satu bit data atau tanda tangan dimanipulasi, verifikasi otomatis menolak dengan menangkap `InvalidSignature` dan melaporkan indeks data yang rusak tanpa mengeksekusi aksi berbahaya.

---

### 3. Hasil Eksekusi Pengujian (Fungsi Berjalan 100%)

Seluruh fungsi telah teruji penuh melalui unit test `pytest` (8 skenario lulus 100%):
- **T1 (Positif):** Rantai bertanda tangan sah diverifikasi utuh (**PASSED**)
- **T2 (Negatif):** Catatan termodifikasi langsung terdeteksi pada indeksnya (**PASSED**)
- **T3 (Negatif):** Catatan yang dihapus dari tengah rantai terdeteksi (**PASSED**)
- **T4 (Negatif):** Verifikasi dengan kunci publik penyerang/asing ditolak (**PASSED**)
- **T5 (Negatif):** Tanda tangan rusak/palsu ditolak (**PASSED**)
- **T6 (Positif & Negatif):** Penandatanganan & verifikasi paket P2P tunggal (**PASSED**)
- **T7 (Kriptografis):** Serialisasi JSON kanonis deterministik (**PASSED**)
- **T8 (RFC 8032):** Derivasi kunci privat dari seed 32-byte konsisten (**PASSED**)

*Status Eksekusi Terminal:* `8 passed in 0.84s`
