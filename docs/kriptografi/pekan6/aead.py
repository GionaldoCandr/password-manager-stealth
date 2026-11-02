"""
Modul Enkripsi Terautentikasi (AEAD - Authenticated Encryption with Associated Data)
Mata Kuliah: Kriptografi (052357) - Pekan 6 (Tugas 2)
Mahasiswa: Gionaldo Chandrawansah (105224031)

Standar Kriptografi:
- NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM)
- RFC 5116: An Interface and Algorithms for Authenticated Encryption
- OWASP Cryptographic Storage Cheat Sheet

Karakteristik Parameter:
- Algoritma: AES-256-GCM (Galois/Counter Mode)
- Panjang Kunci: 256 bit (32 byte)
- Ukuran Nonce / IV: 96 bit (12 byte) dibangkitkan via CSPRNG (os.urandom) unik per operasi
- Ukuran Authentication Tag: 128 bit (16 byte)
- Associated Data (AAD): Konteks aplikasi/domain terikat (contoh: 'situs:username')
- Sifat Kegagalan: Gagal Tertutup (Fail-Closed) melempar InvalidTag / ValueError tanpa membocorkan data
"""

import os
import base64
from typing import Optional, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag


class VaultAEADEngine:
    """
    Mesin Enkripsi Terautentikasi AES-256-GCM dengan jaminan integritas,
    kerahasiaan, dan pengikatan konteks data terasosiasi (AAD).
    """

    NONCE_SIZE_BYTES = 12   # 96 bit sesuai NIST SP 800-38D
    KEY_SIZE_BYTES = 32     # 256 bit
    TAG_SIZE_BYTES = 16     # 128 bit

    def __init__(self, key: bytes):
        """
        Inisialisasi mesin AEAD dengan kunci 256-bit.
        
        Args:
            key: Kunci simetris 32-byte (256-bit).
            
        Raises:
            ValueError: Jika kunci tidak valid atau panjangnya bukan 32 byte.
        """
        if not isinstance(key, (bytes, bytearray)):
            raise ValueError("Kunci enkripsi harus berupa bytes.")
        if len(key) != self.KEY_SIZE_BYTES:
            raise ValueError(f"Panjang kunci harus tepat {self.KEY_SIZE_BYTES} byte (256 bit), diterima: {len(key)} byte.")
            
        self._key = bytes(key)
        self._cipher = AESGCM(self._key)

    @classmethod
    def generate_random_key(cls) -> bytes:
        """
        Membangkitkan kunci simetris 256-bit baru menggunakan CSPRNG sistem operasi (os.urandom).
        """
        return os.urandom(cls.KEY_SIZE_BYTES)

    def encrypt(self, plaintext: str, aad: Optional[bytes] = None) -> str:
        """
        Mengenkripsi teks plaintext dengan AES-256-GCM dan mengikat integritas AAD.
        
        Struktur Payload Keluaran:
            Payload biner = Nonce (12 byte) + Ciphertext + Tag (16 byte)
            String Keluaran = Base64(Payload biner)
            
        Args:
            plaintext: Teks kata sandi yang akan dienkripsi (string non-kosong).
            aad: Data terasosiasi opsional untuk pengikatan konteks (bytes).
            
        Returns:
            str: Payload Base64 URL-safe / standard.
            
        Raises:
            ValueError: Jika plaintext bukan string atau kosong.
        """
        if not isinstance(plaintext, str):
            raise ValueError("Plaintext harus berupa string.")
        if len(plaintext) == 0:
            raise ValueError("Plaintext tidak boleh kosong (fail-closed input validation).")

        # Nonce 96-bit dibangkitkan secara acak murni menggunakan CSPRNG (os.urandom)
        # Menjamin probabilitas tabrakan nonce mendekati 0 untuk mencegah bencana Two-Time Pad
        nonce = os.urandom(self.NONCE_SIZE_BYTES)
        
        plaintext_bytes = plaintext.encode("utf-8")
        
        # Enkripsi AES-GCM menghasilkan ciphertext + tag autentikasi (16 byte) di ujung belakang
        ciphertext_and_tag = self._cipher.encrypt(nonce, plaintext_bytes, aad)
        
        # Susun payload terpadu: Nonce || Ciphertext || Tag
        encrypted_payload = nonce + ciphertext_and_tag
        return base64.b64encode(encrypted_payload).decode("utf-8")

    def decrypt(self, payload_b64: str, aad: Optional[bytes] = None) -> str:
        """
        Mendekripsi payload Base64 dan memverifikasi integritas autentikasi via AAD & Tag.
        
        Prinsip Gagal Tertutup (Fail-Closed):
        Jika payload diubah 1 bit saja, AAD tidak sesuai, atau kunci salah,
        proses verifikasi matematis GMAC akan gagal dan melempar InvalidTag.
        Plaintext TIDAK AKAN PERNAH didekripsi atau dikembalikan bila tag gagal.
        
        Args:
            payload_b64: Payload Base64 berisi Nonce + Ciphertext + Tag.
            aad: Data terasosiasi yang sama persis saat enkripsi.
            
        Returns:
            str: Plaintext asli (UTF-8).
            
        Raises:
            ValueError: Jika format Base64 atau ukuran payload tidak valid.
            InvalidTag: Jika data dimodifikasi, konteks AAD salah, atau kunci tidak cocok.
        """
        if not isinstance(payload_b64, str) or not payload_b64.strip():
            raise ValueError("Payload terenkripsi harus berupa string Base64 yang valid.")

        try:
            raw_payload = base64.b64decode(payload_b64, validate=True)
        except Exception as exc:
            raise ValueError("Gagal melakukan decoding Base64 pada payload.") from exc

        # Minimum panjang payload: Nonce (12B) + Minimal Ciphertext (1B) + Tag (16B) = 29 byte
        min_len = self.NONCE_SIZE_BYTES + self.TAG_SIZE_BYTES
        if len(raw_payload) <= min_len:
            raise ValueError(f"Ukuran payload terlalu pendek ({len(raw_payload)} byte). Minimum: {min_len + 1} byte.")

        nonce = raw_payload[:self.NONCE_SIZE_BYTES]
        ciphertext_and_tag = raw_payload[self.NONCE_SIZE_BYTES:]

        # Dekripsi dan verifikasi tag terautentikasi (otomatis melempar InvalidTag jika tidak sah)
        decrypted_bytes = self._cipher.decrypt(nonce, ciphertext_and_tag, aad)
        return decrypted_bytes.decode("utf-8")

    def split_payload(self, payload_b64: str) -> Tuple[bytes, bytes, bytes]:
        """
        Fungsi inspeksi analitis untuk memisahkan komponen kriptografis:
        Returns: (nonce_12_bytes, ciphertext_bytes, auth_tag_16_bytes)
        """
        raw = base64.b64decode(payload_b64)
        nonce = raw[:self.NONCE_SIZE_BYTES]
        ciphertext = raw[self.NONCE_SIZE_BYTES:-self.TAG_SIZE_BYTES]
        tag = raw[-self.TAG_SIZE_BYTES:]
        return nonce, ciphertext, tag

    def pack_payload(self, nonce: bytes, ciphertext: bytes, tag: bytes) -> str:
        """
        Fungsi perakit kembali payload dari komponen terpisah (digunakan untuk uji manipulasi bit).
        """
        if len(nonce) != self.NONCE_SIZE_BYTES:
            raise ValueError(f"Panjang nonce harus {self.NONCE_SIZE_BYTES} byte.")
        if len(tag) != self.TAG_SIZE_BYTES:
            raise ValueError(f"Panjang tag harus {self.TAG_SIZE_BYTES} byte.")
        return base64.b64encode(nonce + ciphertext + tag).decode("utf-8")
