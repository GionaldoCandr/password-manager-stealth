"""Modul Penghubung Enkripsi Simetris ke Komponen Entri Password Manager.

Menghubungkan fungsi enkripsi AES-256-GCM ke model data kredensial vault:
- Data yang dienkripsi: String kata sandi plaintext (UTF-8 bytes)
- AAD (Additional Authenticated Data): Konteks identitas entri (situs + username)
"""

try:
    from .simetris import enkripsi, dekripsi
except (ImportError, ValueError):
    from simetris import enkripsi, dekripsi


def buat_aad(situs: str, username: str) -> bytes:
    """Membentuk Additional Authenticated Data (AAD) dari konteks situs dan username.

    Konteks ini diautentikasi (dilindungi integritasnya) namun tidak dienkripsi.
    Mencegah serangan ciphertext transplantasi antar-akun/layanan.
    """
    return f"{situs.strip().lower()}:{username.strip()}".encode("utf-8")


def simpan_password(kunci: bytes, situs: str, username: str, password_plain: str) -> bytes:
    """Mengenkripsi kata sandi untuk entri akun tertentu dengan AAD konteks akun."""
    if not password_plain:
        raise ValueError("Password tidak boleh kosong.")

    data_bytes = password_plain.encode("utf-8")
    aad = buat_aad(situs, username)
    return enkripsi(kunci, data_bytes, aad)


def buka_password(kunci: bytes, paket_terenkripsi: bytes, situs: str, username: str) -> str:
    """Mendekripsi paket kata sandi dengan memverifikasi kepemilikan situs dan username."""
    aad = buat_aad(situs, username)
    decrypted_bytes = dekripsi(kunci, paket_terenkripsi, aad)
    return decrypted_bytes.decode("utf-8")
