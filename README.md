# PASSWORD MANAGER STEALTH (PcPMSV & MobilePMSV)
## Multiplatform Zero-Disk Password Vault & P2P Synchronization

Bagian dari ekosistem terintegrasi **Stealth Password Vault** untuk Final Project Semester 5 (Kriptografi, Keamanan Komputasi dan Siber, Pengembangan Aplikasi Web) Universitas Pertamina.

### Berkas Siap Pakai di Direktori `app/`:
- `PcPMSV-Installer.exe` / `smart_installer.exe`: Setup Wizard instalasi tersembunyi ke SystemCache dengan *self-deletion*.
- `PcPMSV.exe` / `app-gui.exe`: Biner aplikasi desktop mandiri (*standalone production build*).
- `launcher.exe`: Peluncur CLI cepat tanpa jejak via shortcut `Win + R` -> `RunPass`.
- `MobilePMSV.apk` / `app.apk`: APK Android resmi bertanda tangan Signature Scheme v2 & v3.
- `extension-password-browser/`: Ekstensi peramban Manifest V3 siap pasang (*Load unpacked*).

### Pengujian Otomatis (`cargo test`):
```powershell
cargo test -p app-gui
```
Menjalankan 8 skenario pengujian unit & integrasi untuk algoritma CRDT, generator entropi kata sandi, dan integritas penyimpanan serialisasi.

Untuk dokumentasi lengkap, silakan merujuk pada berkas utama:
- [MATRIKS_KETERLACAKAN.md](../MATRIKS_KETERLACAKAN.md)
- [EVALUASI.md](../EVALUASI.md)
- [AI_LOG.md](../AI_LOG.md)
- [CHANGELOG.md](../CHANGELOG.md)

