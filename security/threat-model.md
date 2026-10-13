# Threat Model - STRIDE Analysis

Dokumen ini memuat analisis 10 ancaman spesifik pada elemen DFD Stealth Password Vault.

## Tabel Analisis Ancaman STRIDE

| ID Threat | Elemen DFD | Kategori STRIDE | Threat Statement | Asset Terdampak |
| :--- | :--- | :--- | :--- | :--- |
| **T-01** | P1 (Desktop Engine) | **Spoofing** | Skrip lokal jahat berpura-pura menjadi Browser Extension resmi (P2) untuk mengirimkan payload kata sandi palsu ke port `14201`. | AST-02 (Vault Data) |
| **T-02** | DS2 (ADS File) | **Tampering** | Malware lokal memodifikasi byte biner `sys_data.log:part_01.dat` di disk saat aplikasi tertutup untuk merusak struktur data vault. | AST-02 (Vault Data) |
| **T-03** | F7 (P2P Stream) | **Tampering** | Attacker pada jaringan Wi-Fi lokal yang sama mencegat dan mengubah byte stream transaksi P2P saat sinkronisasi PC-Mobile berlangsung. | AST-08 (Mobile Vault) |
| **T-04** | P3 (Mobile App) | **Repudiation** | Aplikasi mobile menghapus kata sandi tanpa memperbarui metadata `is_deleted` (Tombstone), sehingga penggabungan CRDT di PC tidak dapat menelusuri riwayat hapus. | AST-09 (Logs/Metadata) |
| **T-05** | DS1 (RAM Storage) | **Information Disclosure** | Penyerang menjalankan alat memory dumper di OS Windows untuk membaca plaintext password saat data terdekripsi aktif di RAM. | AST-01 (Master Password) |
| **T-06** | F3 (Local HTTP) | **Information Disclosure** | Aplikasi lokal pihak ketiga memantau lalu lintas port `127.0.0.1:14201` untuk mencuri kredensial baru yang dikirim dari browser extension. | AST-03 (Sync Token) |
| **T-07** | P2 (Extension) | **Information Disclosure** | Content Security Policy (CSP) situs web berbahaya membaca isi form login yang ditangkap oleh content script sebelum dikirim ke background worker. | AST-06 (Extension) |
| **T-08** | P1 (Desktop Engine) | **Denial of Service** | Aplikasi jahat lokal membanjiri port HTTP `14201` dengan request POST palsu secara berulang-ulang hingga thread server tiny_http meluap dan membeku. | AST-05 (Desktop Core) |
| **T-09** | DS3 (Registry) | **Elevation of Privilege** | Malware mengedit nilai path pada registri `HKCU App Paths\MyPass.exe` untuk mengarahkan eksekusi `Win+R` ke biner trojan milik penyerang. | AST-07 (App Paths Registry) |
| **T-10** | P1 (Desktop Engine) | **Elevation of Privilege** | Perangkat P2P terhubung menyuntikkan timestamp Unix Epoch palsu dari masa depan (`updated_at`) untuk menimpa data kredensial valid pada algoritma CRDT LWW. | AST-02 (Vault Data) |