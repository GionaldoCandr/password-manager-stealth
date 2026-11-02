import os
import sys
import pytest
from cryptography.exceptions import InvalidTag

# Pastikan direktori paket dapat ditemukan dari direktori kerja manapun
_current_dir = os.path.dirname(os.path.abspath(__file__))
_pm_dir = os.path.abspath(os.path.join(_current_dir, "..", "..", ".."))

for path in [_pm_dir, _current_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

try:
    from docs.kriptografi.pekan4.simetris import buat_kunci
    from docs.kriptografi.pekan4.vault_entry import simpan_password, buka_password
except (ModuleNotFoundError, ImportError):
    from simetris import buat_kunci
    from vault_entry import simpan_password, buka_password


# UJI 1 (Positif): Siklus Lengkap Enkripsi dan Dekripsi Entri Kredensial
def test_l1_simpan_lalu_buka_sukses():
    kunci = buat_kunci()
    situs = "bca.co.id"
    username = "nasabah123"
    sandi_asli = "RahasiaBank2026!#"

    paket = simpan_password(kunci, situs, username, sandi_asli)

    # Verifikasi paket bukan plaintext
    assert paket != sandi_asli.encode("utf-8")

    # Verifikasi dekripsi menghasilkan kembali password asli
    sandi_terbuka = buka_password(kunci, paket, situs, username)
    assert sandi_terbuka == sandi_asli


# UJI 2 (Negatif): Deteksi Perubahan Data (Tampering) pada Ciphertext
def test_l2_paket_diubah_ditolak():
    kunci = buat_kunci()
    situs = "github.com"
    username = "developer"
    sandi_asli = "SuperSecretToken_XYZ"

    paket = bytearray(simpan_password(kunci, situs, username, sandi_asli))

    # Simulasi serangan bit-flip oleh penyerang di tengah jalan (membalik 1 bit di byte ke-20)
    paket[20] ^= 0x01

    with pytest.raises(InvalidTag):
        buka_password(kunci, bytes(paket), situs, username)


# UJI 3 (Negatif / Konteks AAD): Transplantasi Kredensial ke Akun/Situs Lain Ditolak
def test_l3_catatan_dipindah_ke_situs_lain_ditolak():
    kunci = buat_kunci()
    situs_asli = "kampus.id"
    username_asli = "mahasiswa"
    sandi_asli = "SandiKampus@2026"

    paket = simpan_password(kunci, situs_asli, username_asli, sandi_asli)

    # Penyerang mencoba menyalin ciphertext sandi kampus untuk membuka akun email kantor
    situs_palsu = "kantor.co.id"

    with pytest.raises(InvalidTag):
        buka_password(kunci, paket, situs_palsu, username_asli)


# UJI 4 (Negatif Kunci): Dekripsi Menggunakan Kunci yang Berbeda
def test_l4_kunci_salah_ditolak():
    kunci_a = buat_kunci()
    kunci_b = buat_kunci()

    paket = simpan_password(kunci_a, "twitter.com", "user_x", "PasswordSosmed123")

    with pytest.raises(InvalidTag):
        buka_password(kunci_b, paket, "twitter.com", "user_x")


# UJI 5 (Keacakan Nonce): Mencegah Pola Deterministik ECB
def test_l5_nonce_unik_mencegah_pola_ecb():
    kunci = buat_kunci()
    situs = "netflix.com"
    username = "keluarga"
    sandi_sama = "PasswordKeluarga999"

    # Enkripsi dua kali untuk password yang identik pada situs yang sama
    paket1 = simpan_password(kunci, situs, username, sandi_sama)
    paket2 = simpan_password(kunci, situs, username, sandi_sama)

    # Ciphertext dan nonce HARUS berbeda untuk mencegah analisis frekuensi/pola ECB
    assert paket1 != paket2
    assert paket1[:12] != paket2[:12]  # Nonce 12 byte harus berbeda


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
