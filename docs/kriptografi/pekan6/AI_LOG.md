# Catatan Penggunaan Kecerdasan Buatan (AI_LOG.md)
## Tugas 2 — Enkripsi Terautentikasi dan Integritas Data (Pekan 6)

- **Nama Mahasiswa:** Gionaldo Chandrawansah  
- **NIM:** 105224031  
- **Mata Kuliah:** Kriptografi (052357)  
- **Dosen Pengampu:** Muhammad Fakhrul Safitra, S.Kom., M.Kom.  

---

## Log Transparansi Penggunaan AI

| Atribut | Rincian Keterangan |
|---|---|
| **Alat Bantu AI** | Antigravity AI (Google Deepmind Engine) |
| **Tujuan Penggunaan** | Membantu perancangan struktur modul kriptografi terstandarisasi NIST SP 800-38D, penyusunan fungsi derivasi kunci HKDF (RFC 5869), perancangan skenario pengujian unit negatif (bit-flipping & AAD mismatch), serta penyusunan draf dokumen arsitektur keputusan. |
| **Ringkasan Perintah / Prompt** | 1. "Rancang modul enkripsi AEAD AES-256-GCM menggunakan pustaka Python `cryptography` dengan parameter 256-bit key, 96-bit nonce CSPRNG, 128-bit tag, dan AAD terikat."<br>2. "Implementasikan Key Separation menggunakan HKDF (RFC 5869) berbasis SHA-256 dan PBKDF2 untuk Master Password."<br>3. "Buat skenario pengujian `pytest` yang mencakup uji positif roundtrip, manipulasi bit ciphertext, modifikasi auth tag, transplantasi konteks AAD, kunci salah, input kosong fail-closed, dan keunikan nonce CSPRNG."<br>4. "Buat dokumen KEPUTUSAN.md sesuai format kebutuhan $\rightarrow$ mekanisme $\rightarrow$ alasan dan pisahkan peran 4 pilar kriptografi." |
| **Bagian Kode yang Dipakai / Diubah** | 1. **Modul `aead.py`:** Mengadopsi struktur enkripsi/dekripsi AES-GCM dengan penggabungan terpadu `nonce + ciphertext + tag` dalam serialisasi Base64.<br>2. **Modul `kdf.py`:** Mengadopsi implementasi HKDF untuk memisahkan enkripsi vault dan autentikasi token secara kriptografis.<br>3. **Modul `vault_security.py`:** Memodifikasi pemuatan kunci agar strictly zero-secret pada repositori Git (hanya membaca dari `os.getenv('STEALTH_VAULT_MASTER_KEY')`).<br>4. **Test Suite `test_tugas2.py`:** Menambahkan pengujian bit-flip XOR pada byte pertama ciphertext dan byte terakhir auth tag, serta uji empiris 500 nonce unik. |
| **Cara Memeriksa & Memverifikasi Kode** | 1. **Pemeriksaan Standar NIST SP 800-38D:** Memverifikasi ukuran parameter (kunci 32B, nonce 12B, tag 16B) sesuai spesifikasi teknis resmi.<br>2. **Pemeriksaan Gagal Tertutup (*Fail-Closed*):** Memastikan exception `InvalidTag` dan `ValueError` tertangkap dengan tepat tanpa ada data bocor.<br>3. **Eksekusi Pengujian Otomatis:** Menjalankan `pytest -v` pada Python 3.14 (7 dari 7 pengujian lulus 100% dalam 0.29 detik).<br>4. **Audit Git Repositori:** Memastikan berkas konfigurasi `.gitignore` aktif dan tidak ada file kunci rahasia yang terunggah. |

---

## Pernyataan Pemahaman Mahasiswa
Saya menyatakan bahwa seluruh kode dan dokumen yang dikumpulkan telah dipahami secara menyeluruh dan saya siap mendemonstrasikan serta menjawab pertanyaan penguji mengenai implementasi AEAD, derivasi kunci HKDF/PBKDF2, bahaya *nonce reuse*, dan pertahanan terhadap *Ciphertext Transplant Attack*.

