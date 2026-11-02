import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QrScannerModal({ isOpen, onClose, onScanSuccess }) {
  const isScanningRef = useRef(false);
  const html5QrcodeRef = useRef(null);
  const [manualIp, setManualIp] = useState("");
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    isScanningRef.current = false;
    setCameraError("");
    const scannerId = "p2p-qr-reader";

    const startScanner = async () => {
      try {
        const html5Qrcode = new Html5Qrcode(scannerId);
        html5QrcodeRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            if (isScanningRef.current) return;
            isScanningRef.current = true;

            if (navigator.vibrate) {
              navigator.vibrate(150);
            }

            html5Qrcode
              .stop()
              .then(() => {
                onScanSuccess(decodedText);
              })
              .catch(() => {
                onScanSuccess(decodedText);
              });
          },
          () => {}
        );
      } catch (err) {
        console.warn("Kamera tidak dapat dimulai:", err);
        setCameraError("Kamera tidak dapat diakses. Gunakan input manual IP di bawah.");
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 350);

    return () => {
      clearTimeout(timer);
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().catch(() => {});
    }
    onScanSuccess(manualIp.trim());
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 7, 18, 0.88)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 9999,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "24px",
          padding: "20px",
          maxWidth: "380px",
          width: "100%",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          color: "#f8fafc",
          textAlign: "center",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #1e293b",
            paddingBottom: "12px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>📷</span>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>
              Pairing P2P dengan PC
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: "#1e293b",
              color: "#94a3b8",
              border: "none",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Viewfinder Kamera */}
        <div
          id="p2p-qr-reader"
          style={{
            width: "100%",
            minHeight: "220px",
            borderRadius: "16px",
            overflow: "hidden",
            backgroundColor: "#020617",
            border: "1px solid #334155",
            marginBottom: "12px",
          }}
        ></div>

        {cameraError && (
          <p
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              fontSize: "11px",
              padding: "8px 12px",
              borderRadius: "10px",
              margin: "8px 0",
            }}
          >
            {cameraError}
          </p>
        )}

        <p style={{ fontSize: "11px", color: "#94a3b8", margin: "4px 0 16px 0", lineHeight: "1.4" }}>
          Arahkan kamera ke QR Code di layar PC (Menu <strong>Pairing PC</strong>).
        </p>

        {/* Divider / Atau Manual IP */}
        <div
          style={{
            position: "relative",
            textAlign: "center",
            margin: "16px 0 12px 0",
          }}
        >
          <hr style={{ border: "none", borderTop: "1px solid #1e293b" }} />
          <span
            style={{
              position: "absolute",
              top: "-9px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#0f172a",
              padding: "0 10px",
              fontSize: "10px",
              color: "#64748b",
              fontWeight: "700",
              textTransform: "uppercase",
            }}
          >
            Atau Ketik IP PC Manual
          </span>
        </div>

        <form onSubmit={handleManualSubmit} style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="Contoh: 192.168.1.15"
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: "#020617",
              border: "1px solid #334155",
              borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "12px",
              color: "#ffffff",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: "#6366f1",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "10px 16px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Sync
          </button>
        </form>
      </div>
    </div>
  );
}
