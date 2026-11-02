"""
Test Suite Pekan 9 — Tanda Tangan Digital Asimetris (Ed25519)
Mata Kuliah: Kriptografi (052357)
Mahasiswa: Gionaldo Chandrawansah (105224031)

Standar: RFC 8032 & Materi Kriptografi Minggu 09 (Slide 40)
Kriteria:
- Pengujian positif (alur sah, nirsangkal, kanonisasi deterministik)
- Pengujian negatif (manipulasi catatan, pemutusan rantai, pemalsuan ttd, kunci asing)
- Prinsip gagal tertutup (fail-closed)
"""

import os
import sys
import pytest
from cryptography.exceptions import InvalidSignature

# Pastikan path modul lokal terdeteksi
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

try:
    from tanda_tangan import (
        bangkitkan_pasangan_kunci,
        kunci_dari_seed,
        ekspor_kunci_publik_hex,
        impor_kunci_publik_hex,
        kanonis,
        validasi_catatan,
        pesan_berantai,
        tandatangani_rantai_audit,
        verifikasi_rantai_audit,
        tandatangani_paket_sync,
        verifikasi_paket_sync,
        GENESIS_TAG,
    )
except ImportError:
    from .tanda_tangan import (
        bangkitkan_pasangan_kunci,
        kunci_dari_seed,
        ekspor_kunci_publik_hex,
        impor_kunci_publik_hex,
        kanonis,
        validasi_catatan,
        pesan_berantai,
        tandatangani_rantai_audit,
        verifikasi_rantai_audit,
        tandatangani_paket_sync,
        verifikasi_paket_sync,
        GENESIS_TAG,
    )


# ==============================================================================
# FIXTURES
# ==============================================================================

@pytest.fixture
def device_keys():
    """Menghasilkan pasangan kunci Ed25519 sintetis milik perangkat."""
    return bangkitkan_pasangan_kunci()


@pytest.fixture
def sample_audit_logs():
    """Daftar catatan sintetis perubahan vault."""
    return [
        {"timestamp": 1000, "action": "CREATE", "item_id": "item-1", "service": "mail.com"},
        {"timestamp": 1005, "action": "UPDATE", "item_id": "item-1", "service": "mail.com"},
        {"timestamp": 1010, "action": "CREATE", "item_id": "item-2", "service": "bank.com"},
    ]


# ==============================================================================
# SKENARIO PENGUJIAN
# ==============================================================================

def test_t1_positif_rantai_bertanda_tangan_utuh(device_keys, sample_audit_logs):
    """
    Skenario T1 (Positif):
    Seluruh rantai catatan yang ditandatangani dengan kunci privat sah
    wajib diverifikasi berhasil tanpa kesalahan (menghasilkan None = UTUH).
    """
    priv_key, pub_key = device_keys
    rantai = tandatangani_rantai_audit(priv_key, sample_audit_logs)
    
    assert len(rantai) == len(sample_audit_logs)
    hasil = verifikasi_rantai_audit(pub_key, sample_audit_logs, rantai)
    assert hasil is None, "Rantai yang sah harus terverifikasi utuh (None)."


def test_t2_negatif_data_catatan_dimanipulasi(device_keys, sample_audit_logs):
    """
    Skenario T2 (Negatif):
    Jika salah satu data catatan pada rantai diubah (misal action atau service),
    proses verifikasi wajib mendeteksi manipulasi tepat pada indeks catatan tersebut.
    """
    priv_key, pub_key = device_keys
    rantai = tandatangani_rantai_audit(priv_key, sample_audit_logs)
    
    # Manipulasi catatan indeks 1
    tampered_logs = [dict(c) for c in sample_audit_logs]
    tampered_logs[1]["service"] = "hacked-site.com"
    
    hasil = verifikasi_rantai_audit(pub_key, tampered_logs, rantai)
    assert hasil == 1, "Manipulasi pada catatan indeks 1 harus terdeteksi di indeks 1."


