import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QrScannerModal({ isOpen, onClose, onScanSuccess }) {
  const isScanningRef = useRef(false);
  const html5QrcodeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    isScanningRef.current = false;
    const scannerId = "p2p-qr-reader";

    const startScanner = async () => {
      try {
        const html5Qrcode = new Html5Qrcode(scannerId);
        html5QrcodeRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Mencegah eksekusi berulang kali (kelap-kelip tanpa respon)
            if (isScanningRef.current) return;
            isScanningRef.current = true;

            // Beri respon getar di HP
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }

            // Hentikan kamera lalu kirim data
            html5Qrcode
              .stop()
              .then(() => {
                onScanSuccess(decodedText);
              })
              .catch((err) => {
                console.error("Error stopping scanner:", err);
                onScanSuccess(decodedText);
              });
          },
          () => {
            // Abaikan error per-frame
          }
        );
      } catch (err) {
        console.error("Gagal memulai kamera:", err);
      }
    };

    // Beri sedikit jeda agar DOM modal siap
    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-sm w-full text-center space-y-3">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-slate-200">Arahkan ke QR Code PC</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
          >
            ✕
          </button>
        </div>

        {/* Elemen tempat kamera dirender */}
        <div id="p2p-qr-reader" className="w-full overflow-hidden rounded-xl bg-black min-h-[260px]"></div>

        <p className="text-[11px] text-slate-400">
          Pastikan HP dan PC berada dalam jaringan Wi-Fi yang sama.
        </p>
      </div>
    </div>
  );
}