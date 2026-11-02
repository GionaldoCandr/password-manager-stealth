import React, { useState, useEffect, useMemo } from "react";
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
  X,
  Check,
  AlertTriangle,
  Activity,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight
} from "lucide-react";
import QrScannerModal from "./components/QrScannerModal";

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

  // Penalti untuk pola umum / rentan
  const commonWeak = ["123456", "password", "admin", "admin123", "qwerty", "12345678", "secret", "user123"];
  if (commonWeak.includes(pwd.toLowerCase())) {
    score = Math.min(score, 20);
  }

  if (score >= 80) return { score, label: "Sangat Kuat", color: "#10b981", level: "very_strong", isStrong: true };
  if (score >= 65) return { score, label: "Kuat", color: "#22c55e", level: "strong", isStrong: true };
  if (score >= 45) return { score, label: "Sedang", color: "#eab308", level: "medium", isMedium: true };
  return { score, label: "Lemah", color: "#ef4444", level: "weak", isWeak: true };
}

// Helper: Audit komprehensif kesehatan seluruh password di vault
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

  // Petakan password untuk mendeteksi duplikat
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

  // Kalkulasi Skor Kesehatan Keseluruhan (0 - 100%)
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

export default function AppMobile() {
  const [masterPasswordInput, setMasterPasswordInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("Semua");
  const [securityFilter, setSecurityFilter] = useState("ALL"); // ALL, DUPLICATE, WEAK, STRONG
  const [errorMsg, setErrorMsg] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [showHealthDetails, setShowHealthDetails] = useState(true);

  // Stored target PC IP Address
  const [savedPcIp, setSavedPcIp] = useState(
    () => localStorage.getItem("STEALTH_PC_IP") || ""
  );

  // Form states
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
      const timer = setTimeout(() => setToastMessage(""), 2800);
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
      console.warn("Gagal muat data lokal:", err);
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
          setErrorMsg("Master Password salah! (Default: admin123)");
        }
      }
    } catch (err) {
      setErrorMsg("Master Password salah! Akses ditolak.");
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
      showToast("🎲 Password acak 16 karakter dibuat!");
    } catch (err) {
      console.warn("Gagal generate:", err);
    }
  };

  // Helper pembersih QR Code data menjadi IP address murni
  const extractCleanIp = (rawText) => {
    if (!rawText) return "";
    let str = String(rawText).trim();
    if (str.startsWith("{") && str.endsWith("}")) {
      try {
        const parsed = JSON.parse(str);
        return parsed.ip || parsed.local_ip || "";
      } catch (e) {}
    }
    str = str.replace(/^https?:\/\//i, "");
    str = str.split("/")[0];
    str = str.split(":")[0];
    return str.trim();
  };

  const executeTwoWaySyncWithItems = async (targetIp, currentLocalItems) => {
    const cleanIp = extractCleanIp(targetIp);
    if (!cleanIp) {
      showToast("IP PC tidak valid!");
      return;
    }

    setIsSyncing(true);
    setStatusMsg(`Menghubungkan ke PC (${cleanIp})...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
      if (navigator.vibrate) navigator.vibrate(80);

      // 1. Fetch data dari server PC
      const response = await fetch(`http://${cleanIp}:14202/api/sync`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server PC merespon status ${response.status}`);
      }

      const pcItems = await response.json();

      // 2. CRDT Timestamp-based Conflict-Free Replicated Data Type Merge
      const mergedMap = new Map();
      [...pcItems, ...currentLocalItems].forEach((item) => {
        if (!item || !item.id) return;
        if (
          !mergedMap.has(item.id) ||
          (item.updated_at || 0) >= (mergedMap.get(item.id).updated_at || 0)
        ) {
          mergedMap.set(item.id, item);
        }
      });

      const finalMergedItems = Array.from(mergedMap.values());

      // 3. Kirim balik hasil penggabungan ke PC
      const postRes = await fetch(`http://${cleanIp}:14202/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault_items: finalMergedItems }),
        signal: controller.signal,
      });

      if (!postRes.ok) {
        throw new Error("PC menolak menyimpan pembaruan!");
      }

      // 4. Simpan ke local state HP
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

      localStorage.setItem("STEALTH_PC_IP", cleanIp);
      setSavedPcIp(cleanIp);

      setStatusMsg(`✅ Berhasil tersinkronisasi dengan PC (${finalMergedItems.length} item)`);
      showToast("⚡ Sinkronisasi P2P Berhasil!");
    } catch (err) {
      console.warn("Gagal P2P Sync:", err);
      let note = "Pastikan PC & HP di jaringan Wi-Fi yang sama.";
      if (err.name === "AbortError") {
        note = "Timeout. Cek apakah Firewall PC mengizinkan port 14202.";
      }
      setStatusMsg(`⚠️ Gagal konek PC: ${note}`);
      showToast("⚠️ PC tidak dapat dijangkau");
    } finally {
      clearTimeout(timeoutId);
      setIsSyncing(false);
    }
  };

  const handleScanSuccess = async (scannedData) => {
    setIsScannerOpen(false);
    const ip = extractCleanIp(scannedData);
    if (ip) {
      setSavedPcIp(ip);
      localStorage.setItem("STEALTH_PC_IP", ip);
      executeTwoWaySyncWithItems(ip, items);
    } else {
      showToast("Gagal membaca IP dari QR Code!");
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!siteInput || !usernameInput || !passwordInput) {
      showToast("Lengkapi semua kolom!");
      return;
    }

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
        showToast("✅ Password diperbarui!");
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
        showToast("✅ Password baru disimpan!");
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
        setStatusMsg("✅ Data tersimpan di memori HP!");
      }
    } catch (err) {
      showToast("Gagal menyimpan item");
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setSiteInput(item.site);
    setUsernameInput(item.username);
    setPasswordInput(item.password);
    setCategoryInput(item.category || "Kampus");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    showToast("🗑️ Item dihapus");
    if (savedPcIp) executeTwoWaySyncWithItems(savedPcIp, updated);
  };

  const handleCopy = (pass, id) => {
    navigator.clipboard.writeText(pass);
    setCopiedId(id);
    showToast("📋 Password disalin!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Fitur Cepat: Acak sandi baru untuk item tertentu (misal yang duplikat / lemah)
  const handleQuickFixPassword = async (item) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let newPass = "";
    for (let i = 0; i < 16; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const now = Date.now();
    const updatedList = items.map((i) => {
      if (i.id === item.id) {
        const curHist = Array.isArray(i.history) ? i.history : [i.password];
        return {
          ...i,
          password: newPass,
          history: [...curHist, newPass],
          updated_at: now,
        };
      }
      return i;
    });

    setItems(updatedList);
    if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
      await invoke("import_vault_data", {
        importedJson: JSON.stringify(updatedList),
      });
    } else {
      localStorage.setItem("STEALTH_VAULT_ITEMS", JSON.stringify(updatedList));
    }

    showToast(`🎲 Sandi ${item.site} diperbarui ke 16 karakter acak!`);
    if (savedPcIp) executeTwoWaySyncWithItems(savedPcIp, updatedList);
  };

  // Komputasi Audit Keamanan & Kesehatan Vault
  const audit = useMemo(() => auditVault(items), [items]);

  // Evaluasi kekuatan password yang sedang diketik di Form
  const formPassStrength = useMemo(() => evaluatePassword(passwordInput), [passwordInput]);

  const categoriesList = ["Semua", "Kampus", "Pekerjaan", "Sosmed", "Keuangan", "Lainnya"];

  const filteredItems = items.filter((item) => {
    if (!item) return false;
    const matchesSearch =
      (item.site || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.username || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategoryFilter === "Semua" ||
      item.category === selectedCategoryFilter;

    // Filter Khusus Keamanan
    let matchesSecurity = true;
    if (securityFilter === "DUPLICATE") {
      const sitesWithSamePass = audit.passMap[item.password] || [];
      matchesSecurity = sitesWithSamePass.length > 1;
    } else if (securityFilter === "WEAK") {
      const ev = evaluatePassword(item.password);
      matchesSecurity = ev.isWeak;
    } else if (securityFilter === "STRONG") {
      const ev = evaluatePassword(item.password);
      const sitesWithSamePass = audit.passMap[item.password] || [];
      matchesSecurity = ev.isStrong && sitesWithSamePass.length === 1;
    }

    return matchesSearch && matchesCategory && matchesSecurity;
  });

  return (
    <div
      style={{
        backgroundColor: "#070b14",
        color: "#f8fafc",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        boxSizing: "border-box",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Toast Pop-up */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "max(env(safe-area-inset-top), 28px)",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#4f46e5",
            color: "#ffffff",
            padding: "10px 20px",
            borderRadius: "999px",
            fontSize: "13px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.5)",
            border: "1px solid #818cf8",
            zIndex: 99999,
          }}
        >
          <CheckCircle2 size={16} />
          {toastMessage}
        </div>
      )}

      {/* App Bar / Header dengan Safe Area Top Padding untuk mencegah tabrakan Status Bar / Notch */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          backgroundColor: "rgba(15, 23, 42, 0.96)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid #1e293b",
          paddingTop: "max(env(safe-area-inset-top), 26px)",
          paddingBottom: "12px",
          paddingLeft: "16px",
          paddingRight: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              padding: "8px",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(79, 70, 229, 0.4)",
            }}
          >
            <ShieldCheck size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: "900",
                  letterSpacing: "0.5px",
                  color: "#ffffff",
                }}
              >
                MobilePMSV
              </h1>
              <span
                style={{
                  backgroundColor: "rgba(99, 102, 241, 0.2)",
                  color: "#a5b4fc",
                  border: "1px solid rgba(99, 102, 241, 0.4)",
                  fontSize: "9px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  padding: "2px 6px",
                  borderRadius: "6px",
                }}
              >
                Stealth Vault
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8" }}>
              Zero-Disk Secure P2P Vault
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
            }}
          >
            <Smartphone size={14} />
            <span>Scan QR</span>
          </button>

          {isUnlocked && (
            <button
              type="button"
              onClick={() => setIsUnlocked(false)}
              style={{
                backgroundColor: "#1e293b",
                color: "#94a3b8",
                border: "1px solid #334155",
                borderRadius: "12px",
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Kunci Vault"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area dengan Bottom Safe Margin agar tidak tertutup tombol navigasi Android */}
      <main
        style={{
          flex: 1,
          padding: "16px",
          paddingBottom: "calc(env(safe-area-inset-bottom, 24px) + 60px)",
          maxWidth: "460px",
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {!isUnlocked ? (
          /* LOCK SCREEN VIEW */
          <div
            style={{
              marginTop: "40px",
              backgroundColor: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "24px",
              padding: "28px 20px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "20px",
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
                boxShadow: "0 10px 25px rgba(99, 102, 241, 0.2)",
              }}
            >
              <Lock size={30} color="#818cf8" />
            </div>

            <h2
              style={{
                fontSize: "20px",
                fontWeight: "800",
                color: "#ffffff",
                marginBottom: "6px",
              }}
            >
              Vault Terkunci
            </h2>
            <p
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                marginBottom: "24px",
                lineHeight: "1.5",
              }}
            >
              Masukkan Master Password untuk mendekripsi brankas data di RAM ponsel Anda.
            </p>

            <form onSubmit={handleUnlock}>
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <input
                  type="password"
                  placeholder="Master Password (admin123)"
                  value={masterPasswordInput}
                  onChange={(e) => setMasterPasswordInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    backgroundColor: "#070b14",
                    border: errorMsg ? "1px solid #ef4444" : "1px solid #334155",
                    borderRadius: "14px",
                    color: "#f8fafc",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  autoFocus
                />
              </div>

              {errorMsg && (
                <div
                  style={{
                    color: "#f87171",
                    fontSize: "12px",
                    marginBottom: "16px",
                    textAlign: "left",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  fontSize: "14px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(79, 70, 229, 0.35)",
                }}
              >
                Buka Brankas Vault
              </button>
            </form>
          </div>
        ) : (
          /* UNLOCKED VAULT VIEW */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* P2P Status & Sync Card */}
            <div
              style={{
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "18px",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 6px 16px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: savedPcIp ? "#22c55e" : "#f59e0b",
                    boxShadow: savedPcIp
                      ? "0 0 10px #22c55e"
                      : "0 0 10px #f59e0b",
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#f8fafc",
                    }}
                  >
                    PC:{" "}
                    <span style={{ color: "#818cf8" }}>
                      {savedPcIp || "Belum Terhubung"}
                    </span>
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    {savedPcIp ? "P2P Wi-Fi Sync Ready" : "Scan QR untuk pairing"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {savedPcIp && (
                  <button
                    type="button"
                    onClick={() => executeTwoWaySyncWithItems(savedPcIp, items)}
                    disabled={isSyncing}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      backgroundColor: "#4f46e5",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: isSyncing ? "not-allowed" : "pointer",
                      opacity: isSyncing ? 0.7 : 1,
                    }}
                  >
                    <RefreshCw
                      size={12}
                      style={{
                        animation: isSyncing ? "spin 1s linear infinite" : "none",
                      }}
                    />
                    <span>{isSyncing ? "Syncing..." : "Sync PC"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  style={{
                    backgroundColor: "#1e293b",
                    color: "#94a3b8",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                    padding: "8px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Ubah IP / Scan Ulang"
                >
                  <Edit3 size={12} />
                </button>
              </div>
            </div>

            {/* Status Message Notification Bar */}
            {statusMsg && (
              <div
                style={{
                  backgroundColor: statusMsg.includes("Berhasil")
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(245, 158, 11, 0.15)",
                  color: statusMsg.includes("Berhasil") ? "#6ee7b7" : "#fcd34d",
                  border: statusMsg.includes("Berhasil")
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "14px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  lineHeight: "1.4",
                }}
              >
                <span>{statusMsg}</span>
                <button
                  type="button"
                  onClick={() => setStatusMsg("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    padding: "2px",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ============================================================ */}
            {/* 🛡️ FITUR BARU: MONITORING & KESEHATAN PASSWORD VAULT DASHBOARD */}
            {/* ============================================================ */}
            <div
              style={{
                backgroundColor: "#0d1527",
                border: "1px solid #1e293b",
                borderRadius: "20px",
                padding: "16px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* Header Bar Monitoring */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      padding: "6px",
                      borderRadius: "10px",
                      background: "rgba(99, 102, 241, 0.2)",
                      border: "1px solid rgba(99, 102, 241, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Activity size={16} color="#818cf8" />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "13px",
                        fontWeight: "800",
                        color: "#ffffff",
                        letterSpacing: "0.3px",
                      }}
                    >
                      KESEHATAN & MONITORING PASSWORD
                    </h3>
                    <p style={{ margin: 0, fontSize: "10px", color: "#64748b" }}>
                      Analisis Keamanan Brankas Real-Time
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "900",
                      color: audit.healthColor,
                    }}
                  >
                    {audit.healthScore}%
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHealthDetails((p) => !p)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    {showHealthDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Progress Bar Persentase Kesehatan */}
              <div style={{ width: "100%" }}>
                <div
                  style={{
                    height: "8px",
                    backgroundColor: "#1e293b",
                    borderRadius: "999px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${audit.healthScore}%`,
                      background: `linear-gradient(90deg, #6366f1, ${audit.healthColor})`,
                      boxShadow: `0 0 10px ${audit.healthColor}88`,
                      transition: "width 0.5s ease-in-out",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "6px",
                    fontSize: "10px",
                    fontWeight: "700",
                  }}
                >
                  <span style={{ color: "#94a3b8" }}>
                    Status: <strong style={{ color: audit.healthColor }}>{audit.healthRating}</strong>
                  </span>
                  <span style={{ color: "#64748b" }}>
                    {items.length} Kredensial Terdaftar
                  </span>
                </div>
              </div>

              {/* 3 Chip Metrik Keamanan (Interaktif / Bisa Diklik untuk Filter) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "8px",
                  marginTop: "4px",
                }}
              >
                {/* Chip Duplikat */}
                <div
                  onClick={() =>
                    setSecurityFilter((prev) => (prev === "DUPLICATE" ? "ALL" : "DUPLICATE"))
                  }
                  style={{
                    backgroundColor:
                      securityFilter === "DUPLICATE"
                        ? "rgba(239, 68, 68, 0.25)"
                        : "rgba(15, 23, 42, 0.7)",
                    border:
                      securityFilter === "DUPLICATE"
                        ? "1px solid #ef4444"
                        : audit.duplicateItemsCount > 0
                        ? "1px solid rgba(239, 68, 68, 0.4)"
                        : "1px solid #1e293b",
                    borderRadius: "14px",
                    padding: "8px 10px",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "900",
                      color: audit.duplicateItemsCount > 0 ? "#f87171" : "#94a3b8",
                    }}
                  >
                    {audit.duplicateItemsCount}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      color: audit.duplicateItemsCount > 0 ? "#fca5a5" : "#64748b",
                      marginTop: "2px",
                    }}
                  >
                    ⚠️ Duplikat
                  </div>
                </div>

                {/* Chip Lemah */}
                <div
                  onClick={() =>
                    setSecurityFilter((prev) => (prev === "WEAK" ? "ALL" : "WEAK"))
                  }
                  style={{
                    backgroundColor:
                      securityFilter === "WEAK"
                        ? "rgba(245, 158, 11, 0.25)"
                        : "rgba(15, 23, 42, 0.7)",
                    border:
                      securityFilter === "WEAK"
                        ? "1px solid #f59e0b"
                        : audit.weakCount > 0
                        ? "1px solid rgba(245, 158, 11, 0.4)"
                        : "1px solid #1e293b",
                    borderRadius: "14px",
                    padding: "8px 10px",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "900",
                      color: audit.weakCount > 0 ? "#fbbf24" : "#94a3b8",
                    }}
                  >
                    {audit.weakCount}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      color: audit.weakCount > 0 ? "#fde68a" : "#64748b",
                      marginTop: "2px",
                    }}
                  >
                    🔓 Lemah
                  </div>
                </div>

                {/* Chip Kuat & Unik */}
                <div
                  onClick={() =>
                    setSecurityFilter((prev) => (prev === "STRONG" ? "ALL" : "STRONG"))
                  }
                  style={{
                    backgroundColor:
                      securityFilter === "STRONG"
                        ? "rgba(16, 185, 129, 0.25)"
                        : "rgba(15, 23, 42, 0.7)",
                    border:
                      securityFilter === "STRONG"
                        ? "1px solid #10b981"
                        : "1px solid #1e293b",
                    borderRadius: "14px",
                    padding: "8px 10px",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "900",
                      color: "#34d399",
                    }}
                  >
                    {audit.strongCount}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      color: "#6ee7b7",
                      marginTop: "2px",
                    }}
                  >
                    🛡️ Kuat & Unik
                  </div>
                </div>
              </div>

              {/* Rekomendasi Cerdas Keamanan (Dapat diciutkan) */}
              {showHealthDetails && audit.recommendations.length > 0 && (
                <div
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid #1e293b",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    marginTop: "4px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {audit.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: "11px",
                        color: "#cbd5e1",
                        lineHeight: "1.4",
                      }}
                    >
                      {rec}
                    </div>
                  ))}
                </div>
              )}

              {/* Indikator Filter Aktif */}
              {securityFilter !== "ALL" && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "rgba(79, 70, 229, 0.15)",
                    border: "1px solid rgba(79, 70, 229, 0.3)",
                    borderRadius: "10px",
                    padding: "6px 10px",
                    fontSize: "11px",
                  }}
                >
                  <span style={{ color: "#c7d2fe" }}>
                    Menampilkan filter: <strong>{securityFilter}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSecurityFilter("ALL")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#818cf8",
                      fontWeight: "800",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              )}
            </div>

            {/* Form Tambah / Edit Password */}
            <div
              style={{
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "20px",
                padding: "18px 16px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "#ffffff",
                  }}
                >
                  <PlusCircle size={18} color="#818cf8" />
                  <span>{editingId ? "Edit Password" : "Tambah Password Baru"}</span>
                </div>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setSiteInput("");
                      setUsernameInput("");
                      setPasswordInput("");
                    }}
                    style={{
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <X size={14} />
                    <span>Batal</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveItem}>
                {/* Nama Situs */}
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#94a3b8",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    <Globe size={12} />
                    <span>Nama Situs / Layanan</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Mobile Banking / Google / Kampus"
                    value={siteInput}
                    onChange={(e) => setSiteInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      backgroundColor: "#070b14",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "13px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Username / Email */}
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#94a3b8",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    <User size={12} />
                    <span>Username / Email / ID</span>
                  </label>
                  <input
                    type="text"
                    placeholder="user@example.com"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      backgroundColor: "#070b14",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "13px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Password & Generator */}
                <div style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      <Key size={12} />
                      <span>Password</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "none",
                        border: "none",
                        color: "#818cf8",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      <Dices size={13} />
                      <span>Acak Password</span>
                    </button>
                  </div>

                  <div style={{ position: "relative" }}>
                    <input
                      type={showPasswordInForm ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 42px 12px 14px",
                        backgroundColor: "#070b14",
                        border: "1px solid #334155",
                        borderRadius: "12px",
                        color: "#f8fafc",
                        fontSize: "13px",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordInForm(!showPasswordInForm)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#64748b",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      {showPasswordInForm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Indikator Kekuatan Password Real-Time di Form */}
                  {passwordInput && (
                    <div style={{ marginTop: "6px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "10px",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ color: "#94a3b8" }}>Kekuatan Sandi:</span>
                        <span
                          style={{
                            color: formPassStrength.color,
                            fontWeight: "800",
                          }}
                        >
                          {formPassStrength.label} ({formPassStrength.score}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: "4px",
                          backgroundColor: "#1e293b",
                          borderRadius: "999px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${formPassStrength.score}%`,
                            backgroundColor: formPassStrength.color,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Kategori Dropdown */}
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#94a3b8",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    <Folder size={12} />
                    <span>Kategori</span>
                  </label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      backgroundColor: "#070b14",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "13px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  >
                    <option value="Kampus">Kampus</option>
                    <option value="Pekerjaan">Pekerjaan</option>
                    <option value="Sosmed">Sosmed</option>
                    <option value="Keuangan">Keuangan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "13px",
                    fontWeight: "800",
                    cursor: "pointer",
                    boxShadow: "0 8px 18px rgba(79, 70, 229, 0.3)",
                  }}
                >
                  {editingId ? "Perbarui & Sync ke PC" : "+ Simpan & Sync ke PC"}
                </button>
              </form>
            </div>

            {/* Pencarian & Filter Kategori */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Daftar Password ({filteredItems.length})
                </h3>
              </div>

              {/* Search Bar */}
              <div style={{ position: "relative", marginBottom: "12px" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#64748b",
                  }}
                />
                <input
                  type="text"
                  placeholder="Cari situs atau username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 40px",
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "14px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              {/* Filter Pills */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  paddingBottom: "6px",
                  scrollbarWidth: "none",
                }}
              >
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: "700",
                      border: "none",
                      backgroundColor:
                        selectedCategoryFilter === cat ? "#4f46e5" : "#1e293b",
                      color:
                        selectedCategoryFilter === cat ? "#ffffff" : "#94a3b8",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Daftar Kartu Vault Item */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredItems.length === 0 ? (
                <div
                  style={{
                    padding: "36px 16px",
                    textAlign: "center",
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "18px",
                  }}
                >
                  <ShieldCheck
                    size={36}
                    color="#475569"
                    style={{ margin: "0 auto 12px auto" }}
                  />
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#94a3b8",
                    }}
                  >
                    Tidak ada data password yang cocok.
                  </div>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isVisible = visiblePasswords[item.id];
                  const samePassSites = audit.passMap[item.password] || [];
                  const isDuplicate = samePassSites.length > 1;
                  const otherSites = samePassSites.filter((s) => s !== item.site);
                  const strength = evaluatePassword(item.password);

                  return (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: "#0f172a",
                        border: isDuplicate
                          ? "1px solid rgba(239, 68, 68, 0.4)"
                          : "1px solid #1e293b",
                        borderRadius: "18px",
                        padding: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                      }}
                    >
                      {/* Kartu Header: Nama Situs + Kategori + Badge Kekuatan */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              padding: "6px",
                              backgroundColor: "rgba(99, 102, 241, 0.15)",
                              borderRadius: "8px",
                              color: "#818cf8",
                            }}
                          >
                            <Globe size={16} />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: "800",
                                color: "#ffffff",
                              }}
                            >
                              {item.site}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              {item.username}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {/* Badge Kekuatan Sandi */}
                          <span
                            style={{
                              backgroundColor: `${strength.color}15`,
                              color: strength.color,
                              border: `1px solid ${strength.color}40`,
                              fontSize: "9px",
                              fontWeight: "800",
                              padding: "2px 6px",
                              borderRadius: "6px",
                            }}
                          >
                            {strength.label}
                          </span>

                          <span
                            style={{
                              backgroundColor: "#1e293b",
                              color: "#94a3b8",
                              fontSize: "10px",
                              fontWeight: "700",
                              padding: "3px 8px",
                              borderRadius: "6px",
                            }}
                          >
                            {item.category || "Umum"}
                          </span>
                        </div>
                      </div>

                      {/* Alert Jika Sandi Duplikat Terdeteksi */}
                      {isDuplicate && (
                        <div
                          style={{
                            backgroundColor: "rgba(239, 68, 68, 0.12)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "10px",
                            padding: "8px 10px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "11px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "#fca5a5",
                            }}
                          >
                            <AlertTriangle size={13} color="#ef4444" />
                            <span>
                              Duplikat di {otherSites.length} akun (
                              {otherSites.slice(0, 2).join(", ")}
                              {otherSites.length > 2 ? "..." : ""})
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleQuickFixPassword(item)}
                            style={{
                              backgroundColor: "#ef4444",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "3px 8px",
                              fontSize: "10px",
                              fontWeight: "800",
                              cursor: "pointer",
                            }}
                          >
                            Acak Baru
                          </button>
                        </div>
                      )}

                      {/* Password Value Row */}
                      <div
                        style={{
                          backgroundColor: "#070b14",
                          borderRadius: "10px",
                          padding: "8px 12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          border: "1px solid #1e293b",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: isVisible ? "monospace" : "inherit",
                            fontSize: "13px",
                            color: isVisible ? "#38bdf8" : "#94a3b8",
                            letterSpacing: isVisible ? "0.5px" : "2px",
                          }}
                        >
                          {isVisible ? item.password : "••••••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#64748b",
                            cursor: "pointer",
                            padding: "2px",
                          }}
                        >
                          {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      {/* Card Actions Footer */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "2px",
                        }}
                      >
                        <span style={{ fontSize: "10px", color: "#475569" }}>
                          Diperbarui:{" "}
                          {item.updated_at
                            ? new Date(item.updated_at).toLocaleDateString()
                            : "Baru"}
                        </span>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.password, item.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor:
                                copiedId === item.id ? "#10b981" : "#1e293b",
                              color: copiedId === item.id ? "#ffffff" : "#94a3b8",
                              border: "1px solid #334155",
                              borderRadius: "8px",
                              padding: "6px 10px",
                              fontSize: "11px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check size={12} />
                                <span>Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Salin</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditClick(item)}
                            style={{
                              backgroundColor: "#1e293b",
                              color: "#f59e0b",
                              border: "1px solid #334155",
                              borderRadius: "8px",
                              padding: "6px 8px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            style={{
                              backgroundColor: "#1e293b",
                              color: "#ef4444",
                              border: "1px solid #334155",
                              borderRadius: "8px",
                              padding: "6px 8px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* QR Scanner & Manual PC IP Modal */}
      {isScannerOpen && (
        <QrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
      )}
    </div>
  );
}
