document.addEventListener("DOMContentLoaded", () => {
  const pendingContainer = document.getElementById("pending-container");
  const pendingSite = document.getElementById("pending-site");
  const syncBtn = document.getElementById("sync-btn");
  const desktopStatus = document.getElementById("desktop-status");
  const statusText = document.getElementById("status-text");
  const statusToast = document.getElementById("status-toast");
  const autofillBtn = document.getElementById("autofill-btn");
  const generateBtn = document.getElementById("generate-btn");
  const genPassText = document.getElementById("gen-pass-text");
  const copyGenBtn = document.getElementById("copy-gen-btn");
  const strengthLabel = document.getElementById("strength-label");
  const strengthBarFill = document.getElementById("strength-bar-fill");
  const testPasswordInput = document.getElementById("test-password-input");
  const testStrengthWrapper = document.getElementById("test-strength-wrapper");
  const testStrengthLabel = document.getElementById("test-strength-label");
  const testStrengthBarFill = document.getElementById("test-strength-bar-fill");

  const showToast = (message, isSuccess = true) => {
    statusToast.textContent = message;
    statusToast.className = isSuccess ? "toast-success" : "toast-error";
    statusToast.style.display = "block";
    setTimeout(() => {
      statusToast.style.display = "none";
    }, 3500);
  };

  // Helper Evaluasi Kekuatan Password
  const evaluatePassword = (pwd) => {
    if (!pwd) return { score: 0, label: "Kosong", color: "#64748b" };
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

    if (score >= 80) return { score, label: "Sangat Kuat", color: "#10b981" };
    if (score >= 65) return { score, label: "Kuat", color: "#22c55e" };
    if (score >= 45) return { score, label: "Sedang", color: "#f59e0b" };
    return { score, label: "Lemah", color: "#f43f5e" };
  };

  // 1. Probe Status Desktop App (Port 14201)
  const checkDesktopStatus = () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    fetch("http://127.0.0.1:14201/sync-pass", {
      method: "OPTIONS",
      signal: controller.signal,
    })
      .then(() => {
        clearTimeout(timeoutId);
        desktopStatus.className = "status-badge status-online";
        statusText.textContent = "Online (:14201)";
      })
      .catch(() => {
        desktopStatus.className = "status-badge status-offline";
        statusText.textContent = "Offline";
      });
  };

  checkDesktopStatus();

  // 2. Check Pending Data from Chrome Storage
  chrome.storage.local.get("pendingVaultData", (result) => {
    if (result && result.pendingVaultData) {
      const data = result.pendingVaultData;
      pendingContainer.style.display = "block";
      pendingSite.textContent = `${data.site} (${data.username})`;
    } else {
      pendingContainer.style.display = "none";
    }
  });

  // 3. Sync to Desktop App via Port 14201
  syncBtn.addEventListener("click", () => {
    const token = document.getElementById("winr-token").value.trim();
    const masterPass = document.getElementById("master-pass").value.trim();

    if (!token || !masterPass) {
      showToast("Masukkan Token Alias dan Master Password!", false);
      return;
    }

    chrome.storage.local.get("pendingVaultData", (result) => {
      if (!result.pendingVaultData) {
        showToast("Data akun tidak ditemukan!", false);
        return;
      }

      const payload = {
        aliasToken: token,
        masterPassword: masterPass,
        data: result.pendingVaultData,
      };

      syncBtn.disabled = true;
      syncBtn.textContent = "Menyimpan ke RAM...";

      fetch("http://127.0.0.1:14201/sync-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showToast("Sukses! Kredensial tersimpan di RAM Desktop.");
            chrome.storage.local.remove("pendingVaultData", () => {
              setTimeout(() => {
                pendingContainer.style.display = "none";
              }, 1500);
            });
          } else {
            showToast(data.message || "Autentikasi gagal!", false);
          }
        })
        .catch(() => {
          showToast("Gagal terhubung ke Desktop! Pastikan Stealth Vault berjalan.", false);
        })
        .finally(() => {
          syncBtn.disabled = false;
          syncBtn.textContent = "Otorisasi & Simpan ke RAM";
        });
    });
  });

  // 4. Quick Autofill Trigger to Active Web Tab
  autofillBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        showToast("Tidak ada tab aktif!", false);
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "AUTOFILL_TRIGGER" },
        (response) => {
          if (chrome.runtime.lastError) {
            showToast("Buka halaman web dengan form login terlebih dahulu.", false);
          } else if (response && response.status === "SUCCESS") {
            showToast(`Autofill berhasil (${response.filledCount} bidang terisi)!`);
          } else {
            showToast("Tidak ditemukan kolom form login pada halaman.", false);
          }
        }
      );
    });
  });

  // 5. Secure Random Password Generator (16 chars)
  const generateSecurePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()-_+=";
    const array = new Uint32Array(16);
    crypto.getRandomValues(array);
    let pass = "";
    for (let i = 0; i < 16; i++) {
      pass += chars[array[i] % chars.length];
    }
    return pass;
  };

  generateBtn.addEventListener("click", () => {
    const newPass = generateSecurePassword();
    genPassText.textContent = newPass;
    const ev = evaluatePassword(newPass);
    strengthLabel.textContent = `${ev.label} (${ev.score}%)`;
    strengthLabel.style.color = ev.color;
    strengthBarFill.style.width = `${ev.score}%`;
    strengthBarFill.style.backgroundColor = ev.color;

    navigator.clipboard.writeText(newPass);
    showToast("Password acak disalin ke clipboard!");
  });

  copyGenBtn.addEventListener("click", () => {
    const text = genPassText.textContent;
    if (text && !text.includes("••••")) {
      navigator.clipboard.writeText(text);
      showToast("Password disalin!");
    }
  });

  // 6. Real-Time Password Tester
  testPasswordInput.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    if (!val) {
      testStrengthWrapper.style.display = "none";
      return;
    }
    testStrengthWrapper.style.display = "block";
    const ev = evaluatePassword(val);
    testStrengthLabel.textContent = `${ev.label} (${ev.score}%)`;
    testStrengthLabel.style.color = ev.color;
    testStrengthBarFill.style.width = `${ev.score}%`;
    testStrengthBarFill.style.backgroundColor = ev.color;
  });
});
