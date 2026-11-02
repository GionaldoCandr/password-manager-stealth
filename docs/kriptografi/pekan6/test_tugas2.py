"""
Test Suite Tugas 2 — Enkripsi Terautentikasi dan Integritas Data (AES-256-GCM)
Mata Kuliah: Kriptografi (052357) - Pekan 6
Mahasiswa: Gionaldo Chandrawansah (105224031)

Ketentuan Rubrik K4 (25 Poin):
- Minimal 4 skenario uji (dibuat 7 skenario komprehensif)
- Data atau tag yang dimodifikasi dan kunci yang salah wajib ditolak
- Pengujian kegagalan tertutup (fail-closed)
- Data pengujian menggunakan data sintetis (zero real secrets)
"""

import os
import sys
import base64
import pytest
from cryptography.exceptions import InvalidTag

# Pastikan path modul lokal terdeteksi dengan baik terlepas dari lokasi eksekusi
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

try:
    from aead import VaultAEADEngine
    from kdf import derive_master_key_from_password, separate_keys_hkdf
    from vault_security import SecureVaultService, VaultKeyManager
except ImportError:
    from .aead import VaultAEADEngine
    from .kdf import derive_master_key_from_password, separate_keys_hkdf
    from .vault_security import SecureVaultService, VaultKeyManager


# ==============================================================================
# FIXTURES (Data Sintetis Aman untuk Pengujian)
# ==============================================================================

@pytest.fixture
def master_key():
    """Membangkitkan master key sintetis 256-bit acak menggunakan CSPRNG."""
    return os.urandom(32)


@pytest.fixture
def aead_engine(master_key):
    """Menyediakan instans VaultAEADEngine yang valid."""
    return VaultAEADEngine(master_key)


@pytest.fixture
def vault_service(master_key):
    """Menyediakan instans SecureVaultService yang terintegrasi."""
    return SecureVaultService(master_key)


# ==============================================================================
# SKENARIO 1: ENKRIPSI & DEKRIPSI SAH (POSITIF / ROUNDTRIP)
# ==============================================================================

def test_skenario_1_enkripsi_dekripsi_valid_roundtrip(aead_engine, vault_service):
    """
    Skenario 1 (Positif):
    Memastikan bahwa kredensial plaintext yang sah dapat dienkripsi dan didekripsi kembali
    dengan hasil yang 100% identik menggunakan AES-256-GCM dan konteks AAD yang cocok.
    """
    # Uji 1A: Pengujian tingkat rendah engine AEAD
    plain_password = "Kombinasi!Rahasia#2026Sintetis"
    aad = b"situs.kampus.ac.id:mahasiswa105224031"
    
    encrypted_b64 = aead_engine.encrypt(plain_password, aad=aad)
    assert isinstance(encrypted_b64, str)
    assert len(encrypted_b64) > 0
    
    decrypted = aead_engine.decrypt(encrypted_b64, aad=aad)
    assert decrypted == plain_password

    # Uji 1B: Pengujian tingkat tinggi service vault
    vault_entry = vault_service.encrypt_credential(
        service_name="portal-akademik.univ.id",
        username="gionaldo.c",
        password_plain="SandiSuperKuat_999!"
    )
    assert vault_entry["algorithm"] == "AES-256-GCM"
    assert vault_entry["kdf"] == "HKDF-SHA256"
    
    recovered = vault_service.decrypt_credential(vault_entry)
    assert recovered == "SandiSuperKuat_999!"


# ==============================================================================
# SKENARIO 2: PENOLAKAN MODIFIKASI CIPHERTEXT (BIT-FLIPPING ATTACK)
# ==============================================================================

def test_skenario_2_tolak_modifikasi_ciphertext_bitflip(aead_engine):
    """
    Skenario 2 (Negatif):
    Memastikan jika penyerang mengubah 1 bit saja pada ciphertext di media penyimpanan,
    AES-256-GCM mendeteksinya via Authentication Tag dan menolak dengan InvalidTag.
    Data rusak TIDAK PERNAH dikembalikan ke pemanggil.
    """
    plain = "SandiTransaksiPerbankan#123"
    aad = b"bank.sintetis.com:nasabah"
    payload = aead_engine.encrypt(plain, aad=aad)
    
    # Pecah payload menjadi komponen: nonce, ciphertext, tag
    nonce, ciphertext, tag = aead_engine.split_payload(payload)
    
    # Lakukan bit-flip pada byte pertama ciphertext
    tampered_ciphertext = bytes([ciphertext[0] ^ 0x01]) + ciphertext[1:]
    
    # Rangkai kembali payload yang telah dirusak
    tampered_payload = aead_engine.pack_payload(nonce, tampered_ciphertext, tag)
    
    # Verifikasi bahwa operasi dekripsi WAJIB gagal tertutup melempar InvalidTag
    with pytest.raises(InvalidTag):
        aead_engine.decrypt(tampered_payload, aad=aad)


# ==============================================================================
# SKENARIO 3: PENOLAKAN MODIFIKASI AUTHENTICATION TAG
# ==============================================================================

def test_skenario_3_tolak_modifikasi_auth_tag(aead_engine):
    """
    Skenario 3 (Negatif):
    Memastikan jika Authentication Tag (128-bit) di ujung payload dipalsukan atau diubah,
    pemeriksaan integritas gagal seketika dan melempar InvalidTag.
    """
    plain = "KredensialAdminRahasia!@#"
    aad = b"server-admin:root"
    payload = aead_engine.encrypt(plain, aad=aad)
    
    nonce, ciphertext, tag = aead_engine.split_payload(payload)
    
    # Manipulasi 1 byte pada tag autentikasi
    tampered_tag = tag[:-1] + bytes([tag[-1] ^ 0xFF])
    tampered_payload = aead_engine.pack_payload(nonce, ciphertext, tampered_tag)
    
    with pytest.raises(InvalidTag):
        aead_engine.decrypt(tampered_payload, aad=aad)