def test_t3_negatif_catatan_dihapus_dari_rantai(device_keys, sample_audit_logs):
    """
    Skenario T3 (Negatif - Deletion Attack):
    Jika penyerang menghapus satu catatan dan tanda tangannya dari tengah rantai,
    rantai penanda terputus karena ttd[i] bergantung pada ttd[i-1].
    """
    priv_key, pub_key = device_keys
    rantai = tandatangani_rantai_audit(priv_key, sample_audit_logs)
    
    # Hapus elemen indeks 1 dari log dan rantai
    truncated_logs = [sample_audit_logs[0], sample_audit_logs[2]]
    truncated_rantai = [rantai[0], rantai[2]]
    
    # Verifikasi catatan indeks 1 (yang tadinya indeks 2) harus gagal karena ttd_prev tidak cocok
    hasil = verifikasi_rantai_audit(pub_key, truncated_logs, truncated_rantai)
    assert hasil == 1, "Penghapusan catatan harus merusak keterikatan rantai pada indeks 1."


def test_t4_negatif_kunci_publik_perangkat_lain(sample_audit_logs):
    """
    Skenario T4 (Negatif):
    Memverifikasi rantai menggunakan kunci publik milik perangkat/penyerang lain
    harus ditolak seketika pada catatan pertama (indeks 0).
    """
    priv_a, pub_a = bangkitkan_pasangan_kunci()
    _, pub_b = bangkitkan_pasangan_kunci()  # Kunci publik asing
    
    rantai = tandatangani_rantai_audit(priv_a, sample_audit_logs)
    hasil = verifikasi_rantai_audit(pub_b, sample_audit_logs, rantai)
    assert hasil == 0, "Kunci publik yang tidak cocok wajib ditolak pada catatan pertama (indeks 0)."


def test_t5_negatif_tanda_tangan_palsu(device_keys, sample_audit_logs):
    """
    Skenario T5 (Negatif):
    Jika penyerang mengubah 1 byte saja pada string hex tanda tangan,
    pemeriksaan Ed25519 gagal dan melaporkan indeks yang tidak sah.
    """
    priv_key, pub_key = device_keys
    rantai = tandatangani_rantai_audit(priv_key, sample_audit_logs)
    
    # Rusak tanda tangan indeks 0
    raw_ttd = bytearray.fromhex(rantai[0])
    raw_ttd[0] ^= 0xFF
    tampered_rantai = [raw_ttd.hex()] + rantai[1:]
    
    hasil = verifikasi_rantai_audit(pub_key, sample_audit_logs, tampered_rantai)
    assert hasil == 0, "Tanda tangan yang rusak pada indeks 0 harus ditolak di indeks 0."


def test_t6_positif_dan_negatif_paket_sync_tunggal(device_keys):
    """
    Skenario T6:
    Menguji alur penandatanganan dan verifikasi paket sinkronisasi P2P tunggal.
    - Sah: mengembalikan True
    - Dipalsukan: mengembalikan False (fail-closed)
    """
    priv_key, pub_key = device_keys
    paket = {
        "device_id": "PC-WINDOWS-VAULT",
        "action": "SYNC_PUSH",
        "payload_hash": "a1b2c3d4e5f6",
        "timestamp": 123456789
    }
    
    # Uji positif
    ttd = tandatangani_paket_sync(priv_key, paket)
    assert isinstance(ttd, str) and len(ttd) == 128  # 64 byte hex
    assert verifikasi_paket_sync(pub_key, paket, ttd) is True
    
    # Uji negatif (modifikasi data)
    paket_palsu = dict(paket)
    paket_palsu["payload_hash"] = "ffffffffffff"
    assert verifikasi_paket_sync(pub_key, paket_palsu, ttd) is False


def test_t7_kanonisasi_deterministik():
    """
    Skenario T7 (Kriptografis - Kanonisasi):
    Memastikan representasi bytes kanonis identik meskipun urutan penulisan key berbeda di memory.
    """
    dict1 = {"timestamp": 100, "action": "A", "item_id": "1"}
    dict2 = {"item_id": "1", "timestamp": 100, "action": "A"}
    
    assert kanonis(dict1) == kanonis(dict2)
    assert kanonis(dict1) == b'{"action":"A","item_id":"1","timestamp":100}'


def test_t8_kunci_dari_seed_deterministik():
    """
    Skenario T8 (RFC 8032):
    Pembangkitan kunci privat dari seed 32-byte yang sama selalu menghasilkan
    kunci publik yang sama secara deterministik.
    """
    seed = b"\x07" * 32
    k1 = kunci_dari_seed(seed)
    k2 = kunci_dari_seed(seed)
    
    assert ekspor_kunci_publik_hex(k1.public_key()) == ekspor_kunci_publik_hex(k2.public_key())


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v", "--tb=short"]))
