// Service Worker untuk menyimpan data pending secara aman
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SAVE_PENDING_DATA") {
    console.log("[Stealth Vault] Menerima data pending:", request.payload);
    
    chrome.storage.local.set({ pendingVaultData: request.payload }, () => {
      console.log("[Stealth Vault] Data pending berhasil tersimpan di chrome.storage.local!");
      sendResponse({ status: "SUCCESS" });
    });
    
    return true; // Menandakan respon dikirim secara asinkron
  }
});