# Laporan Latihan Pekan 2 — Fungsi Dasar (Stealth Vault)

**Nama:** Gionaldo Chandrawansah  
**Mata Kuliah:** Kriptografi  
**Produk:** Password Stealth Vault  

---

## 1. Tautan Repositori Kode
- **Repositori:** [\[Gionaldo-kriptografi\]](https://github.com/GionaldoCandr/password-manager-stealth/tree/main/docs)
- **Berkas Kode Utama:** `docs/kriptografi/classic_cipher.py`
- **Berkas Pengujian:** `docs/kriptografi/test_classic_cipher.py`

---

## 2. Hasil Eksekusi Pengujian

Pengujian dijalankan menggunakan framework `pytest` untuk menguji modul Affine Cipher (penerapan Aritmetika Modulo & Algoritma Euclid Diperluas):

```bash
$ pytest docs/kriptografi/test_classic_cipher.py -v
============================= test session starts ==============================
platform windows -- Python 3.11 pytest-8
rootdir: /path/to/Stealth-Vault
collected 2 items

docs/kriptografi/test_classic_cipher.py::test_affine_cipher_success PASSED          [ 50%]
docs/kriptografi/test_classic_cipher.py::test_affine_cipher_invalid_key PASSED      [100%]

============================== 2 passed in 0.02s ===============================