import os
import secrets
from base64 import b64decode, b64encode
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class VaultCryptoEngine:
    """Komponen Kriptografi Utama Stealth Vault menggunakan AES-256-GCM.

    Menangani Enkripsi, Dekripsi, dan Proteksi Integritas Data Password.
    """

    def __init__(self, key: bytes = None):
        if key is None:
            # Menggunakan CSPRNG (secrets) untuk menghasilkan kunci simetris 256-bit (32 bytes)
            self.key = secrets.token_bytes(32)
        else:
            if len(key) != 32:
                raise ValueError(
                    "Ukuran kunci harus 32 bytes (256 bits) untuk AES-256."
                )
            self.key = key

        self.aesgcm = AESGCM(self.key)

    def encrypt_password(
        self, plaintext_password: str, associated_data: str = "stealth_vault"
    ) -> str:
        """Mengenkripsi password plaintext menjadi ciphertext berformat Base64.

        Masukan: String Password (UTF-8)
        Proses: Menggenerate Nonce 96-bit (12 bytes), Enkripsi AES-GCM, Gabung Nonce + Ciphertext + Tag, Encode Base64
        Keluaran: String Base64
        """
        if not plaintext_password:
            raise ValueError("Password plaintext tidak boleh kosong.")

        # Konversi String ke Bytes menggunakan UTF-8 Encoding
        data_bytes = plaintext_password.encode("utf-8")
        aad_bytes = associated_data.encode("utf-8")

        # Nonce 96-bit (12 bytes) menggunakan os.urandom (CSPRNG)
        nonce = os.urandom(12)

        # Enkripsi & Pembentukan Authentication Tag
        ciphertext = self.aesgcm.encrypt(nonce, data_bytes, aad_bytes)

        # Menggabungkan Nonce + Ciphertext (termasuk Tag GCM di akhir)
        encrypted_payload = nonce + ciphertext

        # Encoding akhir ke bentuk String Base64 agar aman disimpan di DB/JSON
        return b64encode(encrypted_payload).decode("utf-8")

    def decrypt_password(
        self, base64_payload: str, associated_data: str = "stealth_vault"
    ) -> str:
        """Mendekripsi ciphertext Base64 kembali menjadi password plaintext.

        Masukan: String Base64
        Proses: Decode Base64, Ekstrak Nonce (12 bytes pertama), Dekripsi & Verifikasi Tag
        Keluaran: String Password Plaintext (UTF-8)
        """
        if not base64_payload:
            raise ValueError("Payload Base64 tidak boleh kosong.")

        try:
            raw_payload = b64decode(base64_payload.encode("utf-8"))
        except Exception as e:
            raise ValueError(f"Format Base64 tidak valid: {str(e)}")

        if len(raw_payload) < 28:  # 12 bytes nonce + 16 bytes auth tag minimum
            raise ValueError("Payload terlalu pendek atau rusak.")

        nonce = raw_payload[:12]
        ciphertext = raw_payload[12:]
        aad_bytes = associated_data.encode("utf-8")

        # Dekripsi dan Verifikasi Autentikasi/Integritas
        decrypted_bytes = self.aesgcm.decrypt(nonce, ciphertext, aad_bytes)

        return decrypted_bytes.decode("utf-8")