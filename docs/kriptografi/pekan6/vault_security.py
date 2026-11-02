"""
Modul Keamanan Vault (Integrasi KDF, AEAD, & Pengelolaan Kunci Luar Repositori)
Mata Kuliah: Kriptografi (052357) - Pekan 6 (Tugas 2)
Mahasiswa: Gionaldo Chandrawansah (105224031)

Ketentuan Rubrik K3:
- Kunci dibangkitkan dengan CSPRNG dan disimpan di luar repository.
- Tidak ada hardcoded credentials/secrets.
- Penanganan masukan divalidasi dan bersifat gagal tertutup (fail-closed).
"""

import os
import base64
from typing import Dict, Any, Optional
from cryptography.exceptions import InvalidTag

try:
    from .aead import VaultAEADEngine
    from .kdf import derive_master_key_from_password, separate_keys_hkdf
except ImportError:
    from aead import VaultAEADEngine
    from kdf import derive_master_key_from_password, separate_keys_hkdf


class VaultKeyManager:
    """
    Pengelola Kunci Kriptografi Brankas (Zero Secrets in Repository).
    Kunci hanya diambil dari environment variable sistem atau dibangkitkan via CSPRNG.
    """

    ENV_KEY_NAME = "STEALTH_VAULT_MASTER_KEY"

    @classmethod
    def load_master_key_from_env(cls) -> Optional[bytes]:
        """
        Mengambil kunci enkripsi dari Environment Variable sistem operasi.
        Menjamin tidak ada kunci privat/rahasia yang tersimpan di dalam berkas repositori git.
        """
        env_val = os.getenv(cls.ENV_KEY_NAME)
        if not env_val:
            return None
        
        # Mendukung encoding hex (64 karakter) atau base64 (44 karakter)
        env_val = env_val.strip()
        try:
            if len(env_val) == 64:
                key = bytes.fromhex(env_val)
            else:
                key = base64.b64decode(env_val)
            if len(key) == 32:
                return key
        except Exception:
            pass
        return None

    @classmethod
    def generate_and_export_env_key(cls) -> str:
        """
        Membangkitkan master key 256-bit baru berbasis CSPRNG dan memformatnya sebagai string Hex
        untuk diatur pada environment variable sistem host (misal: export STEALTH_VAULT_MASTER_KEY=...).
        """
        key_bytes = os.urandom(32)
        return key_bytes.hex()


class SecureVaultService:
    """
    Layanan Brankas Kredensial Terautentikasi (High-Level Service).
    Mengintegrasikan KDF (HKDF), Enkripsi AEAD (AES-256-GCM), dan Context Binding (AAD).
    """

    def __init__(self, master_key: bytes):
        """
        Inisialisasi layanan brankas dengan master key 256-bit.
        Melakukan Key Separation via HKDF untuk memisahkan kunci enkripsi vault.
        """
        if not isinstance(master_key, (bytes, bytearray)) or len(master_key) != 32:
            raise ValueError("Master key harus tepat 32 byte (256-bit).")
            
        # Pisahkan kunci untuk enkripsi via HKDF (RFC 5869)
        self.enc_key, self.auth_key = separate_keys_hkdf(master_key)
        self.aead_engine = VaultAEADEngine(self.enc_key)

    @classmethod
    def from_master_password(cls, master_password: str, salt: bytes = None) -> "SecureVaultService":
        """
        Pabrikasi layanan brankas dari kata sandi utama pengguna menggunakan PBKDF2 (600.000 iterasi).
        """
        derived_key, _ = derive_master_key_from_password(master_password, salt=salt)
        return cls(derived_key)

    @staticmethod
    def build_aad(service_name: str, username: str) -> bytes:
        """
        Membangun Additional Authenticated Data (AAD) untuk pengikatan konteks keamanan entri brankas.
        Format: "situs:username" dalam representasi bytes UTF-8.
        
        Mencegah 'Ciphertext Transplant Attack': Ciphertext tidak dapat disalin antar akun atau domain.
        """
        if not isinstance(service_name, str) or not service_name.strip():
            raise ValueError("service_name tidak boleh kosong untuk pembentukan AAD.")
        if not isinstance(username, str) or not username.strip():
            raise ValueError("username tidak boleh kosong untuk pembentukan AAD.")
            
        context_str = f"{service_name.strip()}:{username.strip()}"
        return context_str.encode("utf-8")

    def encrypt_credential(self, service_name: str, username: str, password_plain: str) -> Dict[str, Any]:
        """
        Mengenkripsi kata sandi akun brankas dengan konteks AAD terikat.
        
        Returns:
            Dict berisi entri brankas terautentikasi (data sintetis yang aman disimpan).
        """
        aad = self.build_aad(service_name, username)
        encrypted_payload_b64 = self.aead_engine.encrypt(password_plain, aad=aad)
        
        return {
            "service_name": service_name,
            "username": username,
            "encrypted_password": encrypted_payload_b64,
            "aad_context": aad.decode("utf-8"),
            "algorithm": "AES-256-GCM",
            "kdf": "HKDF-SHA256"
        }

    def decrypt_credential(self, entry: Dict[str, Any]) -> str:
        """
        Mendekripsi kata sandi akun brankas dan memvalidasi keutuhan tag serta integritas konteks AAD.
        
        Raises:
            ValueError: Jika parameter entri tidak lengkap / rusak.
            InvalidTag: Jika integritas data terkompromi (manipulasi payload, tag, atau AAD mismatch).
        """
        if not isinstance(entry, dict):
            raise ValueError("Format entri kredensial harus berupa dictionary.")
            
        required_fields = ["service_name", "username", "encrypted_password"]
        for field in required_fields:
            if field not in entry:
                raise ValueError(f"Entri tidak valid: atribut '{field}' wajib ada.")
                
        aad = self.build_aad(entry["service_name"], entry["username"])
        decrypted_password = self.aead_engine.decrypt(entry["encrypted_password"], aad=aad)
        return decrypted_password
