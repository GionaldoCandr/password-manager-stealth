# Data Flow Diagram (DFD) - Stealth Password Vault

## 1. Diagram Aliran Data (Mermaid Format)

```mermaid
graph TD
    subgraph EE [External Entities]
        EE1[EE1: User / Pengguna]
        EE2[EE2: Web Browser Form Target Site]
    end

    subgraph Processes [Processes / Applications]
        P1["P1: Stealth Desktop App Engine (Rust / Tauri v2)"]
        P2["P2: Browser Extension Service Worker (Manifest V3)"]
        P3["P3: Mobile App Replicator (Android)"]
    end

    subgraph Data_Stores [Data Stores]
        DS1[("DS1: In-Memory Decrypted Vault (RAM Only)")]
        DS2[("DS2: NTFS ADS Encrypted Store (vault_store.bin)")]
        DS3[("DS3: HKCU Win+R App Paths Registry")]
        DS4[("DS4: Mobile Encrypted Storage (SQLite)")]
    end

    EE1 -->|"F1: Master Password & Win+R Trigger"| P1
    EE2 -->|"F2: Captured Login Form Data"| P2
    P2 -->|"F3: Local HTTP Sync Payload (Port 14201)"| P1
    
    P1 <-->|"F4: In-Memory Decryption & Zeroize Wiping"| DS1
    P1 <-->|"F5: AES-256-GCM Encrypted Read/Write"| DS2
    P1 -->|"F6: Win+R Registry Alias Injection"| DS3
    
    P1 <-->|"F7: Local P2P Sync Stream (UDP 14202)"| P3
    P3 <-->|"F8: Local Mobile Storage Read/Write"| DS4
    EE1 <-->|"F9: QR Code Pairing Handshake"| P3

    %% Trust Boundaries
    TB1[/"Trust Boundary 1: User / Host OS to Core Engine Process"/]
    TB2[/"Trust Boundary 2: Loopback IPC Gateway (127.0.0.1:14201)"/]
    TB3[/"Trust Boundary 3: Local Network P2P Channel (UDP 14202)"/]