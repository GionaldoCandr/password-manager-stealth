import pytest
from docs.kriptografi.classic_cipher import affine_decrypt, affine_encrypt


# Uji 1: Skenario Normal (Enkripsi & Dekripsi)
def test_affine_cipher_success():
    plaintext = "STEALTHVAULT"
    a, b = 5, 8

    ciphertext = affine_encrypt(plaintext, a, b)
    decrypted = affine_decrypt(ciphertext, a, b)

    assert decrypted == plaintext


# Uji 2: Skenario Error Handling (Kunci Invalid)
def test_affine_cipher_invalid_key():
    plaintext = "STEALTHVAULT"
    a, b = 4, 8  # FPB(4, 26) = 2 != 1

    with pytest.raises(
        ValueError, match="Kunci 'a' harus relatif prima dengan 26."
    ):
        affine_encrypt(plaintext, a, b)