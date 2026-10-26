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
  Lock,
  PlusCircle,
  Search,
  CheckCircle2,
  Globe,
  User,
  Key,
  Folder,
  X
} from "lucide-react";
import QrScannerModal from "./components/QrScannerModal";

export default function AppMobile() {
  const [masterPasswordInput, setMasterPasswordInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("Semua");
  const [errorMsg, setErrorMsg] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Stored target PC IP Address
  const [savedPcIp, setSavedPcIp] = useState(
    () => localStorage.getItem("STEALTH_PC_IP") || ""
  );

  // Form states for adding and updating Vault entries
  const [siteInput, setSiteInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("Kampus");
  const [editingId, setEditingId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showPasswordInForm, setShowPasswordInForm] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      loadLocalItems();
    }
  }, [isUnlocked]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg) => {
    setToastMessage(msg);
  };

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
      showToast("Password acak berhasil dibuat!");
    } catch (err) {
      console.error("Gagal generate password:", err);
    }
  };

  const executeTwoWaySyncWithItems = async (targetIp, currentLocalItems) => {
    if (!targetIp) return;
    setIsSyncing(true);
    setStatusMsg("Menghubungkan ke PC...");

    try {
      if (navigator.vibrate) navigator.vibrate(80);

      // 1. Fetch PC Vault Data (GET)
      const response = await fetch(`http://${targetIp}:14202/api/sync`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      let pcItems = [];
      if (response.ok) {
        pcItems = await response.json();
      }

      // 2. Perform CRDT Merge based on timestamps
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

      // 3. Send merged items back to PC (POST)
      const postRes = await fetch(`http://${targetIp}:14202/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault_items: finalMergedItems }),
      });

      if (!postRes.ok) {
        throw new Error("PC menolak menyimpan data!");
      }

      // 4. Persist updated merged state to Local Storage / SQLite
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

      setStatusMsg("✅ Disinkronkan dengan PC!");
      showToast("Sinkronisasi P2P Berhasil!");
    } catch (err) {
      console.error("Gagal Sync:", err);
      setStatusMsg("⚠️ Tersimpan Lokal (PC Offline)");
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
      showToast("Gagal membaca IP PC");
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      let updatedList = [];
      const now = Date.now();

      if (editingId) {
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
        showToast("Item berhasil diperbarui!");
      } else {
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
        showToast("Item baru disimpan!");
      }

      setItems(updatedList);

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

      setSiteInput("");
      setUsernameInput("");
      setPasswordInput("");
      setEditingId(null);

      if (savedPcIp) {
        await executeTwoWaySyncWithItems(savedPcIp, updatedList);
      } else {
        setStatusMsg("✅ Data tersimpan lokal di HP!");
      }
    } catch (err) {
      showToast("Gagal menyimpan item");
    }
  };

  const handleDeleteItem = async (id) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
      await invoke("import_vault_data", {
        importedJson: JSON.stringify(updated),
      });
    } else {
      localStorage.setItem("STEALTH_VAULT_ITEMS", JSON.stringify(updated));
    }

    showToast("Item berhasil dihapus");
    if (savedPcIp) executeTwoWaySyncWithItems(savedPcIp, updated);
  };

  // Filtered Items Logic
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategoryFilter === "Semua" ||
      item.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce border border-indigo-400">
          <CheckCircle2 size={16} />
          {toastMessage}
        </div>
      )}

      {/* Main App Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-md">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wide text-white flex items-center gap-1.5">
              STEALTH VAULT
              <span className="text-[9px] uppercase px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md font-bold">
                Mobile
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">Secure P2P Vault</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl transition shadow-md active:scale-95"
          >
            <Smartphone size={15} />
            <span>Scan QR</span>
          </button>

          {isUnlocked && (
            <button
              type="button"
              onClick={() => setIsUnlocked(false)}
              className="p-2 bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-400 border border-slate-700/60 rounded-xl transition active:scale-95"
              title="Kunci Vault"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      {}
      <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-4">
        {!isUnlocked ? (
          /* Locked Screen View */
          <div className="my-auto py-12 flex flex-col justify-center items-center">
            <div className="w-full bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-indigo-950/80 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner text-indigo-400">
                  <Lock size={30} />
                </div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  Buka Brankas Mobile
                </h2>
                <p className="text-xs text-slate-400">
                  Masukkan Master Password Anda untuk mengakses data terenkripsi.
                </p>
              </div>

              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Masukkan Master Password..."
                    value={masterPasswordInput}
                    onChange={(e) => setMasterPasswordInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition shadow-inner"
                    required
                  />
                </div>

                {errorMsg && (
                  <p className="text-rose-400 text-xs font-medium text-center bg-rose-950/30 border border-rose-900/50 py-2 rounded-lg">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition shadow-lg shadow-indigo-950 active:scale-98"
                >
                  Buka Brankas
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Unlocked Main View */
          <>
            {/* Sync Bar Status */}
            {savedPcIp && (
              <div className="bg-slate-900/80 border border-indigo-900/40 p-3 rounded-2xl flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Wifi size={18} className="text-emerald-400 animate-pulse" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">
                      PC Target: <span className="text-indigo-400">{savedPcIp}</span>
                    </p>
                    <p className="text-[10px] text-slate-400">P2P Auto Sync Ready</p>
                  </div>
                </div>

                <button
                  onClick={() => executeTwoWaySyncWithItems(savedPcIp, items)}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition disabled:opacity-50 active:scale-95 shadow-md"
                >
                  <RefreshCw
                    size={13}
                    className={isSyncing ? "animate-spin" : ""}
                  />
                  <span>{isSyncing ? "Sync..." : "Sync"}</span>
                </button>
              </div>
            )}

            {/* Status Notification banner */}
            {statusMsg && (
              <div className="px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-center text-xs font-medium text-indigo-300 shadow-sm flex items-center justify-between">
                <span className="truncate">{statusMsg}</span>
                <button
                  onClick={() => setStatusMsg("")}
                  className="text-slate-500 hover:text-slate-300 ml-2"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {}
            <form
              onSubmit={handleSaveItem}
              className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl shadow-xl space-y-3.5"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  {editingId ? (
                    <>
                      <Edit3 size={14} className="text-amber-400" /> Edit Password
                    </>
                  ) : (
                    <>
                      <PlusCircle size={14} className="text-indigo-400" /> Tambah Password Baru
                    </>
                  )}
                </h3>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setSiteInput("");
                      setUsernameInput("");
                      setPasswordInput("");
                    }}
                    className="text-[11px] text-rose-400 hover:underline font-medium"
                  >
                    Batal Edit
                  </button>
                )}
              </div>

              {/* Site / App Title Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Globe size={11} /> Nama Situs / Aplikasi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Mobile Banking / Google"
                  value={siteInput}
                  onChange={(e) => setSiteInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800/80 focus:border-indigo-500 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none transition"
                  required
                />
              </div>

              {/* Username Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <User size={11} /> Username / Email
                </label>
                <input
                  type="text"
                  placeholder="user@example.com"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800/80 focus:border-indigo-500 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none transition"
                  required
                />
              </div>

              {/* Password & Category Grid */}
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Key size={11} /> Password
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      <Dices size={11} /> Acak Password
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type={showPasswordInForm ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full px-3 py-2.5 pr-10 bg-slate-950 border border-slate-800/80 focus:border-indigo-500 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none transition font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordInForm(!showPasswordInForm)}
                      className="absolute right-3 text-slate-400 hover:text-slate-200"
                    >
                      {showPasswordInForm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Folder size={11} /> Kategori
                  </label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800/80 focus:border-indigo-500 rounded-xl text-xs text-slate-200 outline-none transition"
                  >
                    <option value="Kampus">Kampus</option>
                    <option value="Pekerjaan">Pekerjaan</option>
                    <option value="Sosmed">Sosmed</option>
                    <option value="Keuangan">Keuangan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="w-full py-2.5 mt-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold transition shadow-lg active:scale-98 disabled:opacity-50"
              >
                {editingId ? "Perbarui & Sync PC" : "+ Simpan & Sync PC"}
              </button>
            </form>

            {}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                  Daftar Password ({filteredItems.length})
                </h3>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari situs atau username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500/80 transition"
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {["Semua", "Kampus", "Pekerjaan", "Sosmed", "Keuangan", "Lainnya"].map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition ${
                        selectedCategoryFilter === cat
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-slate-900 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              {}
              {filteredItems.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-8 text-center space-y-2">
                  <ShieldCheck size={32} className="mx-auto text-slate-700" />
                  <p className="text-xs text-slate-400 font-medium">
                    Tidak ada data password yang cocok.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800/90 hover:border-slate-700 p-3.5 rounded-2xl shadow-md transition space-y-2.5"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">
                              {item.site}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 bg-slate-800 text-indigo-300 font-semibold rounded-full border border-slate-700/50">
                              {item.category || "Lainnya"}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px] font-medium">
                            {item.username}
                          </p>
                        </div>

                        {/* Card Quick Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setVisiblePasswords((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition border border-slate-800"
                            title="Toggle Password"
                          >
                            {visiblePasswords[item.id] ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                          </button>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.password);
                              showToast("Password disalin!");
                            }}
                            className="p-2 bg-slate-950 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-xl transition border border-slate-800 active:scale-95"
                            title="Salin Password"
                          >
                            <Copy size={14} />
                          </button>

                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              setSiteInput(item.site);
                              setUsernameInput(item.username);
                              setPasswordInput(item.password);
                              setCategoryInput(item.category || "Kampus");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="p-2 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 rounded-xl transition border border-indigo-900/50"
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-xl transition border border-rose-900/40"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Display Password Field */}
                      <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs font-mono tracking-wider text-indigo-400 font-medium select-all">
                          {visiblePasswords[item.id]
                            ? item.password
                            : "••••••••••••••••"}
                        </span>
                        <span className="text-[9px] text-slate-600 font-mono">
                          ID: {item.id.slice(-4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* QR Scanner Modal Wrapper */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}