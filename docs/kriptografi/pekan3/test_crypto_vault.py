import secrets
from base64 import b64encode
import pytest
from docs.kriptografi.pekan3.crypto_vault import VaultCryptoEngine


# UJI 1 (Positif): Enkripsi dan Dekripsi Sukses
def test_encrypt_decrypt_success():
    engine = VaultCryptoEngine()
    original_password = "SuperSecretPassword123!"

    encrypted_b64 = engine.encrypt_password(original_password)
    decrypted_password = engine.decrypt_password(encrypted_b64)

    assert encrypted_b64 != original_password
    assert decrypted_password == original_password


# UJI 2 (Negatif): Gagal Dekripsi saat Payload / Tampering Diubah (Integritas Terganggu)
def test_tampered_ciphertext_fails():
    engine = VaultCryptoEngine()
    original_password = "MyVaultPassword"

    encrypted_b64 = engine.encrypt_password(original_password)

    # Merusak data terenkripsi (tampering payload)
    raw_bytes = bytearray(
        encrypted_b64.encode("utf-8")
    )  # Merusak 1 karakter Base64
    raw_bytes[10] = ord("A") if raw_bytes[10] != ord("A") else ord("B")
    tampered_b64 = raw_bytes.decode("utf-8")

    with pytest.raises(Exception):
        engine.decrypt_password(tampered_b64)


# UJI 3 (Batas/Edge Case): Menguji Input Kosong & Proteksi Validasi Batas
def test_edge_case_empty_input():
    engine = VaultCryptoEngine()

    # Memastikan input string kosong ditolak oleh enkripsi
    with pytest.raises(
        ValueError, match="Password plaintext tidak boleh kosong."
    ):
        engine.encrypt_password("")

    # Memastikan input payload kosong ditolak oleh dekripsi
    with pytest.raises(ValueError, match="Payload Base64 tidak boleh kosong."):
        engine.decrypt_password("")


# UJI 4 (Vektor Uji / Negatif Kunci): Dekripsi Menggunakan Kunci Kriptografi yang Berbeda
def test_decrypt_with_wrong_key_fails():
    key1 = secrets.token_bytes(32)
    key2 = secrets.token_bytes(32)

    engine1 = VaultCryptoEngine(key=key1)
    engine2 = VaultCryptoEngine(key=key2)

    password = "KunciHarusSama123"
    encrypted_b64 = engine1.encrypt_password(password)

    # Engine2 mencoba mendekripsi payload yang dienkripsi oleh Engine1
    with pytest.raises(Exception):
        engine2.decrypt_password(encrypted_b64)