```mermaid
graph LR
    %% Styling Global
    classDef main fill:#1a1a2e,stroke:#16c79a,stroke-width:3px,color:#ffffff,font-weight:bold,font-size:16px;
    classDef sub fill:#162447,stroke:#0f4c75,stroke-width:2px,color:#ffffff,font-weight:bold,font-size:14px;
    classDef item fill:#1f4068,stroke:#3282b8,stroke-width:1px,color:#e4e4e4,font-size:12px;

    %% Node Utama
    Main["STEALTH VAULT<br>INTERACTIVE ECOSYSTEM"]:::main

    %% Hubungan Utama ke Sub-Sistem
    Main --> Comp["🛡️ KEAMANAN KOMPUTASI"]:::sub
    Main --> Crypto["🔑 KRIPTOGRAFI"]:::sub
    Main --> WebProg["🌐 PEMROGRAMAN APLIKASI WEB"]:::sub

    %% Detail Keamanan Komputasi
    Comp --> C1["• Zero-Disk Footprint (RAM)"]:::item
    Comp --> C2["• Windows App Paths (Win+R)"]:::item
    Comp --> C3["• NTFS Alternate Data Stream"]:::item
    Comp --> C4["• Anti-Forensic Self-Delete"]:::item

    %% Detail Kriptografi
    Crypto --> CR1["• Argon2id (KDF Engine)"]:::item
    Crypto --> CR2["• AES-256-GCM Enkripsi"]:::item
    Crypto --> CR3["• File Chunk Partitioning"]:::item
    Crypto --> CR4["• CRDT Last-Write-Wins (LWW)"]:::item

    %% Detail Pemrograman Web
    WebProg --> W1["• Tauri v2 Framework (Rust)"]:::item
    WebProg --> W2["• IPC Command Bridge"]:::item
    WebProg --> W3["• Web Extension Manifest V3"]:::item
    WebProg --> W4["• Async Local HTTP Server"]:::item
