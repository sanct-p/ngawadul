import React, { useState } from 'react';
import { auth } from '../firebase';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { Mail, CheckCircle2, X, Sparkles } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSendLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    const actionCodeSettings = {
      url: window.location.href, // Mengarahkan kembali ke halaman ini saat link diklik
      handleCodeInApp: true
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setSent(true);
    } catch (err) {
      console.error(err);
      setError('Gagal mengirim email: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Verifikasi Akun Host</h3>
            <p className="text-xs text-slate-400">Daftar untuk membuat Private Room</p>
          </div>
        </div>

        {sent ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold text-white">Tautan Akses Terkirim!</p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Kami telah mengirim tautan verifikasi ke <b>{email}</b>. Buka kotak masuk atau folder spam di email Anda untuk login instan.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendLink} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Tamu dapat masuk ke ruangan tanpa akun. Namun untuk membuat <b>Private Room</b> sendiri, masukkan email Anda untuk verifikasi:
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Alamat Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition"
              />
            </div>

            {error && (
              <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? 'Mengirim Tautan...' : 'Kirim Tautan Verifikasi ke Email'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}