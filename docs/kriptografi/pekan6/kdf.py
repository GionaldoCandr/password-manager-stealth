"""
Modul KDF (Key Derivation Function) & Key Separation
Mata Kuliah: Kriptografi (052357) - Pekan 6 (Tugas 2)
Mahasiswa: Gionaldo Chandrawansah (105224031)

Standar:
- RFC 5869: HMAC-based Extract-and-Expand Key Derivation Function (HKDF)
- NIST SP 800-132: Recommendation for Password-Based Key Derivation
"""

import os
from typing import Tuple
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes


def derive_master_key_from_password(
    password: str,
    salt: bytes = None,
    iterations: int = 600_000
) -> Tuple[bytes, bytes]:
    """
    Menurunkan Master Key (256-bit) dari Master Password pengguna menggunakan PBKDF2-HMAC-SHA256
    sesuai rekomendasi OWASP Cryptographic Storage Cheat Sheet (minimal 600.000 iterasi).
    
    Args:
        password: Kata sandi utama (plaintext).
        salt: Garam kriptografis 16-byte (opsional, jika None akan dibangkitkan via CSPRNG).
        iterations: Jumlah putaran hashing (default 600.000).
        
    Returns:
        Tuple[bytes, bytes]: (master_key_32_bytes, salt_16_bytes)
        
    Raises:
        ValueError: Jika password kosong atau bukan string.
    """
    if not isinstance(password, str) or not password:
        raise ValueError("Password harus berupa string tidak kosong.")
        
    if salt is None:
        # Pembangkitan salt acak via CSPRNG sistem operasi
        salt = os.urandom(16)
    elif len(salt) < 16:
        raise ValueError("Salt minimal harus berukuran 16 byte.")

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 256 bit
        salt=salt,
        iterations=iterations,
    )
    master_key = kdf.derive(password.encode("utf-8"))
    return master_key, salt


def separate_keys_hkdf(
    master_secret: bytes,
    salt: bytes = None
) -> Tuple[bytes, bytes]:
    """
    Melakukan Key Separation menggunakan HKDF (RFC 5869) berbasis SHA-256:
    Menghasilkan dua kunci independen dari satu master secret:
    1. Encryption Key (AES-256-GCM) dengan info context: b"stealth-vault-encryption-key-v1"
    2. Authentication / Integrity Key dengan info context: b"stealth-vault-auth-key-v1"
    
    Tujuan Keamanan:
    Prinsip kriptografi mengharuskan satu kunci simetris HANYA digunakan untuk satu tujuan algoritma
    (Cryptographic Key Separation) guna mencegah interaksi kunci antar fungsi yang tidak terduga.
    
    Args:
        master_secret: Master secret/key berukuran minimal 32 byte.
        salt: Garam opsional untuk fase Extract HKDF.
        
    Returns:
        Tuple[bytes, bytes]: (encryption_key_32_bytes, auth_key_32_bytes)
    """
    if not isinstance(master_secret, (bytes, bytearray)) or len(master_secret) < 32:
        raise ValueError("Master secret harus berupa bytes dengan panjang minimal 32 byte (256-bit).")

    if salt is None:
        salt = b"\x00" * 32  # RFC 5869 default jika salt tidak disediakan

    # Derivasi Kunci Enkripsi Vault
    hkdf_enc = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        info=b"stealth-vault-encryption-key-v1",
    )
    enc_key = hkdf_enc.derive(master_secret)

    # Derivasi Kunci Autentikasi / HMAC Sekunder
    hkdf_auth = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        info=b"stealth-vault-auth-key-v1",
    )
    auth_key = hkdf_auth.derive(master_secret)

    return enc_key, auth_key

