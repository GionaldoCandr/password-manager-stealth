# Password Stealth Vault

**Stealth Vault** adalah aplikasi pengelola kata sandi terenkripsi (Password Manager) aman yang dirancang untuk menyimpan, mengelola, dan mengautentikasi kredensial pengguna secara terenkripsi.

---

## 1. Pemetaan Kebutuhan Kriptografi (Memenuhi Rubrik K1)

Berikut adalah pemetaan data produk terhadap tujuan keamanan, tingkat prioritas, dan kebutuhan komponen teruji:

| No | Aset Data Produk | Tujuan Keamanan | Prioritas | Kebutuhan Komponen Teruji |
|---|---|---|---|---|
| 1 | **Master Password / Key** | Kerahasiaan (*Confidentiality*) & Autentikasi | High | Diturunkan menjadi fungsi derivasi kunci PBKDF2/Argon2id (CSPRNG key generation) untuk menghasilkan *Symmetric Master Key*. |
| 2 | **Vault Stored Passwords** | Kerahasiaan & Integritas (*Integrity*) | High | Diturunkan menjadi komponen enkripsi simetris AES-256-GCM dengan verifikasi *Authentication Tag*. |
| 3 | **Sesi Login Pengguna (Token)** | Autentikasi & Nirsangkal (*Non-repudiation*) | Medium | Diturunkan menjadi modul penandatanganan token JWT / HMAC SHA-256. |

> **Catatan Kriptografi Klasik:** Sandi klasik (seperti Affine/Caesar Cipher pada latihan pekan 2) hanya digunakan sebagai bahan pembelajaran dasar aritmetika modulo dan **TIDAK** digunakan untuk melindungi data utama pada produk Password Stealth Vault ini.

---

## 2. Rancangan Komponen Kriptografi (Memenuhi Rubrik K2)

Komponen utama diletakkan pada modul `docs/KRIPTOGRAFI/crypto_vault.py`.

* **Masukan – Proses – Keluaran:**
  * **Masukan:** String Password Plaintext (UTF-8), Associated Data (opsional).
  * **Proses:** Pembangkitan *Nonce* 96-bit dari CSPRNG -> Enkripsi AES-256-GCM -> Penggabungan Payload (`Nonce + Ciphertext + Auth Tag`).
  * **Keluaran:** String Ciphertext ter-encode **Base64**.
* **Representasi Data & Encoding vs Enkripsi:**
  * *Encoding* (UTF-8 & Base64) digunakan khusus untuk transformasi format data agar aman ditransmisikan dan disimpan. Encoding **bukan** mekanisme keamanan.
  * *Enkripsi* (AES-256-GCM) digunakan untuk proteksi kerahasiaan data matematis.
* **Sumber Keacakan (CSPRNG):**
  * Pembangkitan kunci dan *nonce* menggunakan modul `secrets` dan `os.urandom()` yang terjamin tingkat keacakannya (*Cryptographically Secure Pseudorandom Number Generator*).
* **Alasan Pemilihan Pustaka:**
  * Pustaka `cryptography` (modul `AESGCM`) dipilih karena merupakan pustaka standar industri Python yang dipelihara secara aktif, tahan terhadap serangan *timing attack*, serta menyediakan kerahasiaan sekaligus verifikasi integritas (*Authenticated Encryption with Associated Data / AEAD*).

---

## 3. Cara Menjalankan Komponen dan Pengujian (Memenuhi Rubrik K3 & K4)

### Prasyarat
Instal dependensi kriptografi dan tes:
```bash
pip install cryptography pytest