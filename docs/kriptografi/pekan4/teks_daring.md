# Salinan Jawaban untuk Kolom Teks Daring LMS (Latihan Pekan 4)

---

**Tautan Repositori (Cabang latihan-4):**  
https://github.com/GionaldoCandr/password-manager-stealth/tree/latihan-4  
(Berkas: `docs/kriptografi/pekan4/simetris.py` dan `docs/kriptografi/pekan4/test_simetris.py`)

---

**Hasil Eksekusi Pengujian (pytest):**
```text
============================= test session starts =============================
platform win32 -- Python 3.14.0, pytest-9.2.0, pluggy-1.7.0
collecting ... collected 5 items

password-manager-stealth/docs/kriptografi/pekan4/test_simetris.py::test_l1_simpan_lalu_buka_sukses PASSED [ 20%]
password-manager-stealth/docs/kriptografi/pekan4/test_simetris.py::test_l2_paket_diubah_ditolak PASSED [ 40%]
password-manager-stealth/docs/kriptografi/pekan4/test_simetris.py::test_l3_catatan_dipindah_ke_situs_lain_ditolak PASSED [ 60%]
password-manager-stealth/docs/kriptografi/pekan4/test_simetris.py::test_l4_kunci_salah_ditolak PASSED [ 80%]
password-manager-stealth/docs/kriptografi/pekan4/test_simetris.py::test_l5_nonce_unik_mencegah_pola_ecb PASSED [100%]

============================== 5 passed in 0.37s ==============================
```

---

**Analisis Kasus Mode Operasi (Data, AAD, dan Alasan Memilih GCM):**

1. **Data yang Dienkripsi & AAD:**
   Pada produk *Password Stealth Vault*, data yang dilindungi adalah entri kata sandi akun (*plaintext password*). Kami menggunakan identitas entri `situs:username` sebagai **AAD** (*Additional Authenticated Data*). AAD memastikan kredensial terikat erat pada konteks akun aslinya, sehingga penyerang tidak dapat melakukan *transplant attack* (memindahkan ciphertext sandi kampus ke akun bank) karena verifikasi tag autentikasi akan langsung menolaknya (`InvalidTag`).

2. **Alasan Memilih AES-GCM (Bukan ECB atau CBC):**
   Kami memilih mode AES-256-GCM dari pustaka `cryptography` karena menyediakan *Authenticated Encryption with Associated Data* (AEAD) yang menggabungkan kerahasiaan (*confidentiality*) dan integritas (*integrity*) secara bawaan dalam satu langkah.

3. **Analisis Bahaya Pola ECB:**
   Mode ECB mengenkripsi setiap blok plaintext 128-bit secara mandiri ($C_i = E_K(P_i)$). Karena bersifat deterministik, blok plaintext yang sama selalu menghasilkan blok ciphertext yang identik (seperti temuan Citizen Lab pada enkripsi media Zoom 2020). Penyerang dapat melihat pola atau mendeteksi jika dua akun menggunakan sandi yang sama tanpa perlu mengetahui kunci.

4. **Analisis Bahaya IV / Nonce Berulang (Two-Time Pad):**
   Pada mode berbasis stream/counter seperti CTR dan GCM, enkripsi dilakukan melalui operasi XOR dengan keystream ($C_i = P_i \oplus S_i$). Jika nonce dipakai ulang untuk dua pesan berbeda ($P_1$ dan $P_2$) dengan kunci sama, maka $C_1 \oplus C_2 = P_1 \oplus P_2$. Keystream saling meniadakan, sehingga penyerang yang mengetahui atau dapat menebak format salah satu plaintext dapat langsung merekonstruksi plaintext kedua tanpa kunci. Lebih jauh lagi pada GCM, nonce berulang membocorkan kunci autentikasi GHASH sehingga penyerang dapat memalsukan *authentication tag*.
   *Solusi pada produk:* Nonce dibangkitkan secara acak dan unik sepanjang 96-bit (12 byte) untuk setiap operasi enkripsi menggunakan CSPRNG sistem operasi (`os.urandom(12)`).

