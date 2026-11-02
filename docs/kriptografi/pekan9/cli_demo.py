"""
Skrip Peragaan Alur Tanda Tangan Digital Pekan 9 (Sesuai Slide 41)
Mata Kuliah: Kriptografi (052357)
Mahasiswa: Gionaldo Chandrawansah (105224031)

Alur Peragaan:
1. Sisi Perangkat (Mobile / PC Vault):
   - Membangkitkan pasangan kunci Ed25519 (kunci privat disimpan lokal aman).
   - Menyiapkan data catatan perubahan vault (audit log / paket sync).
   - Menandatangani catatan secara berantai dan menghasilkan tanda tangan digital.
2. Sisi Penerima / Server:
   - HANYA memegang kunci publik perangkat.
   - Memverifikasi catatan sah -> Menampilkan status UTUH.
   - Menguji manipulasi payload catatan -> Menampilkan status RUSAK & indeks terinfeksi.
   - Menguji verifikasi dengan kunci publik penyerang/perangkat lain -> Menampilkan status RUSAK.
"""

import sys
import json
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

try:
    from tanda_tangan import (
        bangkitkan_pasangan_kunci,
        ekspor_kunci_publik_hex,
        tandatangani_rantai_audit,
        verifikasi_rantai_audit,
        tandatangani_paket_sync,
        verifikasi_paket_sync,
    )
except ImportError:
    from .tanda_tangan import (
        bangkitkan_pasangan_kunci,
        ekspor_kunci_publik_hex,
        tandatangani_rantai_audit,
        verifikasi_rantai_audit,
        tandatangani_paket_sync,
        verifikasi_paket_sync,
    )


def jalankan_peragaan_alur():
    print("=" * 70)
    print("DEMONSTRASI ALUR TANDA TANGAN DIGITAL ED25519 (PEKAN 9)")
    print("Produk: Stealth Password Vault (Sinkronisasi & Audit Log Nirsangkal)")
    print("Mahasiswa: Gionaldo Chandrawansah (105224031)")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # 1. PERANGKAT: Pembangkitan Kunci & Penandatanganan
    # -------------------------------------------------------------------------
    print("\n[FASE 1: PERANGKAT VAULT (PENGIRIM)]")
    kunci_privat_device, kunci_publik_device = bangkitkan_pasangan_kunci()
    pub_hex = ekspor_kunci_publik_hex(kunci_publik_device)
    print(f"-> Kunci privat Ed25519 dibangkitkan (disimpan lokal di memori aman).")
    print(f"-> Kunci publik diekspor ke registry: {pub_hex}")

    catatan_audit = [
        {
            "timestamp": 1793610000,
            "action": "CREATE",
            "item_id": "vault-item-001",
            "service": "bca.co.id",
            "username": "gionaldo.c"
        },
        {
            "timestamp": 1793610500,
            "action": "UPDATE",
            "item_id": "vault-item-001",
            "service": "bca.co.id",
            "username": "gionaldo.c"
        },
        {
            "timestamp": 1793611000,
            "action": "CREATE",
            "item_id": "vault-item-002",
            "service": "github.com",
            "username": "GionaldoCandr"
        }
    ]
    print(f"-> Menandatangani {len(catatan_audit)} catatan riwayat perubahan secara berantai...")
    rantai_ttd = tandatangani_rantai_audit(kunci_privat_device, catatan_audit)
    for i, ttd in enumerate(rantai_ttd):
        print(f"   [Catatan {i}] Tanda Tangan: {ttd[:24]}...{ttd[-16:]}")

    # -------------------------------------------------------------------------
    # 2. SERVER / PENERIMA: Verifikasi Alur Sah
    # -------------------------------------------------------------------------
    print("\n[FASE 2: SERVER / PENERIMA SYNC (VERIFIKASI ALUR SAH)]")
    print("-> Server hanya memiliki kunci publik. Melakukan verifikasi rantai...")
    hasil_uji_1 = verifikasi_rantai_audit(kunci_publik_device, catatan_audit, rantai_ttd)
    if hasil_uji_1 is None:
        print(f"-> STATUS: UTUH ({len(catatan_audit)} catatan terverifikasi sah matematis)")
    else:
        print(f"-> STATUS: RUSAK pada indeks {hasil_uji_1}")

    # -------------------------------------------------------------------------
    # 3. SERVER / PENERIMA: Deteksi Manipulasi Data (Tampering)
    # -------------------------------------------------------------------------
    print("\n[FASE 3: PENGUJIAN NEGATIF - DETEKSI MANIPULASI DATA]")
    catatan_korup = [dict(c) for c in catatan_audit]
    # Penyerang mengubah username pada catatan indeks 1
    catatan_korup[1]["username"] = "penyerang_hacker"
    print("-> Simulasi penyerang memanipulasi catatan indeks 1 (username diubah)...")
    hasil_uji_2 = verifikasi_rantai_audit(kunci_publik_device, catatan_korup, rantai_ttd)
    if hasil_uji_2 is not None:
        print(f"-> STATUS: RUSAK (Manipulasi terdeteksi tepat pada catatan indeks {hasil_uji_2}!)")

    # -------------------------------------------------------------------------
    # 4. SERVER / PENERIMA: Deteksi Kunci Publik Lain / Penyerang
    # -------------------------------------------------------------------------
    print("\n[FASE 4: PENGUJIAN NEGATIF - VERIFIKASI DENGAN KUNCI LAIN]")
    _, kunci_publik_penyerang = bangkitkan_pasangan_kunci()
    print("-> Memverifikasi rantai asli menggunakan kunci publik perangkat lain...")
    hasil_uji_3 = verifikasi_rantai_audit(kunci_publik_penyerang, catatan_audit, rantai_ttd)
    if hasil_uji_3 is not None:
        print(f"-> STATUS: RUSAK (Kunci publik asing ditolak pada indeks {hasil_uji_3}!)")

    # -------------------------------------------------------------------------
    # 5. VERIFIKASI PAKET SYNC TUNGGAL
    # -------------------------------------------------------------------------
    print("\n[FASE 5: PENANDATANGANAN & VERIFIKASI PAKET SYNC TUNGGAL]")
    paket_p2p = {
        "device_id": "MOBILE-ANDROID-01",
        "command": "SYNC_VAULT_PART",
        "vault_version": "v1.0-final",
        "timestamp": 1793612000
    }
    ttd_single = tandatangani_paket_sync(kunci_privat_device, paket_p2p)
    valid_single = verifikasi_paket_sync(kunci_publik_device, paket_p2p, ttd_single)
    print(f"-> Tanda tangan paket tunggal: {ttd_single[:32]}...")
    print(f"-> Verifikasi paket tunggal asli : {valid_single} (SAH)")
    
    # Manipulasi paket
    paket_p2p_palsu = dict(paket_p2p)
    paket_p2p_palsu["command"] = "DELETE_ALL_VAULTS"
    valid_palsu = verifikasi_paket_sync(kunci_publik_device, paket_p2p_palsu, ttd_single)
    print(f"-> Verifikasi paket termanipulasi: {valid_palsu} (GAGAL TERTUTUP / DITOLAK)")

    print("\n" + "=" * 70)
    print("DEMONSTRASI SELESAI DENGAN SUKSES!")
    print("=" * 70)


if __name__ == "__main__":
    jalankan_peragaan_alur()
