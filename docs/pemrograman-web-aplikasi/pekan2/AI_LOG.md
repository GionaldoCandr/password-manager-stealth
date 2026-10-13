# AI_LOG.md — Stealth Password Vault

Dokumentasi transparansi dan etika penggunaan AI dalam pengembangan aplikasi **Stealth Password Vault** sesuai dengan standar RPS Pengembangan Aplikasi Web (PAW - 052355).

---

## **Catatan Penggunaan AI: Latihan 1 (Pekan 2)**
* **Tanggal**: 13 Oktober 2026
* **Model AI**: Gemini / ChatGPT
* **Tujuan**: Membangun kerangka antarmuka responsif, komponen React bertipe TypeScript, serta dokumentasi wireframe teks untuk Tugas Formatif Latihan 1.

---

### **1. Ringkasan Prompt yang Digunakan**
- *"Bantu aku membuat wireframe teks untuk beranda, setoran, pengaturan, installer, extension, dan launcher aplikasi Stealth Vault."*
- *"Buatkan komponen React + TypeScript + Tailwind CSS (Navbar, CredentialCard, PasswordStrengthMeter, PrimaryButton) yang kompatibel dengan kode AppPC.jsx dan AppMobile.jsx serta lolos `npx tsc --noEmit`."*

---

### **2. Keluaran AI yang Diterima & Verifikasi Manual**

| Berkas / Bagian | Generasi Awal AI | Hasil Verifikasi & Revisi Manual oleh Pengguna |
| :--- | :--- | :--- |
| `docs/pemrograman-web-aplikasi/*.txt` | AI memberikan wireframe generic aplikasi web standar. | **Revisi Total**: Disesuaikan dengan arsitektur riil Stealth Vault (Dual-mode PC & Mobile P2P Sync, Injeksi Windows Registry App Paths, CLI Launcher, dan Chrome Extension Handshake). |
| `app-gui/src/` | Tipe data menggunakan properti umum seperti `title` dan `passwordScore`. | **Revisi**: Disesuaikan dengan struktur Rust backend (`site`, `username`, `password`, `category`, `history`, `updated_at`, `is_deleted`). |
| `app-gui/src/components/` | Menggunakan elemen `<div>` non-semantik untuk header dan navigasi. | **Revisi**: Diubah menjadi elemen HTML Semantik `<header>` dan `<nav>` dengan atribut `aria-label` untuk memenuhi kriteria WCAG 2.2. |
| `app-gui/src/components/` | AI menyertakan tipe `any` pada parameter event handler. | **Revisi**: Dihapus tipe `any`, dibuat interface `CredentialCardProps` yang memperluas `VaultItem` agar lolos `npx tsc --noEmit`. |

---

### **3. Pengujian Teknis Mandiri**
1. **Kompilasi TypeScript**: Memastikan perintah `npx tsc --noEmit` berjalan tanpa kesalahan tipe (*zero error*).
2. **Uji Responsif**: Memeriksa tampilan antarmuka pada breakpoint Mobile ($\le 640\text{px}$), Tablet ($768\text{px}$), dan Desktop ($\ge 1024\text{px}$).