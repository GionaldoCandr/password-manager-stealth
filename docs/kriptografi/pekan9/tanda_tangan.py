"""
Modul Tanda Tangan Digital Asimetris (Ed25519 - RFC 8032)
Mata Kuliah: Kriptografi (052357) - Latihan Pekan 9
Mahasiswa: Gionaldo Chandrawansah (105224031)

Standar Rujukan:
- RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA) - Ed25519
- NIST FIPS 186-5: Digital Signature Standard (DSS)
- Materi Kriptografi Minggu 09 (Slide 38-43): Protokol Rantai Integritas & Nirsangkal

Karakteristik Parameter:
- Algoritma: Ed25519 (Kurva Eliptik Edwards-Curve25519)
- Ukuran Kunci Publik: 32 byte (256 bit)
- Ukuran Kunci Privat / Seed: 32 byte (256 bit)
- Ukuran Tanda Tangan: 64 byte (512 bit)
- Sifat: Deterministik (RFC 8032), Constant-Time (kebal side-channel attack), Nirsangkal (Non-repudiation)
"""

import os
import json
from typing import List, Dict, Any, Optional, Tuple
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.exceptions import InvalidSignature

# Inisial rantai hash genesis (64 karakter nol hex = 32 byte nol)
GENESIS_TAG = "0" * 64


def kanonis(catatan: Dict[str, Any]) -> bytes:
    """
    Mengubah dictionary catatan audit/sinkronisasi menjadi representasi bytes kanonis deterministik.
    
    PENTING (Slide 43):
    Jangan pernah menggunakan str(dict) untuk tanda tangan karena urutan kunci Python
    bisa bervariasi antar lingkungan. Gunakan serialisasi JSON dengan kunci terurut (sort_keys=True)
    dan pemisah tanpa spasi ekstra (separators=(',', ':')).
    """
    return json.dumps(catatan, sort_keys=True, separators=(',', ':')).encode("utf-8")


