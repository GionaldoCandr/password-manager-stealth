# Teks Daring Pengumpulan Tugas 2: Kontrol Akses dan System Hardening
**Mata Kuliah:** Keamanan Komputasi dan Siber (052353) · 3 SKS · Semester 5  
**Dosen Pengampu:** Muhammad Fakhrul Safitra, S.Kom., M.Kom.  
**Program Studi:** Ilmu Komputer, Universitas Pertamina  
**Mahasiswa:** Gionaldo Chandrawansah  
**NIM:** 105224031  
**Produk:** Stealth Password Vault (`password-manager-stealth`)  

Salin teks di bawah ini ke kolom teks daring pengumpulan Tugas 2 di e-learning Moodle:

---

**TUGAS 2: KONTROL AKSES DAN SYSTEM HARDENING (PEKAN 6)**  
- **Repositori:** https://github.com/GionaldoCandr/password-manager-stealth  
- **Cabang Git:** `main`  
- **Penanda Rilis (Tag):** `sec-0.2`  
- **Hash Commit:** `291ccb6` (`291ccb6` - branch `main`)  
- **Tautan Berkas Laporan Utama di GitHub:**  
  https://github.com/GionaldoCandr/password-manager-stealth/blob/main/docs/keamanan-komputasi-siber/tugas-2.md  

---

### Ringkasan Pemenuhan Rubrik Penilaian (Target 100 Poin / Level C3)

1. **Autentikasi, Otorisasi, dan Least Privilege (35 Poin):**
   - **Matriks Akses & Uji Per Peran (`security/access-tests.md`):** Memetakan 4 peran (Guest, Extension, Vault Owner, Auditor) terhadap 6 sumber daya/operasi.
   - **Uji Akses Negatif Seimbang (50% : 50%):** Terdiri atas 6 uji positif dan 6 uji negatif (seluruh upaya akses tidak sah DITOLAK 100%).
   - **Penyimpanan Password Lambat (*Slow Hash*):** Menggunakan **Argon2id** sesuai rekomendasi OWASP Password Storage Cheat Sheet ($m=19\text{ MiB } (19456\text{ KiB}), t=2, p=1$, salt CSPRNG 128-bit) dengan bukti format baku string PHC tanpa membocorkan data pengguna nyata.

2. **Hardening Sistem Operasi dan Container (30 Poin):**
   - **VM & SSH Hardening:**
     - Hasil perintah verifikasi: `sudo sshd -T | grep -E 'passwordauthentication|permitrootlogin'` menunjukkan nilai `no` (`passwordauthentication no`, `permitrootlogin no`).
     - Login SSH hanya diizinkan via public key, root login diblokir, umask 027, firewall UFW aktif, auditd aktif.
     - **Indeks Lynis:** Naik dari **58** (`security/lynis-before.txt`) menjadi **82** (`security/lynis-after.txt`), melampaui target minimum 70!
   - **Container Hardening (`Dockerfile` & `docker-compose.yml`):**
     - Multi-stage build berbasis Alpine minimal.
     - Pengguna non-root (`user: "1001:1001"`).
     - Seluruh capability dibuang (`cap_drop: - ALL` $\rightarrow$ `CapEff: 0000000000000000`).
     - Pencegahan eskalasi hak istimewa (`security_opt: no-new-privileges:true`).
     - Sistem berkas root hanya-baca (`read_only: true` dengan `tmpfs` memori terisolasi).
     - Port tidak dipublikasikan ke publik (hanya terikat ke loopback `127.0.0.1:14201`).

3. **Pemindaian Kerentanan dan SBOM (20 Poin):**
   - Pemindaian citra sebelum hardening (`security/image-scan-before.txt`): Terdeteksi **2 CRITICAL** dan 5 HIGH pada unhardened image.
   - Pemindaian citra sesudah hardening (`security/image-scan-after.txt`): **0 CRITICAL** (Bebas total dari kerentanan kritis / 100% Clean).
   - Berkas SBOM formal standar CycloneDX v1.5 JSON tersedia lengkap di [`security/sbom.cdx.json`](../../security/sbom.cdx.json).

4. **Keterkaitan dengan Register Risiko dan Rencana Demonstrasi (15 Poin):**
   - Seluruh kontrol merujuk langsung ke ID risiko Tugas 1 (`R-01`: RAM Secret Zeroize & Argon2id, `R-02`: IPC Port Access Control & Token, `R-04`: Registry OS Hardening & Non-Root, `R-07`: Clipboard Auto-Clear).
   - Lingkungan uji (Ubuntu 24.04 LTS, Docker v27, Lynis 3.1.2, Trivy 0.68.2) dan skenario demonstrasi 5–7 menit terdokumentasi lengkap dan siap dipraktikkan.
