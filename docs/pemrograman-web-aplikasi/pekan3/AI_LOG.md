# AI_LOG.md — PAW Pekan 3 (Milestone 1 v0.1)

Dokumentasi etika & transparansi penggunaan AI untuk Tugas 1 (Milestone 1) mata kuliah Pengembangan Aplikasi Web (052355).

---

## **Catatan Penggunaan AI**
* **Tanggal**: 13 Oktober 2026
* **Model AI**: Gemini / ChatGPT
* **Fokus**: Pemetaan struktur komponen murni React JSX (`P2pModal.jsx` dan `QrScannerModal.jsx`), penyusunan dokumen README Milestone 1, dan verifikasi tipe data JSDoc.

---

### **Tabel Verifikasi & Penyesuaian Kode**

| Berkas / Modul | Generasi Awal AI | Hasil Revisi Manual |
| :--- | :--- | :--- |
| `app-gui/src/components/` | AI membuat asumsi nama komponen bertipe `.tsx` generik (`Navbar.tsx`, `CredentialCard.tsx`). | **Revisi Total**: Disesuaikan dengan struktur komponen fisik asli proyek yaitu `P2pModal.jsx` dan `QrScannerModal.jsx` berbasis React JSX. |
| `docs/pemrograman-web-aplikasi/pekan3/` | AI menyarankan peletakan di *root repository*. | **Revisi**: Dipindahkan ke struktur terisolasi `docs/pemrograman-web-aplikasi/pekan3/` agar tidak bercampur dengan tugas matkul KKS dan Kriptografi. |
| Type Checking JSDoc | Membutuhkan berkas TypeScript terpisah. | **Revisi**: Menggunakan anotasi JSDoc `@param` dan `@typedef` langsung pada berkas `.jsx` serta konfigurasi `jsconfig.json` agar lolos `npx tsc --noEmit` tanpa mengubah ekstensi berkas. |

---

### **Hasil Verifikasi Teknis**
- **Type Checking**: Perintah `npx tsc --noEmit` dengan `checkJs: true` berjalan tanpa kesalahan (*zero error*).
- **Aksesibilitas**: Lolos pengujian Lighthouse Accessibility dengan skor **89** pada breakpoint Mobile, Tablet, dan Desktop.