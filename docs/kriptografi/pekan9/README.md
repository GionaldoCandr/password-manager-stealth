# Laporan Latihan Pekan 9 — Kunci Publik dan Tanda Tangan Digital
## Password Stealth Vault (Checkpoint 1 Tugas 3)

- **Nama Mahasiswa:** Gionaldo Chandrawansah  
- **NIM:** 105224031  
- **Mata Kuliah:** Kriptografi (052357) · 2 SKS · Semester 5  
- **Dosen Pengampu:** Muhammad Fakhrul Safitra, S.Kom., M.Kom.  
- **Program Studi:** Ilmu Komputer, Universitas Pertamina  
- **Produk Digital:** Stealth Password Vault  
- **Cabang Latihan:** `latihan-9`  
- **Tautan Repositori:** [https://github.com/GionaldoCandr/password-manager-stealth/tree/latihan-9](https://github.com/GionaldoCandr/password-manager-stealth/tree/latihan-9)

---

## 1. Tabel Peran Kunci Produk (Sesuai Ketentuan Slide 42)

Tabel berikut merangkum seluruh peran kunci kriptografis yang digunakan pada produk **Stealth Password Vault**:

| Kunci | Dipegang (Pemilik) | Untuk Apa | Tempat Simpan |
|---|---|---|---|
| **Ed25519 Privat (256-bit)** | Perangkat Pengirim (Aplikasi Mobile Android / PC Vault) | Menandatangani (*Sign*) paket sinkronisasi P2P dan catatan audit perubahan brankas secara nirsangkal (*non-repudiation*). | Penyimpanan aman lokal (*Keystore / Android EncryptedSharedPreferences / DPAPI Windows / berkas izin 600 di luar repositori*). Tidak pernah dikomit ke Git. |
| **Ed25519 Publik (256-bit)** | Perangkat Penerima P2P / Sync Server / Registry | Memverifikasi (*Verify*) keaslian asal perangkat dan keutuhan paket data tanpa memiliki kemampuan memalsukan tanda tangan. | Terdaftar terbuka di repositori, basis data lokal perangkat peer, atau registry publik. |
| **AES-256-GCM (v0.2)** | Perangkat Vault Lokal | Melindungi kerahasiaan (*confidentiality*) dan keutuhan (*integrity*) kata sandi yang tersimpan di brankas. | Diturunkan secara dinamis saat brankas terbuka via KDF; tidak disimpan mentah di disk. |
| **Master Secret / Key** | Pengguna Pemilik Akun | Kunci induk untuk menurunkan kunci enkripsi simetris dan seed kunci privat asimetris via HKDF. | Disimpan hanya di memori volatil (*RAM*) selama sesi login aktif (*Zero-Disk Exposure*). |

---

## 2. Penjelasan Konsep & Alur Kriptografi Kunci Publik

### A. Mengapa Memilih Ed25519 (Bukan RSA atau ECDSA)?
1. **Kinerja dan Ukuran Efisien (RFC 8032):**
   - Kunci publik Ed25519 hanya berukuran **32 byte (256 bit)** dan tanda tangan hanya **64 byte (512 bit)**. Sangat optimal untuk sinkronisasi P2P cepat pada perangkat mobile dengan bandwidth rendah dibandingkan RSA-3072 (kunci dan tanda tangan 384 byte).
   - Memiliki tingkat keamanan setara 128-bit (setara RSA 3072-bit menurut NIST SP 800-57).
2. **Kekebalan terhadap Bencana Nonce Reuse:**
   - Pada ECDSA (seperti insiden PlayStation 3 tahun 2010), jika generator bilangan acak gagal dan menghasilkan nonce $k$ yang berulang untuk dua pesan berbeda, kunci privat penandatangan dapat langsung dibocorkan secara matematis.
   - Ed25519 bersifat **deterministik murni** (RFC 8032): nonce dihitung dari hash kombinasi kunci privat dan data pesan, sehingga kebal 100% terhadap kegagalan RNG saat penandatanganan.
3. **Kekebalan Side-Channel Attack:**
   - Kurva Edwards (Curve25519) dirancang *constant-time*, sehingga tidak membocorkan informasi kunci melalui variasi waktu eksekusi (*timing attack*).

### B. Nirsangkal (*Non-Repudiation*) vs MAC Simetris
- Pada sistem berbasis HMAC simetris (Tugas 2 / Pekan 5), pengirim dan penerima memegang kunci rahasia yang sama. Jika penerima memverifikasi tag, pihak ketiga tidak dapat membuktikan apakah tag tersebut dibuat oleh pengirim atau dipalsukan oleh penerima sendiri.
- Dengan **Ed25519**, HANYA perangkat pengirim yang memegang kunci privat. Siapa pun (termasuk server) hanya memegang kunci publik. Server dapat memverifikasi keaslian paket, namun server **mustahil dapat memalsukan tanda tangan** jika terjadi sengketa (*non-repudiation* terjamin).

### C. Pentingnya Kanonisasi Data (Slide 43)
- Menandatangani objek langsung menggunakan representasi string bebas seperti `str(dict)` adalah celah keamanan (*vulnerability*), karena urutan *key-value* dictionary pada Python atau JavaScript bersifat arbitrer dan dapat memicu kegagalan verifikasi.
- Modul ini menggunakan **JSON Kanonis**:
  ```python
  json.dumps(catatan, sort_keys=True, separators=(',', ':')).encode("utf-8")
  ```
  Menjamin susunan bytes deterministik di seluruh platform klien (Android Kotlin, Tauri Rust, maupun Web).

### D. Rantai Tanda Tangan Audit (*Chained Signature*)
Untuk mencegah penyerang memanipulasi riwayat perubahan brankas (audit log):
$$\text{ttd}_i = \text{Sign}_{K_{\text{priv}}}(\text{ttd}_{i-1} \parallel \text{kanonis}(\text{catatan}_i))$$
- Jika penyerang mencoba menghapus salah satu catatan di tengah riwayat (*deletion attack*) atau menukar urutan catatan (*reordering attack*), keterikatan rantai otomatis terputus dan proses verifikasi langsung mendeteksi indeks kerusakan secara gagal tertutup (*fail-closed*).

---

## 3. Struktur Berkas Modul Pekan 9

Modul latihan diimplementasikan pada folder `docs/kriptografi/pekan9/`:

| Berkas | Fungsi & Deskripsi |
|---|---|
| [`tanda_tangan.py`](tanda_tangan.py) | Modul inti Ed25519: pembangkitan pasangan kunci, kanonisasi data, penandatanganan paket sync tunggal, dan penandatanganan/verifikasi rantai audit berurutan. |
| [`cli_demo.py`](cli_demo.py) | Skrip simulasi terminal mandiri (sesuai Slide 41) yang mendemonstrasikan alur di perangkat pengirim dan verifikasi di server/penerima. |
| [`test_pekan9.py`](test_pekan9.py) | Test suite 8 skenario pengujian unit berbasis `pytest` (100% passed). |
| [`teks_daring.md`](teks_daring.md) | Teks siap salin-tempel untuk penyerahan tugas pada LMS. |

---

## 4. Cara Menjalankan Modul dan Hasil Pengujian

### A. Menjalankan Skrip Peragaan Alur Terminal (Slide 41)
```bash
python docs/kriptografi/pekan9/cli_demo.py
```
**Luaran Terminal Nyata:**
```text
======================================================================
DEMONSTRASI ALUR TANDA TANGAN DIGITAL ED25519 (PEKAN 9)
Produk: Stealth Password Vault (Sinkronisasi & Audit Log Nirsangkal)
Mahasiswa: Gionaldo Chandrawansah (105224031)
======================================================================

[FASE 1: PERANGKAT VAULT (PENGIRIM)]
-> Kunci privat Ed25519 dibangkitkan (disimpan lokal di memori aman).
-> Kunci publik diekspor ke registry: c07ee62bfd9c2e3227f2543f7e701a830e826dc19dd7a17e1ee15f117a27bba8
-> Menandatangani 3 catatan riwayat perubahan secara berantai...
   [Catatan 0] Tanda Tangan: 3c33f1003cc5239360bb4d82...d27c9c77678a830c
   [Catatan 1] Tanda Tangan: 9561afb3ce6710f6e91643fc...ac6a473ac48cc005
   [Catatan 2] Tanda Tangan: c6052024bd120bd695adbf35...e2e00a686c845c0a

[FASE 2: SERVER / PENERIMA SYNC (VERIFIKASI ALUR SAH)]
-> Server hanya memiliki kunci publik. Melakukan verifikasi rantai...
-> STATUS: UTUH (3 catatan terverifikasi sah matematis)

[FASE 3: PENGUJIAN NEGATIF - DETEKSI MANIPULASI DATA]
-> Simulasi penyerang memanipulasi catatan indeks 1 (username diubah)...
-> STATUS: RUSAK (Manipulasi terdeteksi tepat pada catatan indeks 1!)

[FASE 4: PENGUJIAN NEGATIF - VERIFIKASI DENGAN KUNCI LAIN]
-> Memverifikasi rantai asli menggunakan kunci publik perangkat lain...
-> STATUS: RUSAK (Kunci publik asing ditolak pada indeks 0!)

[FASE 5: PENANDATANGANAN & VERIFIKASI PAKET SYNC TUNGGAL]
-> Tanda tangan paket tunggal: 50851393318da33527ffe6f30e48c987...
-> Verifikasi paket tunggal asli : True (SAH)
-> Verifikasi paket termanipulasi: False (GAGAL TERTUTUP / DITOLAK)

======================================================================
DEMONSTRASI SELESAI DENGAN SUKSES!
======================================================================
```

> **Dokumentasi Tangkap Layar Peragaan Alur:**
> 
> <!-- TANGKAP LAYAR PERAGAAN ALUR TERMINAL DISINI -->
> ![Peragaan Alur Terminal](image-demo.png)

---

### B. Menjalankan Rangkaian Unit Test Pytest
```bash
pytest docs/kriptografi/pekan9/test_pekan9.py -v
```

**Hasil Eksekusi Pytest:**
```text
============================= test session starts =============================
platform win32 -- Python 3.14.0, pytest-9.2.0, pluggy-1.7.0
rootdir: C:\GIOIG\Root-Pass-Project
collecting ... collected 8 items

docs/kriptografi/pekan9/test_pekan9.py::test_t1_positif_rantai_bertanda_tangan_utuh PASSED [ 12%]
docs/kriptografi/pekan9/test_pekan9.py::test_t2_negatif_data_catatan_dimanipulasi PASSED [ 25%]
docs/kriptografi/pekan9/test_pekan9.py::test_t3_negatif_catatan_dihapus_dari_rantai PASSED [ 37%]
docs/kriptografi/pekan9/test_pekan9.py::test_t4_negatif_kunci_publik_perangkat_lain PASSED [ 50%]
docs/kriptografi/pekan9/test_pekan9.py::test_t5_negatif_tanda_tangan_palsu PASSED [ 62%]
docs/kriptografi/pekan9/test_pekan9.py::test_t6_positif_dan_negatif_paket_sync_tunggal PASSED [ 75%]
docs/kriptografi/pekan9/test_pekan9.py::test_t7_kanonisasi_deterministik PASSED [ 87%]
docs/kriptografi/pekan9/test_pekan9.py::test_t8_kunci_dari_seed_deterministik PASSED [100%]

============================== 8 passed in 0.84s ==============================
```

> **Dokumentasi Tangkap Layar Pytest:**
> 
> <!-- TANGKAP LAYAR HASIL UJI PYTEST DISINI -->
> ![Bukti Eksekusi Pytest](image.png)

---

## 5. Ringkasan Kriteria Umpan Balik (Skala 0–100)

1. **Ketepatan Konsep:**
   - Memisahkan secara ketat peran kunci privat (hanya disimpan lokal di perangkat) dan kunci publik (dibagikan ke server/peer).
   - Menggunakan Ed25519 (RFC 8032) yang kebal terhadap kegagalan bilangan acak (*deterministic nonce*).
   - Menandatangani bytes kanonis JSON deterministik (`sort_keys=True`) dan menangani galat verifikasi secara gagal tertutup (*fail-closed*).
2. **Fungsi Berjalan:**
   - Alur penandatanganan di perangkat dan verifikasi di server berjalan sempurna melalui `cli_demo.py` dan `test_pekan9.py` (8/8 pengujian lulus 100%).
3. **Kejelasan Penjelasan:**
   - Tabel peran kunci 4 kolom terdokumentasi lengkap dan jelas.