def validasi_catatan(catatan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Memvalidasi integritas struktur masukan catatan sebelum ditandatangani.
    Gagal tertutup: melempar ValueError jika field wajib tidak ada.
    """
    if not isinstance(catatan, dict):
        raise ValueError("Catatan harus berupa dictionary.")
    
    field_wajib = ["timestamp", "action", "item_id"]
    for f in field_wajib:
        if f not in catatan:
            raise ValueError(f"Catatan tidak sah: atribut wajib '{f}' tidak ditemukan.")
            
    return catatan


def pesan_berantai(ttd_sebelum: str, catatan: Dict[str, Any]) -> bytes:
    """
    Membentuk pesan gabungan untuk rantai tanda tangan integritas:
    Pesan = bytes(ttd_sebelum) || kanonis(validasi_catatan(catatan))
    
    Hal ini menjamin integritas urutan (mencegah penyerang menyisipkan, menukar,
    atau menghapus catatan di tengah riwayat audit tanpa merusak seluruh tanda tangan berikutnya).
    """
    if not isinstance(ttd_sebelum, str) or len(ttd_sebelum) != 64 and len(ttd_sebelum) != 128:
        # Jika bukan hex 32 byte (genesis) atau 64 byte (signature hex)
        raise ValueError("Format tanda tangan sebelumnya tidak valid.")
        
    return bytes.fromhex(ttd_sebelum) + kanonis(validasi_catatan(catatan))


def bangkitkan_pasangan_kunci() -> Tuple[ed25519.Ed25519PrivateKey, ed25519.Ed25519PublicKey]:
    """
    Membangkitkan pasangan kunci Ed25519 baru menggunakan CSPRNG sistem operasi.
    Kunci privat TIDAK BOLEH dikomit ke repositori.
    """
    privat = ed25519.Ed25519PrivateKey.generate()
    publik = privat.public_key()
    return privat, publik


def kunci_dari_seed(seed_32_bytes: bytes) -> ed25519.Ed25519PrivateKey:
    """
    Membangkitkan kunci privat Ed25519 dari raw seed 32-byte (misal hasil derivasi HKDF).
    """
    if not isinstance(seed_32_bytes, (bytes, bytearray)) or len(seed_32_bytes) != 32:
        raise ValueError("Seed Ed25519 harus berupa bytes dengan panjang tepat 32 byte.")
    return ed25519.Ed25519PrivateKey.from_private_bytes(bytes(seed_32_bytes))


def ekspor_kunci_publik_hex(kunci_publik: ed25519.Ed25519PublicKey) -> str:
    """
    Mengekspor kunci publik 32-byte ke representasi string Hex (64 karakter)
    yang aman disimpan atau dipublikasikan ke registry perangkat.
    """
    raw_bytes = kunci_publik.public_bytes_raw()
    return raw_bytes.hex()


def impor_kunci_publik_hex(hex_str: str) -> ed25519.Ed25519PublicKey:
    """
    Memuat kembali kunci publik dari string Hex 64 karakter.
    """
    if not isinstance(hex_str, str) or len(hex_str.strip()) != 64:
        raise ValueError("Kunci publik hex harus berukuran 64 karakter hex (32 byte).")
    raw_bytes = bytes.fromhex(hex_str.strip())
    return ed25519.Ed25519PublicKey.from_public_bytes(raw_bytes)


# ==============================================================================
# ALUR OPERASI: PENANDATANGANAN DI PERANGKAT & VERIFIKASI DI PENERIMA/SERVER
# ==============================================================================

def tandatangani_paket_sync(
    kunci_privat: ed25519.Ed25519PrivateKey,
    paket_sync: Dict[str, Any]
) -> str:
    """
    Menandatangani satu paket data sinkronisasi P2P tunggal di sisi perangkat.
    
    Returns:
        str: Tanda tangan digital Ed25519 dalam format Hex (128 karakter = 64 byte).
    """
    data_kanonis = kanonis(paket_sync)
    ttd_bytes = kunci_privat.sign(data_kanonis)
    return ttd_bytes.hex()


def verifikasi_paket_sync(
    kunci_publik: ed25519.Ed25519PublicKey,
    paket_sync: Dict[str, Any],
    ttd_hex: str
) -> bool:
    """
    Memverifikasi tanda tangan satu paket data sinkronisasi P2P di sisi penerima/server.
    Gagal tertutup: Mengembalikan False jika tanda tangan tidak sah atau data diubah.
    """
    try:
        data_kanonis = kanonis(paket_sync)
        ttd_bytes = bytes.fromhex(ttd_hex)
        kunci_publik.verify(ttd_bytes, data_kanonis)
        return True
    except (InvalidSignature, ValueError, Exception):
        return False


def tandatangani_rantai_audit(
    kunci_privat: ed25519.Ed25519PrivateKey,
    daftar_catatan: List[Dict[str, Any]],
    ttd_awal: str = GENESIS_TAG
) -> List[str]:
    """
    Menandatangani daftar riwayat perubahan brankas (audit log) secara berantai di perangkat.
    
    Alur Rantai:
    ttd[0] = Sign(GENESIS || kanonis(catatan[0]))
    ttd[1] = Sign(ttd[0]  || kanonis(catatan[1]))
    ...
    ttd[i] = Sign(ttd[i-1]|| kanonis(catatan[i]))
    
    Returns:
        List[str]: Daftar tanda tangan hex sepanjang daftar_catatan.
    """
    rantai_ttd = []
    t_prev = ttd_awal
    
    for c in daftar_catatan:
        data_pesan = pesan_berantai(t_prev, c)
        t_current = kunci_privat.sign(data_pesan).hex()
        rantai_ttd.append(t_current)
        t_prev = t_current
        
    return rantai_ttd


def verifikasi_rantai_audit(
    kunci_publik: ed25519.Ed25519PublicKey,
    daftar_catatan: List[Dict[str, Any]],
    rantai_ttd: List[str],
    ttd_awal: str = GENESIS_TAG
) -> Optional[int]:
    """
    Memverifikasi keutuhan rantai audit log di sisi penerima / server audit.
    Server HANYA memegang kunci publik sehingga mustahil memalsukan tanda tangan.
    
    Returns:
        None: Jika SELURUH rantai utuh dan terverifikasi sah.
        int: Indeks catatan pertama yang rusak/dimodifikasi jika terjadi kecurangan.
    """
    if len(daftar_catatan) != len(rantai_ttd):
        return min(len(daftar_catatan), len(rantai_ttd))
        
    t_prev = ttd_awal
    for i, (c, ttd) in enumerate(zip(daftar_catatan, rantai_ttd)):
        try:
            data_pesan = pesan_berantai(t_prev, c)
            ttd_bytes = bytes.fromhex(ttd)
            kunci_publik.verify(ttd_bytes, data_pesan)
        except (InvalidSignature, ValueError, Exception):
            # Prinsip Gagal Tertutup: Tangkap galat dan laporkan catatan indeks ke-i tidak sah
            return i
            
        t_prev = ttd
        
    return None
