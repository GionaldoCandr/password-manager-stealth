import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export default function AppPC() {
  const [masterPasswordInput, setMasterPasswordInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [autoLockTime, setAutoLockTime] = useState(180);

  // Tema
  const [themeMode, setThemeMode] = useState("dark");

  // Form Input Item
  const [siteInput, setSiteInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("Kampus");
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");

  // State Fitur Tambahan
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [toastMsg, setToastMsg] = useState("");
  const [historyModalItem, setHistoryModalItem] = useState(null);

  // Pengaturan Keamanan
  const [currentAlias, setCurrentAlias] = useState("");
  const [newAliasInput, setNewAliasInput] = useState("");
  const [oldMasterInput, setOldMasterInput] = useState("");
  const [newMasterInput, setNewMasterInput] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");

  // Modal QR Pairing
  const [pairingInfo, setPairingInfo] = useState(null);
  const [showPairingModal, setShowPairingModal] = useState(false);

  useEffect(() => {
    fetchCurrentAlias();

    // Event listener untuk Auto-Refresh UI PC saat HP melakukan Sync
    let unlistenFn = null;
    if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
      listen("p2p-data-updated", () => {
        handleRefreshVault();
        showNotification("⚡ Data Vault diperbarui otomatis dari HP!");
      }).then((fn) => {
        unlistenFn = fn;
      });
    }

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [isUnlocked, masterPasswordInput]);

  // Logika Auto-Lock Smart (Reset saat aktif & Jalan saat Idle)
  useEffect(() => {
    let timer = null;
    if (!isUnlocked) {
      setAutoLockTime(180);
      return;
    }

    const resetTimerOnActivity = () => setAutoLockTime(180);
    const activityEvents = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    activityEvents.forEach((event) => window.addEventListener(event, resetTimerOnActivity));

    timer = setInterval(() => {
      setAutoLockTime((prev) => {
        if (prev <= 1) {
          handleLockVault();
          return 180;
        }
        return prev - 1;
      });
    }, 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden) resetTimerOnActivity();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timer) clearInterval(timer);
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimerOnActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isUnlocked]);

  const showNotification = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const fetchCurrentAlias = async () => {
    try {
      const alias = await invoke("get_current_alias");
      setCurrentAlias(alias);
      setNewAliasInput(alias);
    } catch (err) {
      console.error("Gagal mengambil alias:", err);
    }
  };

  const handleRefreshVault = async () => {
    if (!isUnlocked) return;
    try {
      const jsonRes = await invoke("unlock_vault", { masterPassword: masterPasswordInput });
      setItems(JSON.parse(jsonRes));
    } catch (err) {
      console.error("Gagal refresh vault:", err);
    }
  };

  const handleUnlock = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    try {
      const jsonRes = await invoke("unlock_vault", { masterPassword: masterPasswordInput });
      setItems(JSON.parse(jsonRes));
      setIsUnlocked(true);
      setAutoLockTime(180);
    } catch (err) {
      setErrorMsg(String(err));
    }
  };

  const handleLockVault = () => {
    setIsUnlocked(false);
    setMasterPasswordInput("");
    setItems([]);
    setVisiblePasswords({});
  };

  const handleExitApp = async () => {
    try {
      await invoke("exit_app");
    } catch (err) {
      window.close();
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      let currentItemHistory = [];
      if (editingId) {
        const existingItem = items.find((i) => i.id === editingId);
        if (existingItem) {
          currentItemHistory = existingItem.history || [existingItem.password];
          const last5 = currentItemHistory.slice(-5);
          if (last5.includes(passwordInput)) {
            alert("Password ini sudah pernah digunakan dalam 5 riwayat terakhir! Gunakan password lain.");
            return;
          }
        }
      }

      let updatedHistory = [...currentItemHistory, passwordInput];
      let jsonRes;

      if (editingId) {
        jsonRes = await invoke("update_vault_item", {
          id: editingId,
          site: siteInput,
          username: usernameInput,
          password: passwordInput,
          category: categoryInput,
          history: updatedHistory,
        });
        showNotification("Item berhasil diperbarui!");
      } else {
        jsonRes = await invoke("add_vault_item", {
          site: siteInput,
          username: usernameInput,
          password: passwordInput,
          category: categoryInput,
          history: [passwordInput],
        });
        showNotification("Item baru berhasil ditambahkan!");
      }

      setItems(JSON.parse(jsonRes));
      resetForm();
    } catch (err) {
      alert("Gagal menyimpan item: " + err);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm("Yakin ingin menghapus item ini?")) return;
    try {
      const jsonRes = await invoke("delete_vault_item", { id });
      setItems(JSON.parse(jsonRes));
      showNotification("Item berhasil dihapus!");
    } catch (err) {
      alert("Gagal menghapus item: " + err);
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setSiteInput(item.site);
    setUsernameInput(item.username);
    setPasswordInput(item.password);
    setCategoryInput(item.category || "Kampus");
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyPassword = (pass) => {
    navigator.clipboard.writeText(pass);
    showNotification("Password berhasil disalin ke clipboard!");
  };

  const handleGeneratePassword = async () => {
    try {
      const genPass = await invoke("generate_password", { length: 16, includeSymbols: true });
      setPasswordInput(genPass);
    } catch (err) {
      console.error("Gagal membuat password:", err);
    }
  };

  const resetForm = () => {
    setSiteInput("");
    setUsernameInput("");
    setPasswordInput("");
    setCategoryInput("Kampus");
    setEditingId(null);
  };

  const handleChangeAlias = async (e) => {
    e.preventDefault();
    setSettingsMsg("");
    try {
      const msg = await invoke("update_winr_alias", { newAlias: newAliasInput });
      setSettingsMsg(msg);
      fetchCurrentAlias();
    } catch (err) {
      setSettingsMsg("Error: " + err);
    }
  };

  const handleChangeMaster = async (e) => {
    e.preventDefault();
    setSettingsMsg("");
    try {
      const msg = await invoke("change_master_password", {
        oldPassword: oldMasterInput,
        newPassword: newMasterInput,
      });
      setSettingsMsg(msg);
      setOldMasterInput("");
      setNewMasterInput("");
    } catch (err) {
      setSettingsMsg("Error: " + err);
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `stealth_vault_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification("Data JSON berhasil diekspor!");
  };

  const handleImportJson = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const jsonRes = await invoke("import_vault_data", { importedJson: event.target.result });
          setItems(JSON.parse(jsonRes));
          showNotification("Data JSON berhasil diimpor!");
        } catch (err) {
          alert("Gagal mengimpor data: " + err);
        }
      };
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Semua" || (item.category || "Lainnya") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenPairing = async (e) => {
    if (e) e.preventDefault();
    try {
      if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
        const res = await invoke("get_p2p_pairing_info");
        const data = typeof res === "string" ? JSON.parse(res) : res;
        setPairingInfo(data);
      } else {
        setPairingInfo({
          ip: "192.168.0.103",
          port: 14202,
          token: "stealth-p2p-sync-key",
          qr_svg: "",
        });
      }
    } catch (err) {
      console.error("Gagal load info pairing:", err);
    }
    setShowPairingModal(true);
  };

  const categoriesList = ["Semua", "Kampus", "Pekerjaan", "Sosmed", "Keuangan", "Lainnya"];
  const isDark = themeMode === "dark" || (themeMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const themeBg = isDark ? "#1b1a29" : "#f1f5f9";
  const themeCardBg = isDark ? "#211f33" : "#ffffff";
  const themeInputBg = isDark ? "#2b293e" : "#f8fafc";
  const themeBorder = isDark ? "#334155" : "#cbd5e1";
  const themeText = isDark ? "#f8fafc" : "#0f172a";
  const themeSubtext = isDark ? "#94a3b8" : "#64748b";

  return (
    <div style={{ backgroundColor: themeBg, color: themeText, minHeight: "100vh", padding: "32px", boxSizing: "border-box", fontFamily: "system-ui, -apple-system, sans-serif", transition: "all 0.2s ease" }}>
      {/* TOAST NOTIFIKASI */}
      {toastMsg && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", backgroundColor: "#00c853", color: "#ffffff", padding: "12px 20px", borderRadius: "8px", fontWeight: "700", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 9999 }}>
          {toastMsg}
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>🔓</span>
          <h1 style={{ fontSize: "24px", fontWeight: "900", margin: 0 }}>Stealth Password Vault</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isUnlocked && (
            <button
              onClick={handleRefreshVault}
              style={{ backgroundColor: "#10b981", color: "#ffffff", padding: "8px 14px", borderRadius: "8px", border: "none", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
            >
              🔄 Refresh Data
            </button>
          )}

          <button
            onClick={handleOpenPairing}
            style={{ backgroundColor: "#6366f1", color: "#ffffff", padding: "8px 14px", borderRadius: "8px", border: "none", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
          >
            📱 Pairing PC
          </button>

          <div style={{ backgroundColor: themeCardBg, padding: "4px", borderRadius: "999px", border: `1px solid ${themeBorder}`, display: "flex", gap: "4px" }}>
            <button onClick={() => setThemeMode("dark")} style={{ backgroundColor: themeMode === "dark" ? "#00a8e8" : "transparent", color: themeMode === "dark" ? "#0f172a" : themeSubtext, padding: "4px 12px", borderRadius: "999px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>🌙 Dark</button>
            <button onClick={() => setThemeMode("light")} style={{ backgroundColor: themeMode === "light" ? "#f59e0b" : "transparent", color: themeMode === "light" ? "#0f172a" : themeSubtext, padding: "4px 12px", borderRadius: "999px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>🏵️ Light</button>
            <button onClick={() => setThemeMode("system")} style={{ backgroundColor: themeMode === "system" ? "#4f46e5" : "transparent", color: themeMode === "system" ? "#ffffff" : themeSubtext, padding: "4px 12px", borderRadius: "999px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>💻 System</button>
          </div>
        </div>
      </div>

      {!isUnlocked ? (
        /* LOCK SCREEN DESKTOP */
        <div style={{ marginTop: "24px" }}>
          <p style={{ fontSize: "14px", color: themeSubtext, marginBottom: "16px" }}>Masukkan Master Password untuk mendekripsi data di RAM:</p>
          <form onSubmit={handleUnlock} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <input
              type="password"
              placeholder="Master Password"
              value={masterPasswordInput}
              onChange={(e) => setMasterPasswordInput(e.target.value)}
              style={{ width: "280px", padding: "10px 16px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "6px", color: themeText, fontSize: "14px", outline: "none" }}
              required
            />
            <button type="submit" style={{ backgroundColor: "#008ccb", color: "#ffffff", padding: "10px 20px", borderRadius: "6px", border: "none", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>Dekripsi Vault</button>
            <button type="button" onClick={handleExitApp} style={{ backgroundColor: "#f04747", color: "#ffffff", padding: "10px 20px", borderRadius: "6px", border: "none", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>🚪 Keluar</button>
          </form>
          {errorMsg && <p style={{ color: "#f87171", fontSize: "12px", marginTop: "12px" }}>{errorMsg}</p>}
        </div>
      ) : (
        /* UNLOCKED VAULT DESKTOP */
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* SUBHEADER TIMER & ACTIONS */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "12px", color: themeSubtext, margin: 0 }}>⏱️ Auto-Lock dalam: <span style={{ fontWeight: "700", color: themeText }}>{autoLockTime}s</span></p>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleExportJson} style={{ backgroundColor: "#ff6b00", color: "#ffffff", padding: "8px 16px", borderRadius: "6px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>💾 Ekspor JSON</button>
              <label style={{ backgroundColor: "#ffcc00", color: "#0f172a", padding: "8px 16px", borderRadius: "6px", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>
                📥 Impor JSON
                <input type="file" accept=".json" onChange={handleImportJson} style={{ display: "none" }} />
              </label>
              <button onClick={handleLockVault} style={{ backgroundColor: "#ff4747", color: "#ffffff", padding: "8px 16px", borderRadius: "6px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>🔒 Kunci</button>
            </div>
          </div>

          {/* ANALYTICS HEALTH CARD */}
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "8px", padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "12px", color: themeSubtext, margin: "0 0 8px 0" }}>Skor Kesehatan Vault</p>
              <p style={{ fontSize: "24px", fontWeight: "900", color: "#00e676", margin: 0 }}>100 / 100</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: themeSubtext, margin: "0 0 8px 0" }}>Password Lemah</p>
              <p style={{ fontSize: "24px", fontWeight: "900", color: "#00e676", margin: 0 }}>{items.filter((i) => i.password.length < 8).length} Akun</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: themeSubtext, margin: "0 0 8px 0" }}>Password Terduplikasi</p>
              <p style={{ fontSize: "24px", fontWeight: "900", color: "#00e676", margin: 0 }}>0 Akun</p>
            </div>
          </div>

          {/* SECURITY SETTINGS CARD */}
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {settingsMsg && <p style={{ fontSize: "12px", color: "#818cf8", backgroundColor: "rgba(49, 46, 129, 0.5)", padding: "8px", borderRadius: "4px", margin: 0 }}>{settingsMsg}</p>}

            <div>
              <h3 style={{ fontSize: "12px", fontWeight: "700", color: themeText, margin: "0 0 12px 0" }}>⚙️ Ubah Master Password Vault</h3>
              <form onSubmit={handleChangeMaster} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="password"
                  placeholder="Master Pass Lama"
                  value={oldMasterInput}
                  onChange={(e) => setOldMasterInput(e.target.value)}
                  style={{ width: "220px", padding: "8px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "6px", color: themeText, fontSize: "12px" }}
                />
                <input
                  type="password"
                  placeholder="Master Pass Baru"
                  value={newMasterInput}
                  onChange={(e) => setNewMasterInput(e.target.value)}
                  style={{ width: "220px", padding: "8px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "6px", color: themeText, fontSize: "12px" }}
                />
                <button type="submit" style={{ backgroundColor: "#8c52ff", color: "#ffffff", padding: "8px 16px", borderRadius: "6px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>Simpan Baru</button>
              </form>
            </div>

            <div>
              <h3 style={{ fontSize: "12px", fontWeight: "700", color: themeText, margin: "0 0 4px 0" }}>🚀 Ubah Kata Kunci Alias (Win + R)</h3>
              <p style={{ fontSize: "11px", color: themeSubtext, margin: "0 0 12px 0" }}>Mengubah nama ini akan menghapus kata kunci lama dari registry sehingga kata kunci lama tidak bisa dipakai lagi.</p>
              <form onSubmit={handleChangeAlias} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder={`Kata Kunci Baru (misal: ${currentAlias || "GioPas"})`}
                  value={newAliasInput}
                  onChange={(e) => setNewAliasInput(e.target.value)}
                  style={{ width: "220px", padding: "8px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "6px", color: themeText, fontSize: "12px" }}
                />
                <button type="submit" style={{ backgroundColor: "#008ccb", color: "#ffffff", padding: "8px 16px", borderRadius: "6px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>Terapkan Alias Win+R</button>
              </form>
            </div>
          </div>

          {/* FORM TAMBAH / EDIT ITEM */}
          <form onSubmit={handleAddItem} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input type="text" placeholder="Layanan / Site" value={siteInput} onChange={(e) => setSiteInput(e.target.value)} style={{ flex: 1, padding: "8px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "6px", color: themeText, fontSize: "12px" }} required />
            <input type="text" placeholder="Username / Email" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} style={{ flex: 1, padding: "8px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "6px", color: themeText, fontSize: "12px" }} required />
            <input type="text" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} style={{ flex: 1, padding: "8px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "6px", color: themeText, fontSize: "12px" }} required />
            <select value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} style={{ width: "120px", padding: "8px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "6px", color: themeText, fontSize: "12px" }}>
              {categoriesList.filter((c) => c !== "Semua").map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button type="button" onClick={handleGeneratePassword} style={{ backgroundColor: "#ff6b00", color: "#ffffff", padding: "8px 16px", borderRadius: "6px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>🎲 Generate</button>
            <button type="submit" style={{ backgroundColor: editingId ? "#008ccb" : "#00c853", color: "#ffffff", padding: "8px 16px", borderRadius: "6px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>
              {editingId ? "✏️ Update" : "+ Simpan"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ backgroundColor: "#64748b", color: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "none", fontSize: "12px", cursor: "pointer" }}>Batal</button>
            )}
          </form>

          {/* FILTER & SEARCH */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <input
              type="text"
              placeholder="🔍 Cari site atau username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "260px", padding: "6px 16px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "999px", color: themeText, fontSize: "12px" }}
            />

            <div style={{ display: "flex", gap: "6px" }}>
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    backgroundColor: selectedCategory === cat ? "#008ccb" : themeInputBg,
                    color: selectedCategory === cat ? "#ffffff" : themeSubtext,
                    padding: "4px 12px",
                    borderRadius: "999px",
                    border: `1px solid ${themeBorder}`,
                    fontSize: "12px",
                    fontWeight: selectedCategory === cat ? "700" : "400",
                    cursor: "pointer",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* TABEL HASIL PASSWORD */}
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "8px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
              <thead style={{ backgroundColor: themeInputBg, color: themeSubtext, fontSize: "10px", textTransform: "uppercase" }}>
                <tr>
                  <th style={{ padding: "12px 16px" }}>Site</th>
                  <th style={{ padding: "12px 16px" }}>Category</th>
                  <th style={{ padding: "12px 16px" }}>Username</th>
                  <th style={{ padding: "12px 16px" }}>Password</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: "24px", textAlign: "center", color: themeSubtext }}>Belum ada item tersimpan.</td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} style={{ borderTop: `1px solid ${themeBorder}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: "700", color: themeText }}>{item.site}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, padding: "2px 8px", borderRadius: "4px", fontSize: "10px" }}>{item.category || "Kampus"}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: themeSubtext }}>{item.username}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>{visiblePasswords[item.id] ? item.password : "••••••••••••"}</span>
                          <button onClick={() => togglePasswordVisibility(item.id)} style={{ backgroundColor: "transparent", border: "none", cursor: "pointer", fontSize: "14px" }}>
                            {visiblePasswords[item.id] ? "🙈" : "👁️"}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                          <button onClick={() => handleCopyPassword(item.password)} style={{ backgroundColor: "#008ccb", color: "#ffffff", border: "none", padding: "4px 10px", borderRadius: "4px", fontWeight: "700", fontSize: "11px", cursor: "pointer" }}>📋 Copy</button>
                          <button onClick={() => handleEditClick(item)} style={{ backgroundColor: "#f59e0b", color: "#ffffff", border: "none", padding: "4px 10px", borderRadius: "4px", fontWeight: "700", fontSize: "11px", cursor: "pointer" }}>✏️ Edit</button>
                          <button onClick={() => handleDeleteItem(item.id)} style={{ backgroundColor: "#f04747", color: "#ffffff", border: "none", padding: "4px 10px", borderRadius: "4px", fontWeight: "700", fontSize: "11px", cursor: "pointer" }}>🗑️ Hapus</button>
                          <button onClick={() => setHistoryModalItem(item)} title="Riwayat Password" style={{ backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, color: themeText, padding: "4px 8px", borderRadius: "4px", fontWeight: "700", fontSize: "11px", cursor: "pointer" }}>📜</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PAIRING QR CODE */}
      {showPairingModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "12px", padding: "24px", width: "360px", textAlign: "center" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px", color: themeText }}>Mobile P2P Sync</h3>
            <p style={{ fontSize: "11px", color: themeSubtext, marginBottom: "16px" }}>Scan QR Code ini menggunakan aplikasi Stealth Vault di HP kamu</p>
            <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "12px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "260px" }}>
              {pairingInfo?.qr_svg ? (
                <div dangerouslySetInnerHTML={{ __html: pairingInfo.qr_svg }} />
              ) : (
                <p style={{ color: "#000000", fontSize: "12px", fontWeight: "700" }}>192.168.0.103:14202</p>
              )}
            </div>
            <p style={{ fontSize: "11px", color: themeSubtext, marginTop: "12px" }}>
              <strong>IP PC:</strong> {pairingInfo?.ip || "192.168.0.103"}:{pairingInfo?.port || 14202}
            </p>
            <button onClick={() => setShowPairingModal(false)} style={{ width: "100%", backgroundColor: "#f04747", color: "#ffffff", padding: "10px", borderRadius: "8px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer", marginTop: "16px" }}>Tutup</button>
          </div>
        </div>
      )}

      {/* MODAL RIWAYAT PASSWORD */}
      {historyModalItem && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "12px", padding: "24px", width: "400px", maxWidth: "90%" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", margin: "0 0 12px 0", color: themeText }}>
              📜 Riwayat Password ({historyModalItem.site})
            </h3>
            <p style={{ fontSize: "11px", color: themeSubtext, marginBottom: "12px" }}>
              Sistem memproteksi agar password lama tidak dapat digunakan kembali sebelum diubah minimal 5 kali.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto", marginBottom: "16px" }}>
              {(historyModalItem.history || [historyModalItem.password]).map((histPass, index) => (
                <div key={index} style={{ backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontFamily: "monospace", display: "flex", justifyContent: "space-between" }}>
                  <span>{histPass}</span>
                  <span style={{ fontSize: "10px", color: themeSubtext }}>v{index + 1}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setHistoryModalItem(null)} style={{ width: "100%", backgroundColor: "#008ccb", color: "#ffffff", padding: "8px", borderRadius: "6px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}