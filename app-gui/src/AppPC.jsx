import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Helper: Evaluasi kekuatan password per item
function evaluatePassword(pwd) {
  if (!pwd) return { score: 0, label: "Kosong", color: "#64748b", level: "empty" };
  let score = 0;
  const len = pwd.length;
  if (len >= 16) score += 40;
  else if (len >= 12) score += 30;
  else if (len >= 8) score += 15;
  else score += 5;

  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNum = /[0-9]/.test(pwd);
  const hasSym = /[^A-Za-z0-9]/.test(pwd);

  if (hasUpper && hasLower) score += 20;
  else if (hasUpper || hasLower) score += 10;

  if (hasNum) score += 20;
  if (hasSym) score += 20;

  const commonWeak = ["123456", "password", "admin", "admin123", "qwerty", "12345678", "secret", "user123"];
  if (commonWeak.includes(pwd.toLowerCase())) {
    score = Math.min(score, 20);
  }

  if (score >= 80) return { score, label: "Sangat Kuat", color: "#10b981", isStrong: true };
  if (score >= 65) return { score, label: "Kuat", color: "#22c55e", isStrong: true };
  if (score >= 45) return { score, label: "Sedang", color: "#eab308", isMedium: true };
  return { score, label: "Lemah", color: "#ef4444", isWeak: true };
}

