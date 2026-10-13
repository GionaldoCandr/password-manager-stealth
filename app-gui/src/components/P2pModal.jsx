import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Smartphone, Wifi, CheckCircle2, X } from 'lucide-react';

export default function P2pModal({ isOpen, onClose }) {
  const [pairingData, setPairingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPairingInfo();
    }
  }, [isOpen]);

  const loadPairingInfo = async () => {
    setLoading(true);
    setError('');
    try {
      // Panggil fungsi Rust yang sudah kita buat sebelumnya
      const data = await invoke('get_p2p_pairing_info');
      setPairingData(data);
    } catch (err) {
      setError('Gagal mendapatkan IP Lokal: ' + err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-200 font-sans">
        
        {/* Tombol Close */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <QrCode size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Mobile P2P Sync</h3>
            <p className="text-xs text-slate-400">Hubungkan HP ke PC tanpa Cloud</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            Mengambil alamat IP lokal & membuat kunci enkripsi...
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Tampilan QR Code */}
            <div className="p-4 bg-white rounded-2xl shadow-inner my-2">
              <QRCodeSVG 
                value={JSON.stringify(pairingData)} 
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Informasi IP & Port */}
            <div className="w-full mt-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">IP Lokal PC:</span>
                <span className="font-mono text-indigo-300">{pairingData?.local_ip}:{pairingData?.port}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Alias Active:</span>
                <span className="font-mono text-emerald-400">{pairingData?.alias_token}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 text-center">
              <Wifi size={14} className="text-emerald-400 shrink-0" />
              <span>Pastikan HP dan PC terhubung ke jaringan Wi-Fi yang sama.</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}