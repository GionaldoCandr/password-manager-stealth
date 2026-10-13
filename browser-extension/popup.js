document.addEventListener("DOMContentLoaded", () => {
  const pendingContainer = document.getElementById("pending-container");
  const noPending = document.getElementById("no-pending");
  const pendingSite = document.getElementById("pending-site");

  // Muat data pending yang disimpan oleh background.js
  chrome.storage.local.get("pendingVaultData", (result) => {
    console.log("[Popup] Membaca storage:", result);

    if (result && result.pendingVaultData) {
      const data = result.pendingVaultData;
      pendingContainer.style.display = "block";
      noPending.style.display = "none";
      pendingSite.textContent = `${data.site} (${data.username})`;
    } else {
      pendingContainer.style.display = "none";
      noPending.style.display = "block";
    }
  });

  // Tombol Otorisasi & Sync ke Desktop App
  document.getElementById("sync-btn").addEventListener("click", () => {
    const token = document.getElementById("winr-token").value.trim();
    const masterPass = document.getElementById("master-pass").value.trim();

    if (!token || !masterPass) {
      alert("Harap masukkan Token Alias Win+R dan Master Password!");
      return;
    }

    chrome.storage.local.get("pendingVaultData", (result) => {
      if (!result.pendingVaultData) {
        alert("Data pending tidak ditemukan!");
        return;
      }

      const payload = {
        aliasToken: token,
        masterPassword: masterPass,
        data: result.pendingVaultData
      };

      // Kirim data ke Local HTTP Listener Desktop App
      fetch("http://127.0.0.1:14201/sync-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Aktivasi Handshake Sukses! Akun telah dikirim ke Stealth Vault.");
          chrome.storage.local.remove("pendingVaultData", () => {
            window.close();
          });
        } else {
          alert("Gagal: " + data.message);
        }
      })
      .catch(() => {
        alert("Gagal terhubung ke aplikasi desktop! Pastikan biner Stealth Vault (Win+R / App) sedang berjalan.");
      });
    });
  });
});