# ==============================================================================
# SKENARIO 4: PENOLAKAN PEMINDAHAN KONTEKS AAD (CIPHERTEXT TRANSPLANT ATTACK)
# ==============================================================================

def test_skenario_4_tolak_pemindahan_konteks_aad_ciphertext_transplant(vault_service):
    """
    Skenario 4 (Negatif):
    Membuktikan pertahanan terhadap serangan pemindahan ciphertext (Ciphertext Transplant).
    Jika penyerang menyalin ciphertext dari 'situs-a' dan mencoba memasangnya di 'situs-b',
    dekripsi wajib ditolak karena pengikatan AAD ('situs:username') tidak cocok secara matematis.
    """
    # Korban menyimpan sandi untuk situs A
    entry_situs_a = vault_service.encrypt_credential(
        service_name="layanan-keuangan.com",
        username="korban_user",
        password_plain="PinRahasiaDompet#77"
    )
    
    # Penyerang mencoba memindahkan payload ciphertext yang sama ke akun situs B
    entry_transplanted = {
        "service_name": "media-sosial.com",  # Disalin ke layanan yang berbeda!
        "username": "korban_user",
        "encrypted_password": entry_situs_a["encrypted_password"]
    }
    
    # Verifikasi bahwa dekripsi DITOLAK karena AAD mismatch
    with pytest.raises(InvalidTag):
        vault_service.decrypt_credential(entry_transplanted)


# ==============================================================================
# SKENARIO 5: PENOLAKAN DEKRIPSI DENGAN KUNCI SALAH
# ==============================================================================

def test_skenario_5_tolak_kunci_salah(aead_engine):
    """
    Skenario 5 (Negatif):
    Memastikan bahwa mendekripsi dengan kunci berbeda (walaupun panjangnya sama 256-bit)
    akan langsung ditolak dengan InvalidTag dan tidak membocorkan data terdistorsi.
    """
    plain = "TokenApiGitHubSintetis_ghp_xxxxxxxxxxxx"
    aad = b"github.com:developer"
    payload = aead_engine.encrypt(plain, aad=aad)
    
    # Bangkitkan kunci penyerang yang salah
    wrong_key = os.urandom(32)
    wrong_engine = VaultAEADEngine(wrong_key)
    
    with pytest.raises(InvalidTag):
        wrong_engine.decrypt(payload, aad=aad)


# ==============================================================================
# SKENARIO 6: VALIDASI MASUKAN GAGAL TERTUTUP (FAIL-CLOSED INPUT VALIDATION)
# ==============================================================================

def test_skenario_6_validasi_masukan_gagal_tertutup_fail_closed(aead_engine):
    """
    Skenario 6 (Batas / Edge Cases):
    Memastikan sistem memvalidasi masukan secara ketat sebelum proses kriptografi:
    - Plaintext kosong atau tipe tidak valid melempar ValueError
    - Payload Base64 rusak atau ukuran lebih pendek dari (Nonce + Tag) melempar ValueError
    - Panjang kunci salah melempar ValueError
    """
    # 6A: Masukan plaintext tidak valid
    with pytest.raises(ValueError, match="Plaintext tidak boleh kosong"):
        aead_engine.encrypt("")
        
    with pytest.raises(ValueError, match="Plaintext harus berupa string"):
        aead_engine.encrypt(None)  # type: ignore

    # 6B: Payload base64 korup
    with pytest.raises(ValueError, match="Gagal melakukan decoding Base64"):
        aead_engine.decrypt("%%%Bukan-Base64-Yang-Valid%%%")

    # 6C: Payload terlalu pendek (kurang dari 28 byte)
    short_payload = base64.b64encode(b"terlalu_pendek").decode("utf-8")
    with pytest.raises(ValueError, match="Ukuran payload terlalu pendek"):
        aead_engine.decrypt(short_payload)

    # 6D: Inisialisasi engine dengan kunci salah ukuran
    with pytest.raises(ValueError, match="Panjang kunci harus tepat 32 byte"):
        VaultAEADEngine(os.urandom(16))  # 128 bit ditolak, wajib 256 bit


# ==============================================================================
# SKENARIO 7: KEUNIKAN NONCE CSPRNG (MENCEGAH TWO-TIME PAD BENCANA GCM)
# ==============================================================================

def test_skenario_7_keunikan_nonce_csprng(aead_engine):
    """
    Skenario 7 (Kriptografis - Nonce Uniqueness):
    Menguji bahwa 500 enkripsi berturut-turut untuk plaintext yang sama menghasilkan
    500 nonce 96-bit yang semuanya unik tanpa ada satu pun duplikasi (tabrakan = 0).
    Hal ini menjamin kepatuhan terhadap NIST SP 800-38D guna mencegah bencana Two-Time Pad.
    """
    plain = "SandiTetapSama123!"
    aad = b"test:unique"
    
    seen_nonces = set()
    total_samples = 500
    
    for _ in range(total_samples):
        payload = aead_engine.encrypt(plain, aad=aad)
        nonce, _, _ = aead_engine.split_payload(payload)
        assert len(nonce) == 12  # Tepat 96 bit
        assert nonce not in seen_nonces, "Terdeteksi tabrakan nonce (Two-Time Pad Hazard)!"
        seen_nonces.add(nonce)
        
    assert len(seen_nonces) == total_samples


if __name__ == "__main__":
    # Jalankan pytest secara otomatis jika berkas ini dieksekusi langsung dengan Python
    sys.exit(pytest.main([__file__, "-v", "--tb=short"]))
