import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ShieldCheck,
  LogOut,
  Smartphone,
  Eye,
  EyeOff,
  Copy,
  Edit3,
  Trash2,
  RefreshCw,
  Wifi,
  Dices,
} from "lucide-react";
import QrScannerModal from "./components/QrScannerModal";

export default function AppMobile() {
  const [masterPasswordInput, setMasterPasswordInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Storage IP PC Terpasang
  const [savedPcIp, setSavedPcIp] = useState(
    () => localStorage.getItem("STEALTH_PC_IP") || ""
  );

  // Form Input CRUD
  const [siteInput, setSiteInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("Kampus");
  const [editingId, setEditingId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    if (isUnlocked) {
      loadLocalItems();
    }
  }, [isUnlocked]);

  const loadLocalItems = async () => {
    try {
      if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
        const jsonRes = await invoke("unlock_vault", {
          masterPassword: masterPasswordInput,
        });
        setItems(JSON.parse(jsonRes));
      } else {
        const localData = localStorage.getItem("STEALTH_VAULT_ITEMS");
        if (localData) setItems(JSON.parse(localData));
      }
    } catch (err) {
      console.error("Gagal muat data lokal:", err);
    }
  };

  const handleUnlock = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    try {
      if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
        const jsonRes = await invoke("unlock_vault", {
          masterPassword: masterPasswordInput,
        });
        setItems(JSON.parse(jsonRes));
        setIsUnlocked(true);
      } else {
        if (masterPasswordInput === "admin123") {
          setIsUnlocked(true);
        } else {
          setErrorMsg("Master Password Salah!");
        }
      }
    } catch (err) {
      setErrorMsg(String(err));
    }
  };

  const handleGeneratePassword = async () => {
    try {
      if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
        const genPass = await invoke("generate_password", {
          length: 16,
          includeSymbols: true,
        });
        setPasswordInput(genPass);
      } else {
        const chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
        let pass = "";
        for (let i = 0; i < 16; i++) {
          pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPasswordInput(pass);
      }
    } catch (err) {
      console.error("Gagal generate password:", err);
    }
  };

  // SINKRONISASI P2P KE PC (Mengirimkan daftar item spesifik secara eksplisit)
  const executeTwoWaySyncWithItems = async (targetIp, currentLocalItems) => {
    if (!targetIp) return;
    setIsSyncing(true);
    setStatusMsg("Menghubungkan ke PC...");

    try {
      if (navigator.vibrate) navigator.vibrate(100);

      // 1. Ambil data dari PC (GET)
      const response = await fetch(`http://${targetIp}:14202/api/sync`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      let pcItems = [];
      if (response.ok) {
        pcItems = await response.json();
      }

      // 2. Gabungkan data berbasis Timestamp (CRDT Merge)
      const mergedMap = new Map();

      [...pcItems, ...currentLocalItems].forEach((item) => {
        if (
          !mergedMap.has(item.id) ||
          item.updated_at >= mergedMap.get(item.id).updated_at
        ) {
          mergedMap.set(item.id, item);
        }
      });

      const finalMergedItems = Array.from(mergedMap.values());

      // 3. Kirim data gabungan ke PC (POST)
      const postRes = await fetch(`http://${targetIp}:14202/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault_items: finalMergedItems }),
      });

      if (!postRes.ok) {
        throw new Error("PC menolak menyimpan data!");
      }

      // 4. Update UI & Penyimpanan Lokal HP
      setItems(finalMergedItems);
      if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
        await invoke("import_vault_data", {
          importedJson: JSON.stringify(finalMergedItems),
        });
      } else {
        localStorage.setItem(
          "STEALTH_VAULT_ITEMS",
          JSON.stringify(finalMergedItems)
        );
      }

      localStorage.setItem("STEALTH_PC_IP", targetIp);
      setSavedPcIp(targetIp);

      setStatusMsg("✅ Berhasil Disimpan & Disinkron ke PC!");
    } catch (err) {
      console.error("Gagal Sync:", err);
      setStatusMsg("⚠️ Tersimpan di HP (PC Offline / Beda Wi-Fi)");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleScanSuccess = async (p2pData) => {
    setIsScannerOpen(false);
    let targetIp = p2pData;

    try {
      if (typeof p2pData === "string") {
        try {
          const parsed = JSON.parse(p2pData);
          targetIp = parsed.ip || parsed.local_ip;
        } catch {
          const urlClean = p2pData
            .replace("http://", "")
            .replace("https://", "");
          targetIp = urlClean.split(":")[0].split("/")[0];
        }
      }
      executeTwoWaySyncWithItems(targetIp, items);
    } catch (err) {
      alert("Gagal membaca IP PC: " + err);
    }
  };

  // TAMBAH / UPDATE ITEM
  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      let updatedList = [];
      const now = Date.now();

      if (editingId) {
        // Mode Edit Item
        updatedList = items.map((item) => {
          if (item.id === editingId) {
            const currentHistory = Array.isArray(item.history)
              ? item.history
              : [item.password];
            return {
              ...item,
              site: siteInput,
              username: usernameInput,
              password: passwordInput,
              category: categoryInput,
              history: [...currentHistory, passwordInput],
              updated_at: now,
            };
          }
          return item;
        });
      } else {
        // Mode Tambah Baru
        const newItem = {
          id: String(now),
          site: siteInput,
          username: usernameInput,
          password: passwordInput,
          category: categoryInput,
          history: [passwordInput],
          updated_at: now,
          is_deleted: false,
        };
        updatedList = [...items, newItem];
      }

      // Update State React HP
      setItems(updatedList);

      // Simpan ke SQLite/State Rust HP
      if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
        await invoke("import_vault_data", {
          importedJson: JSON.stringify(updatedList),
        });
      } else {
        localStorage.setItem(
          "STEALTH_VAULT_ITEMS",
          JSON.stringify(updatedList)
        );
      }

      // Reset Form
      setSiteInput("");
      setUsernameInput("");
      setPasswordInput("");
      setEditingId(null);

      // Jalankan sync ke PC dengan membawa daftar 'updatedList' terbaru
      if (savedPcIp) {
        await executeTwoWaySyncWithItems(savedPcIp, updatedList);
      } else {
        setStatusMsg("✅ Data tersimpan lokal di HP!");
      }
    } catch (err) {
      alert("Gagal menyimpan: " + err);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm("Hapus item ini?")) return;
    const now = Date.now();
    const updated = items.filter((i) => i.id !== id);
    
    setItems(updated);
    if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
      await invoke("import_vault_data", {
        importedJson: JSON.stringify(updated),
      });
    } else {
      localStorage.setItem("STEALTH_VAULT_ITEMS", JSON.stringify(updated));
    }

    if (savedPcIp) executeTwoWaySyncWithItems(savedPcIp, updated);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans flex flex-col">
      <header className="flex justify-between items-center py-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} className="text-indigo-400" />
          <h1 className="text-base font-bold text-blue-400">
            Stealth Vault Mobile
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition"
          >
            <Smartphone size={14} /> Scan QR PC
          </button>
          {isUnlocked && (
            <button
              type="button"
              onClick={() => setIsUnlocked(false)}
              className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 space-y-3">
        {!isUnlocked ? (
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 my-auto shadow-xl">
            <h2 className="text-sm font-bold text-center mb-4 text-slate-200">
              Unlock Mobile Vault
            </h2>
            <form onSubmit={handleUnlock} className="space-y-3">
              <input
                type="password"
                placeholder="Master Password..."
                value={masterPasswordInput}
                onChange={(e) => setMasterPasswordInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
                required
              />
              {errorMsg && <p className="text-rose-400 text-xs">{errorMsg}</p>}
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
              >
                Buka Brankas HP
              </button>
            </form>
          </div>
        ) : (
          <>
            {savedPcIp && (
              <div className="bg-indigo-950/60 border border-indigo-800 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi size={16} className="text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-indigo-200">
                      PC Terpasang: {savedPcIp}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      P2P Auto-Sync Wi-Fi
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => executeTwoWaySyncWithItems(savedPcIp, items)}
                  disabled={isSyncing}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  <RefreshCw
                    size={12}
                    className={isSyncing ? "animate-spin" : ""}
                  />
                  {isSyncing ? "Syncing..." : "Sync Manual"}
                </button>
              </div>
            )}

            {statusMsg && (
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-center text-xs font-semibold text-indigo-300">
                {statusMsg}
              </div>
            )}

            <form
              onSubmit={handleSaveItem}
              className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2"
            >
              <h3 className="text-xs font-bold text-slate-300">
                {editingId ? "✏️ Edit Password" : "+ Tambah Password Baru"}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Situs/Aplikasi"
                  value={siteInput}
                  onChange={(e) => setSiteInput(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Username/Email"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative flex items-center">
                  <input
                    type="password"
                    placeholder="Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 pr-7 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    title="Generate Password acak"
                    className="absolute right-1.5 text-indigo-400 hover:text-indigo-300"
                  >
                    <Dices size={14} />
                  </button>
                </div>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                >
                  <option value="Kampus">Kampus</option>
                  <option value="Pekerjaan">Pekerjaan</option>
                  <option value="Sosmed">Sosmed</option>
                  <option value="Keuangan">Keuangan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {editingId ? "Update & Sync PC" : "+ Simpan & Sync PC"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setSiteInput("");
                      setUsernameInput("");
                      setPasswordInput("");
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-2">
              <h3 className="text-xs text-slate-400">
                Password Tersimpan ({items.length})
              </h3>
              {items.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  Belum ada password tersimpan.
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-200">
                        {item.site}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {item.username}
                      </div>
                      <div className="text-xs font-mono text-indigo-400 mt-1">
                        {visiblePasswords[item.id]
                          ? item.password
                          : "••••••••••••"}
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() =>
                          setVisiblePasswords((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                          }))
                        }
                        className="p-1.5 bg-slate-800 text-slate-300 rounded-md"
                      >
                        {visiblePasswords[item.id] ? (
                          <EyeOff size={13} />
                        ) : (
                          <Eye size={13} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.password);
                          alert("Password disalin!");
                        }}
                        className="p-1.5 bg-slate-800 text-slate-300 rounded-md"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setSiteInput(item.site);
                          setUsernameInput(item.username);
                          setPasswordInput(item.password);
                          setCategoryInput(item.category || "Kampus");
                        }}
                        className="p-1.5 bg-indigo-900/60 text-indigo-300 rounded-md"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 bg-rose-900/60 text-rose-300 rounded-md"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}