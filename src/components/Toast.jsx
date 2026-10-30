import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function Toast({ message, isVisible, onClose }) {
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500); // Otomatis hilang setelah 3.5 detik

    return () => clearTimeout(timer);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-slate-900/95 border border-rose-500/40 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl shadow-rose-950/50 backdrop-blur-md animate-fadeIn">
      <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
        <AlertCircle className="w-5 h-5 animate-pulse" />
      </div>
      <div>
        <p className="text-xs font-semibold text-rose-300">Nama Wajib Diisi!</p>
        <p className="text-[11px] text-slate-300">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-2 p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}