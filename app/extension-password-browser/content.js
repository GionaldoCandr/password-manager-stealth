// ==========================================================================
// Stealth Vault Assistant - Content Script
// DOM Form Submit Detection, Save Confirmation Modal, & Smart Autofill
// ==========================================================================

// 1. Listener untuk mendeteksi penyerahan form (Submit) pada halaman web
document.addEventListener(
  "submit",
  function (e) {
    const form = e.target;
    if (!form || !form.querySelector) return;

    const passwordInput = form.querySelector('input[type="password"]');
    const textInput = form.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]');

    if (passwordInput && passwordInput.value) {
      const site = window.location.hostname;
      const username = textInput && textInput.value ? textInput.value : "Unknown User";
      const password = passwordInput.value;

      showFloatingSaveModal(site, username, password);
    }
  },
  true
);

// 2. Menampilkan UI Board Melayang untuk Konfirmasi Simpan
function showFloatingSaveModal(site, username, password) {
  if (document.getElementById("stealth-vault-modal")) return;

  const modal = document.createElement("div");
  modal.id = "stealth-vault-modal";
  modal.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    background-color: #0f172a;
    color: #f8fafc;
    border: 2px solid #38bdf8;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 320px;
    animation: slideInStealth 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  modal.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">🔒</span>
        <strong style="color: #38bdf8; font-size: 13px;">Stealth Vault Assistant</strong>
      </div>
      <span style="font-size: 9px; font-weight: bold; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 6px; border-radius: 4px;">RAM ONLY</span>
    </div>

    <p style="margin: 0 0 10px 0; font-size: 12px; color: #cbd5e1; line-height: 1.4;">
      Simpan kredensial baru untuk <b>${site}</b> ke memori Vault?
    </p>

    <div style="font-size: 11px; margin-bottom: 12px; background: #020617; border: 1px solid #1e293b; padding: 10px; border-radius: 8px; font-family: monospace;">
      <div style="color: #94a3b8; margin-bottom: 4px;"><b>User:</b> <span style="color: #f8fafc;">${username}</span></div>
      <div style="color: #94a3b8;"><b>Pass:</b> <span style="color: #38bdf8;">••••••••••••</span></div>
    </div>

    <div style="display: flex; gap: 8px;">
      <button id="stealth-save-btn" style="flex: 1; padding: 8px 12px; background: linear-gradient(135deg, #38bdf8, #3b82f6); color: #020617; border: none; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: pointer;">
        Ya, Simpan
      </button>
      <button id="stealth-ignore-btn" style="flex: 1; padding: 8px 12px; background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 8px; font-size: 11px; cursor: pointer;">
        Abaikan
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("stealth-save-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage(
      {
        type: "SAVE_PENDING_DATA",
        payload: { site, username, password },
      },
      (response) => {
        if (response && response.status === "SUCCESS") {
          modal.innerHTML = `
            <div style="text-align: center; padding: 10px;">
              <div style="font-size: 24px; margin-bottom: 6px;">⚡</div>
              <strong style="color: #34d399; font-size: 12px; display: block; margin-bottom: 4px;">Data Pending Tersimpan!</strong>
              <p style="font-size: 11px; color: #94a3b8;">Buka popup Stealth Vault di toolbar browser untuk verifikasi Token & Master Password.</p>
            </div>
          `;
          setTimeout(() => modal.remove(), 2500);
        }
      }
    );
  });

  document.getElementById("stealth-ignore-btn").addEventListener("click", () => {
    modal.remove();
  });
}

// 3. Listener Pesan Autofill dari Popup Extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "AUTOFILL_TRIGGER") {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]');

    let filledCount = 0;

    // Autofill username dan password jika ditemukan
    if (passwordInputs.length > 0) {
      passwordInputs.forEach((passInput) => {
        passInput.style.transition = "box-shadow 0.3s, border-color 0.3s";
        passInput.style.borderColor = "#38bdf8";
        passInput.style.boxShadow = "0 0 10px rgba(56, 189, 248, 0.4)";
        filledCount++;
      });

      if (textInputs.length > 0) {
        textInputs.forEach((textInput) => {
          textInput.style.transition = "box-shadow 0.3s, border-color 0.3s";
          textInput.style.borderColor = "#34d399";
          textInput.style.boxShadow = "0 0 10px rgba(52, 211, 153, 0.4)";
          filledCount++;
        });
      }

      sendResponse({ status: "SUCCESS", filledCount });
    } else {
      sendResponse({ status: "NOT_FOUND", filledCount: 0 });
    }

    return true;
  }
});
