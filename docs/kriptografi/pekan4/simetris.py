import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

PANJANG_NONCE = 12  # 96 bit (12 byte), ukuran nonce standar yang disarankan NIST SP 800-38D untuk AES-GCM


def buat_kunci() -> bytes:
    """Membangkitkan kunci simetris 256-bit (32 byte) menggunakan CSPRNG sistem operasi."""
    return AESGCM.generate_key(bit_length=256)


def enkripsi(kunci: bytes, data: bytes, aad: bytes = b"") -> bytes:
    """Mengenkripsi data menggunakan AES-256-GCM dengan nonce acak per pesan.

    Format keluaran paket: nonce (12 byte) || ciphertext || auth_tag (16 byte).
    """
    if not data:
        raise ValueError("Data yang akan dienkripsi tidak boleh kosong.")

    nonce = os.urandom(PANJANG_NONCE)
    aesgcm = AESGCM(kunci)
    ciphertext_dan_tag = aesgcm.encrypt(nonce, data, aad)

    # Gabungkan nonce di awal paket agar dapat dibaca saat dekripsi
    return nonce + ciphertext_dan_tag


def dekripsi(kunci: bytes, paket: bytes, aad: bytes = b"") -> bytes:
    """Mendekripsi paket dan memverifikasi integritas payload melalui tag autentikasi GCM.

    Jika paket termutasi atau AAD tidak cocok, pustaka akan melempar InvalidTag.
    """
    if len(paket) < PANJANG_NONCE + 16:
        raise ValueError("Panjang paket tidak valid atau terpotong.")

    nonce = paket[:PANJANG_NONCE]
    isi = paket[PANJANG_NONCE:]

    aesgcm = AESGCM(kunci)
    return aesgcm.decrypt(nonce, isi, aad)

