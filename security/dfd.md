# Data Flow Diagram (DFD) - Stealth Password Vault

Dokumen ini menggambarkan diagram aliran data (Level 0 / Level 1) untuk ekosistem Stealth Password Vault beserta *Trust Boundaries* dan penandaan proteksi kriptografi pada setiap aliran data.

## 1. Diagram Aliran Data (Mermaid Format)

```mermaid
graph TD
    %% External Entities
    subgraph External_Entities [External Entities]
        EE1[User / Pengguna]
        EE2[Web Browser Form / Target Site]
    end

    %% Processes
    subgraph Processes [Processes / Applications]
        P1["P1: Stealth Desktop App Engine (Rust / Tauri v2)"]
        P2["P2: Browser Extension (Manifest V3 Service Worker)"]
        P3["P3: Mobile App (Android CRDT Replicator)"]
    end

    %% Data Stores
    subgraph Data_Stores [Data Stores]
        DS1[("DS1: In-Memory Decrypted Vault (RAM Only)")]
        DS2[("DS2: NTFS ADS Encrypted Store (vault_store.bin)")]
        DS3[("DS3: HKCU Win+R App Paths Registry")]
        DS4[("DS4: Mobile Encrypted Vault (Local SQLite)")]
    end

    %% Data Flows
    EE1 -->|"F1: Master Password & Win+R Trigger"| P1
    EE2 -->|"F2: Captured Login Form Data"| P2
    P2 -->|"F3: Local HTTP Sync Payload (Port 14201 / JSON Token)"| P1
    
    P1 <-->|"F4: In-Memory Decryption & Zeroize Wiping"| DS1
    P1 <-->|"F5: AES-256-GCM Encrypted Read/Write"| DS2
    P1 -->|"F6: Win+R Registry Alias Injection"| DS3
    
    P1 <-->|"F7: Local P2P Sync Stream (UDP 14202 / AES-256-GCM + CRDT LWW)"| P3
    P3 <-->|"F8: Local Mobile Encrypted Storage Read/Write"| DS4
    EE1 <-->|"F9: QR Code Pairing Handshake"| P3

    %% Trust Boundaries
    classDef boundary fill:none,stroke:#ff0000,stroke-width:2px,stroke-dasharray: 5 5;