// Helper: Audit komprehensif kesehatan vault
function auditVault(items) {
  if (!items || items.length === 0) {
    return {
      healthScore: 100,
      healthRating: "Belum Ada Data",
      healthColor: "#64748b",
      duplicateItemsCount: 0,
      duplicateGroups: {},
      weakCount: 0,
      mediumCount: 0,
      strongCount: 0,
      passMap: {},
      recommendations: ["Tambahkan data password pertama Anda untuk memulai audit keamanan."],
    };
  }

  const passMap = {};
  items.forEach((item) => {
    if (!item || !item.password) return;
    const p = item.password;
    if (!passMap[p]) passMap[p] = [];
    passMap[p].push(item.site || "Tanpa Nama");
  });

  let duplicateItemsCount = 0;
  const duplicateGroups = {};
  Object.entries(passMap).forEach(([pwd, siteList]) => {
    if (siteList.length > 1) {
      duplicateItemsCount += siteList.length;
      duplicateGroups[pwd] = siteList;
    }
  });

  let weakCount = 0;
  let mediumCount = 0;
  let strongCount = 0;
  let totalScore = 0;

  items.forEach((item) => {
    const res = evaluatePassword(item.password);
    totalScore += res.score;
    if (res.isWeak) weakCount++;
    else if (res.isMedium) mediumCount++;
    else strongCount++;
  });

  const avgStrength = totalScore / items.length;
  const duplicatePenalty = (duplicateItemsCount / items.length) * 35;
  const weakPenalty = (weakCount / items.length) * 25;
  const rawScore = Math.round(Math.max(5, Math.min(100, avgStrength - duplicatePenalty - weakPenalty)));

  let healthRating = "Sangat Aman";
  let healthColor = "#10b981";
  if (rawScore < 50) {
    healthRating = "Beresiko Kritis";
    healthColor = "#ef4444";
  } else if (rawScore < 70) {
    healthRating = "Perlu Perhatian";
    healthColor = "#f97316";
  } else if (rawScore < 85) {
    healthRating = "Cukup Baik";
    healthColor = "#eab308";
  }

  const recommendations = [];
  if (duplicateItemsCount > 0) {
    const uniqueGroupCount = Object.keys(duplicateGroups).length;
    recommendations.push(
      `⚠️ Terdeteksi ${duplicateItemsCount} akun yang menggunakan ${uniqueGroupCount} sandi duplikat. Jika 1 akun bocor, akun lain beresiko diretas (Credential Stuffing).`
    );
  }
  if (weakCount > 0) {
    recommendations.push(
      `🔓 Ditemukan ${weakCount} sandi lemah (kurang dari 8 karakter atau pola sederhana). Disarankan menggunakan minimal 12-16 karakter acak.`
    );
  }
  if (duplicateItemsCount === 0 && weakCount === 0) {
    recommendations.push(
      `✨ Luar biasa! Seluruh kredensial Anda unik dan berstandar enkripsi tinggi tanpa ada kebocoran duplikat.`
    );
  }

  return {
    healthScore: rawScore,
    healthRating,
    healthColor,
    duplicateItemsCount,
    duplicateGroups,
    weakCount,
    mediumCount,
    strongCount,
    passMap,
    recommendations,
  };
}

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
  const [securityFilter, setSecurityFilter] = useState("ALL"); // ALL, DUPLICATE, WEAK, STRONG
  const [showHealthDetails, setShowHealthDetails] = useState(true);

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

  // Quick fix: Ganti sandi duplikat / lemah dengan sandi acak 16 karakter secara instan
  const handleQuickFixPassword = async (item) => {
    try {
      const genPass = await invoke("generate_password", { length: 16, includeSymbols: true });
      const curHist = Array.isArray(item.history) ? item.history : [item.password];
      const jsonRes = await invoke("update_vault_item", {
        id: item.id,
        site: item.site,
        username: item.username,
        password: genPass,
        category: item.category || "Kampus",
        history: [...curHist, genPass],
      });
      setItems(JSON.parse(jsonRes));
      showNotification(`🎲 Sandi untuk ${item.site} diperbarui ke 16 karakter acak!`);
    } catch (err) {
      console.error("Gagal ganti sandi:", err);
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

  // Komputasi Audit Keamanan & Kesehatan Vault
  const audit = useMemo(() => auditVault(items), [items]);

  // Evaluasi kekuatan password yang sedang diinput pada form
  const formPassStrength = useMemo(() => evaluatePassword(passwordInput), [passwordInput]);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Semua" || (item.category || "Lainnya") === selectedCategory;

    let matchesSecurity = true;
    if (securityFilter === "DUPLICATE") {
      const sameSites = audit.passMap[item.password] || [];
      matchesSecurity = sameSites.length > 1;
    } else if (securityFilter === "WEAK") {
      const ev = evaluatePassword(item.password);
      matchesSecurity = ev.isWeak;
    } else if (securityFilter === "STRONG") {
      const ev = evaluatePassword(item.password);
      const sameSites = audit.passMap[item.password] || [];
      matchesSecurity = ev.isStrong && sameSites.length === 1;
    }

    return matchesSearch && matchesCategory && matchesSecurity;
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
  const themeBg = isDark ? "#070b14" : "#f1f5f9";
  const themeCardBg = isDark ? "#0f172a" : "#ffffff";
  const themeInputBg = isDark ? "#020617" : "#f8fafc";
  const themeBorder = isDark ? "#1e293b" : "#cbd5e1";
  const themeText = isDark ? "#f8fafc" : "#0f172a";
  const themeSubtext = isDark ? "#94a3b8" : "#64748b";

  return (
    <div style={{ backgroundColor: themeBg, color: themeText, minHeight: "100vh", padding: "32px", boxSizing: "border-box", fontFamily: "system-ui, -apple-system, sans-serif", transition: "all 0.2s ease" }}>
      {/* TOAST NOTIFIKASI */}
      {toastMsg && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", backgroundColor: "#4f46e5", color: "#ffffff", padding: "12px 20px", borderRadius: "10px", fontWeight: "700", fontSize: "13px", boxShadow: "0 10px 25px rgba(79, 70, 229, 0.4)", zIndex: 9999, border: "1px solid #818cf8" }}>
          {toastMsg}
        </div>
      )}

      {/* HEADER SECTION DENGAN BRANDING PC PMSV */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.4)" }}>
            <span style={{ fontSize: "20px" }}>🛡️</span>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: "900", margin: 0, letterSpacing: "0.5px" }}>PcPMSV</h1>
              <span style={{ backgroundColor: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc", border: "1px solid rgba(99, 102, 241, 0.4)", fontSize: "10px", fontWeight: "800", textTransform: "uppercase", padding: "2px 8px", borderRadius: "6px" }}>Desktop Vault</span>
            </div>
            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: themeSubtext }}>Zero-Disk Volatile RAM Engine · Password Manager Stealth Vault</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isUnlocked && (
            <button
              onClick={handleRefreshVault}
              style={{ backgroundColor: "#10b981", color: "#ffffff", padding: "8px 14px", borderRadius: "8px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              🔄 Refresh Data
            </button>
          )}

          <button
            onClick={handleOpenPairing}
            style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "#ffffff", padding: "8px 14px", borderRadius: "8px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)" }}
          >
            📱 Pairing Mobile
          </button>

          <div style={{ backgroundColor: themeCardBg, padding: "4px", borderRadius: "999px", border: `1px solid ${themeBorder}`, display: "flex", gap: "4px" }}>
            <button onClick={() => setThemeMode("dark")} style={{ backgroundColor: themeMode === "dark" ? "#4f46e5" : "transparent", color: themeMode === "dark" ? "#ffffff" : themeSubtext, padding: "4px 12px", borderRadius: "999px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>🌙 Dark</button>
            <button onClick={() => setThemeMode("light")} style={{ backgroundColor: themeMode === "light" ? "#f59e0b" : "transparent", color: themeMode === "light" ? "#0f172a" : themeSubtext, padding: "4px 12px", borderRadius: "999px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>🏵️ Light</button>
            <button onClick={() => setThemeMode("system")} style={{ backgroundColor: themeMode === "system" ? "#6366f1" : "transparent", color: themeMode === "system" ? "#ffffff" : themeSubtext, padding: "4px 12px", borderRadius: "999px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>💻 System</button>
          </div>
        </div>
      </div>

      {!isUnlocked ? (
        /* LOCK SCREEN DESKTOP */
        <div style={{ marginTop: "32px", maxWidth: "480px", backgroundColor: themeCardBg, padding: "28px", borderRadius: "16px", border: `1px solid ${themeBorder}`, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 8px 0" }}>Vault Terkunci</h2>
          <p style={{ fontSize: "13px", color: themeSubtext, marginBottom: "20px" }}>Masukkan Master Password untuk mendekripsi data kredensial di RAM volatile PC Anda:</p>
          <form onSubmit={handleUnlock} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="password"
              placeholder="Master Password (admin123)"
              value={masterPasswordInput}
              onChange={(e) => setMasterPasswordInput(e.target.value)}
              style={{ width: "100%", padding: "12px 16px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "10px", color: themeText, fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              required
              autoFocus
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button type="submit" style={{ flex: 1, background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#ffffff", padding: "12px", borderRadius: "10px", border: "none", fontWeight: "800", fontSize: "14px", cursor: "pointer" }}>Dekripsi Vault</button>
              <button type="button" onClick={handleExitApp} style={{ backgroundColor: "#ef4444", color: "#ffffff", padding: "12px 20px", borderRadius: "10px", border: "none", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>🚪 Keluar</button>
            </div>
          </form>
          {errorMsg && <p style={{ color: "#f87171", fontSize: "12px", marginTop: "12px" }}>{errorMsg}</p>}
        </div>
      ) : (
        /* UNLOCKED VAULT DESKTOP */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* SUBHEADER TIMER & ACTIONS */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "12px", color: themeSubtext, margin: 0 }}>⏱️ Auto-Lock dalam: <span style={{ fontWeight: "800", color: "#818cf8" }}>{autoLockTime}s</span></p>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleExportJson} style={{ backgroundColor: "#ff6b00", color: "#ffffff", padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>💾 Ekspor JSON</button>
              <label style={{ backgroundColor: "#eab308", color: "#0f172a", padding: "8px 16px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>
                📥 Impor JSON
                <input type="file" accept=".json" onChange={handleImportJson} style={{ display: "none" }} />
              </label>
              <button onClick={handleLockVault} style={{ backgroundColor: "#ef4444", color: "#ffffff", padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>🔒 Kunci Vault</button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 🛡️ FITUR LENGKAP: MONITORING & KESEHATAN PASSWORD PC VAULT */}
          {/* ============================================================ */}
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(99, 102, 241, 0.2)", border: "1px solid rgba(99, 102, 241, 0.4)" }}>
                  <span style={{ fontSize: "18px" }}>📊</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: themeText, letterSpacing: "0.3px" }}>KESEHATAN & MONITORING PASSWORD</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: themeSubtext }}>Audit Keamanan Kredensial & Deteksi Sandi Rentan Real-Time</p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: audit.healthColor }}>{audit.healthScore}%</div>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: audit.healthColor }}>{audit.healthRating}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHealthDetails((p) => !p)}
                  style={{ background: "none", border: `1px solid ${themeBorder}`, borderRadius: "8px", color: themeSubtext, cursor: "pointer", padding: "6px 10px", fontSize: "11px" }}
                >
                  {showHealthDetails ? "Tutup Detail ▲" : "Lihat Detail ▼"}
                </button>
              </div>
            </div>

            {/* Progress Bar Persentase */}
            <div style={{ width: "100%" }}>
              <div style={{ height: "8px", backgroundColor: themeInputBg, borderRadius: "999px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${audit.healthScore}%`, background: `linear-gradient(90deg, #6366f1, ${audit.healthColor})`, boxShadow: `0 0 10px ${audit.healthColor}88`, transition: "width 0.5s ease" }} />
              </div>
            </div>

            {/* 3 Chip Metrik Interaktif (Filter Satu-Klik) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div
                onClick={() => setSecurityFilter((prev) => (prev === "DUPLICATE" ? "ALL" : "DUPLICATE"))}
                style={{
                  backgroundColor: securityFilter === "DUPLICATE" ? "rgba(239, 68, 68, 0.2)" : themeInputBg,
                  border: securityFilter === "DUPLICATE" ? "1px solid #ef4444" : audit.duplicateItemsCount > 0 ? "1px solid rgba(239, 68, 68, 0.4)" : `1px solid ${themeBorder}`,
                  borderRadius: "12px",
                  padding: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ fontSize: "20px", fontWeight: "900", color: audit.duplicateItemsCount > 0 ? "#f87171" : themeSubtext }}>
                  {audit.duplicateItemsCount} Akun
                </div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: audit.duplicateItemsCount > 0 ? "#fca5a5" : themeSubtext, marginTop: "2px" }}>
                  ⚠️ Sandi Duplikat (Klik untuk filter)
                </div>
              </div>

              <div
                onClick={() => setSecurityFilter((prev) => (prev === "WEAK" ? "ALL" : "WEAK"))}
                style={{
                  backgroundColor: securityFilter === "WEAK" ? "rgba(245, 158, 11, 0.2)" : themeInputBg,
                  border: securityFilter === "WEAK" ? "1px solid #f59e0b" : audit.weakCount > 0 ? "1px solid rgba(245, 158, 11, 0.4)" : `1px solid ${themeBorder}`,
                  borderRadius: "12px",
                  padding: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ fontSize: "20px", fontWeight: "900", color: audit.weakCount > 0 ? "#fbbf24" : themeSubtext }}>
                  {audit.weakCount} Akun
                </div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: audit.weakCount > 0 ? "#fde68a" : themeSubtext, marginTop: "2px" }}>
                  🔓 Sandi Lemah (&lt; 8 kar / pola simpel)
                </div>
              </div>

              <div
                onClick={() => setSecurityFilter((prev) => (prev === "STRONG" ? "ALL" : "STRONG"))}
                style={{
                  backgroundColor: securityFilter === "STRONG" ? "rgba(16, 185, 129, 0.2)" : themeInputBg,
                  border: securityFilter === "STRONG" ? "1px solid #10b981" : `1px solid ${themeBorder}`,
                  borderRadius: "12px",
                  padding: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#34d399" }}>
                  {audit.strongCount} Akun
                </div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#6ee7b7", marginTop: "2px" }}>
                  🛡️ Sandi Kuat &amp; Unik
                </div>
              </div>
            </div>

            {/* Rekomendasi Cerdas Keamanan */}
            {showHealthDetails && audit.recommendations.length > 0 && (
              <div style={{ backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {audit.recommendations.map((rec, idx) => (
                  <div key={idx} style={{ fontSize: "12px", color: themeText, lineHeight: "1.4" }}>
                    {rec}
                  </div>
                ))}
              </div>
            )}

            {securityFilter !== "ALL" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px" }}>
                <span>Menampilkan filter keamanan: <strong>{securityFilter}</strong> ({filteredItems.length} hasil)</span>
                <button type="button" onClick={() => setSecurityFilter("ALL")} style={{ background: "none", border: "none", color: "#818cf8", fontWeight: "800", cursor: "pointer" }}>
                  ✕ Reset Filter
                </button>
              </div>
            )}
          </div>

          {/* SECURITY SETTINGS CARD */}
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {settingsMsg && <p style={{ fontSize: "12px", color: "#818cf8", backgroundColor: "rgba(49, 46, 129, 0.5)", padding: "8px", borderRadius: "6px", margin: 0 }}>{settingsMsg}</p>}

            <div>
              <h3 style={{ fontSize: "12px", fontWeight: "700", color: themeText, margin: "0 0 10px 0" }}>⚙️ Ubah Master Password Vault</h3>
              <form onSubmit={handleChangeMaster} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="password"
                  placeholder="Master Pass Lama"
                  value={oldMasterInput}
                  onChange={(e) => setOldMasterInput(e.target.value)}
                  style={{ width: "220px", padding: "8px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "6px", color: themeText, fontSize: "12px", outline: "none" }}
                />
                <input
                  type="password"
                  placeholder="Master Pass Baru"
                  value={newMasterInput}
                  onChange={(e) => setNewMasterInput(e.target.value)}
                  style={{ width: "220px", padding: "8px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "6px", color: themeText, fontSize: "12px", outline: "none" }}
                />
                <button type="submit" style={{ backgroundColor: "#8c52ff", color: "#ffffff", padding: "8px 16px", borderRadius: "6px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>Simpan Baru</button>
              </form>
            </div>

            <div>
              <h3 style={{ fontSize: "12px", fontWeight: "700", color: themeText, margin: "0 0 4px 0" }}>🚀 Ubah Kata Kunci Alias (Win + R)</h3>
              <p style={{ fontSize: "11px", color: themeSubtext, margin: "0 0 10px 0" }}>Peluncuran cepat dari dialog Windows Run (Win+R).</p>
              <form onSubmit={handleChangeAlias} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder={`Kata Kunci Baru (misal: ${currentAlias || "RunPass"})`}
                  value={newAliasInput}
                  onChange={(e) => setNewAliasInput(e.target.value)}
                  style={{ width: "220px", padding: "8px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "6px", color: themeText, fontSize: "12px", outline: "none" }}
                />
                <button type="submit" style={{ backgroundColor: "#008ccb", color: "#ffffff", padding: "8px 16px", borderRadius: "6px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>Terapkan Alias Win+R</button>
              </form>
            </div>
          </div>

          {/* FORM TAMBAH / EDIT ITEM DENGAN LIVE PASSWORD STRENGTH BAR */}
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "12px", padding: "18px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "800", color: themeText, margin: "0 0 12px 0" }}>
              {editingId ? "✏️ Edit Kredensial" : "+ Tambah Kredensial Baru"}
            </h3>
            <form onSubmit={handleAddItem} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input type="text" placeholder="Layanan / Site (misal: Google / BCA)" value={siteInput} onChange={(e) => setSiteInput(e.target.value)} style={{ flex: 1, padding: "10px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "8px", color: themeText, fontSize: "12px", outline: "none" }} required />
                <input type="text" placeholder="Username / Email" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} style={{ flex: 1, padding: "10px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "8px", color: themeText, fontSize: "12px", outline: "none" }} required />
                <input type="text" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} style={{ flex: 1, padding: "10px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "8px", color: themeText, fontSize: "12px", outline: "none" }} required />
                <select value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} style={{ width: "130px", padding: "10px 12px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "8px", color: themeText, fontSize: "12px", outline: "none" }}>
                  {categoriesList.filter((c) => c !== "Semua").map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button type="button" onClick={handleGeneratePassword} style={{ backgroundColor: "#ff6b00", color: "#ffffff", padding: "10px 16px", borderRadius: "8px", border: "none", fontWeight: "700", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}>🎲 Acak Sandi</button>
                <button type="submit" style={{ backgroundColor: editingId ? "#008ccb" : "#00c853", color: "#ffffff", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "800", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {editingId ? "Perbarui" : "+ Simpan"}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} style={{ backgroundColor: "#64748b", color: "#ffffff", padding: "10px 14px", borderRadius: "8px", border: "none", fontSize: "12px", cursor: "pointer" }}>Batal</button>
                )}
              </div>

              {/* Live Password Strength Meter di Form PC */}
              {passwordInput && (
                <div style={{ backgroundColor: themeInputBg, padding: "8px 12px", borderRadius: "8px", border: `1px solid ${themeBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                    <span style={{ color: themeSubtext }}>Kekuatan Sandi yang Diinput:</span>
                    <span style={{ color: formPassStrength.color, fontWeight: "800" }}>{formPassStrength.label} ({formPassStrength.score}%)</span>
                  </div>
                  <div style={{ height: "4px", backgroundColor: "#334155", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${formPassStrength.score}%`, backgroundColor: formPassStrength.color, transition: "width 0.3s ease" }} />
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* FILTER KATEGORI & PENCARIAN */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <input
              type="text"
              placeholder="🔍 Cari site atau username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "300px", padding: "8px 16px", backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, borderRadius: "999px", color: themeText, fontSize: "12px", outline: "none" }}
            />

            <div style={{ display: "flex", gap: "6px" }}>
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    backgroundColor: selectedCategory === cat ? "#4f46e5" : themeInputBg,
                    color: selectedCategory === cat ? "#ffffff" : themeSubtext,
                    padding: "6px 14px",
                    borderRadius: "999px",
                    border: `1px solid ${themeBorder}`,
                    fontSize: "12px",
                    fontWeight: selectedCategory === cat ? "700" : "500",
                    cursor: "pointer",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* TABEL HASIL PASSWORD DENGAN BADGE KESEHATAN & DETEKSI DUPLIKAT */}
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
              <thead style={{ backgroundColor: themeInputBg, color: themeSubtext, fontSize: "11px", textTransform: "uppercase" }}>
                <tr>
                  <th style={{ padding: "12px 16px" }}>Site / Layanan</th>
                  <th style={{ padding: "12px 16px" }}>Kategori</th>
                  <th style={{ padding: "12px 16px" }}>Username</th>
                  <th style={{ padding: "12px 16px" }}>Password &amp; Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: "32px", textAlign: "center", color: themeSubtext }}>
                      Tidak ada data kredensial yang sesuai dengan pencarian/filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const strength = evaluatePassword(item.password);
                    const sameSites = audit.passMap[item.password] || [];
                    const isDuplicate = sameSites.length > 1;
                    const otherSites = sameSites.filter((s) => s !== item.site);

                    return (
                      <tr key={item.id} style={{ borderTop: `1px solid ${themeBorder}` }}>
                        <td style={{ padding: "12px 16px", fontWeight: "700", color: themeText }}>
                          <div>{item.site}</div>
                          {isDuplicate && (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", marginTop: "4px" }}>
                              <span>⚠️ Duplikat di {otherSites.length} akun ({otherSites.slice(0, 2).join(", ")})</span>
                              <button
                                type="button"
                                onClick={() => handleQuickFixPassword(item)}
                                style={{ backgroundColor: "#ef4444", color: "#ffffff", border: "none", borderRadius: "4px", padding: "2px 6px", fontSize: "9px", fontWeight: "800", cursor: "pointer", marginLeft: "4px" }}
                              >
                                Acak Baru
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "700" }}>{item.category || "Kampus"}</span>
                        </td>
                        <td style={{ padding: "12px 16px", color: themeSubtext }}>{item.username}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "13px" }}>
                              {visiblePasswords[item.id] ? item.password : "••••••••••••"}
                            </span>
                            <button onClick={() => togglePasswordVisibility(item.id)} style={{ backgroundColor: "transparent", border: "none", cursor: "pointer", fontSize: "14px" }}>
                              {visiblePasswords[item.id] ? "🙈" : "👁️"}
                            </button>
                            {/* Strength Tag */}
                            <span style={{ backgroundColor: `${strength.color}15`, color: strength.color, border: `1px solid ${strength.color}40`, padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "800" }}>
                              {strength.label}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                            <button onClick={() => handleCopyPassword(item.password)} style={{ backgroundColor: "#4f46e5", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontWeight: "700", fontSize: "11px", cursor: "pointer" }}>📋 Copy</button>
                            <button onClick={() => handleEditClick(item)} style={{ backgroundColor: "#f59e0b", color: "#ffffff", border: "none", padding: "6px 10px", borderRadius: "6px", fontWeight: "700", fontSize: "11px", cursor: "pointer" }}>✏️ Edit</button>
                            <button onClick={() => handleDeleteItem(item.id)} style={{ backgroundColor: "#ef4444", color: "#ffffff", border: "none", padding: "6px 10px", borderRadius: "6px", fontWeight: "700", fontSize: "11px", cursor: "pointer" }}>🗑️ Hapus</button>
                            <button onClick={() => setHistoryModalItem(item)} title="Riwayat Password" style={{ backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, color: themeText, padding: "6px 8px", borderRadius: "6px", fontWeight: "700", fontSize: "11px", cursor: "pointer" }}>📜</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PAIRING QR CODE */}
      {showPairingModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "16px", padding: "28px", width: "380px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
            <h3 style={{ fontSize: "17px", fontWeight: "800", marginBottom: "6px", color: themeText }}>MobilePMSV P2P Sync</h3>
            <p style={{ fontSize: "12px", color: themeSubtext, marginBottom: "18px" }}>Scan QR Code ini menggunakan aplikasi MobilePMSV di HP Anda:</p>
            <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "12px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "260px" }}>
              {pairingInfo?.qr_svg ? (
                <div dangerouslySetInnerHTML={{ __html: pairingInfo.qr_svg }} />
              ) : (
                <p style={{ color: "#000000", fontSize: "13px", fontWeight: "800" }}>{pairingInfo?.ip || "192.168.0.103"}:{pairingInfo?.port || 14202}</p>
              )}
            </div>
            <p style={{ fontSize: "12px", color: themeSubtext, marginTop: "14px" }}>
              <strong>IP PC:</strong> <span style={{ color: "#818cf8" }}>{pairingInfo?.ip || "192.168.0.103"}:{pairingInfo?.port || 14202}</span>
            </p>
            <button onClick={() => setShowPairingModal(false)} style={{ width: "100%", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#ffffff", padding: "10px", borderRadius: "10px", border: "none", fontWeight: "800", fontSize: "13px", cursor: "pointer", marginTop: "16px" }}>Tutup</button>
          </div>
        </div>
      )}

      {/* MODAL RIWAYAT PASSWORD */}
      {historyModalItem && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "16px", padding: "24px", width: "420px", maxWidth: "90%" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "800", margin: "0 0 10px 0", color: themeText }}>
              📜 Riwayat Password ({historyModalItem.site})
            </h3>
            <p style={{ fontSize: "11px", color: themeSubtext, marginBottom: "14px" }}>
              Sistem memproteksi agar password lama tidak dapat digunakan kembali sebelum diubah minimal 5 kali.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto", marginBottom: "16px" }}>
              {(historyModalItem.history || [historyModalItem.password]).map((histPass, index) => (
                <div key={index} style={{ backgroundColor: themeInputBg, border: `1px solid ${themeBorder}`, padding: "10px 14px", borderRadius: "8px", fontSize: "12px", fontFamily: "monospace", display: "flex", justifyContent: "space-between" }}>
                  <span>{histPass}</span>
                  <span style={{ fontSize: "11px", color: themeSubtext }}>v{index + 1}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setHistoryModalItem(null)} style={{ width: "100%", backgroundColor: "#4f46e5", color: "#ffffff", padding: "10px", borderRadius: "8px", border: "none", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
