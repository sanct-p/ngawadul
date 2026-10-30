import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Shield, Mic, MicOff, Video, VideoOff, 
  ChevronRight, PlusCircle, LogIn, Lock, Globe 
} from 'lucide-react';
import Toast from './Toast';

export const AVATAR_PRESETS = [
  { id: 'indigo', name: 'Cyber Indigo', body: '#6366f1', shirt: '#4338ca', skin: '#fcd34d', hair: '#1e1b4b' },
  { id: 'emerald', name: 'Emerald Ranger', body: '#10b981', shirt: '#047857', skin: '#fde68a', hair: '#064e3b' },
  { id: 'rose', name: 'Sunset Rose', body: '#f43f5e', shirt: '#be123c', skin: '#fed7aa', hair: '#881337' },
  { id: 'amber', name: 'Solar Amber', body: '#f59e0b', shirt: '#b45309', skin: '#fde047', hair: '#451a03' },
  { id: 'purple', name: 'Neon Violet', body: '#a855f7', shirt: '#7e22ce', skin: '#fbcfe8', hair: '#3b0764' },
  { id: 'cyan', name: 'Ocean Cyan', body: '#06b6d4', shirt: '#0e7490', skin: '#fef08a', hair: '#164e63' },
];

export default function Lobby({
  user,
  playerName,
  setPlayerName,
  playerStatus,
  setPlayerStatus,
  selectedAvatar,
  setSelectedAvatar,
  micOn,
  setMicOn,
  camOn,
  toggleCamera,
  mediaStream,
  camError,
  targetRoomId,
  onJoinRoom,
  onCreatePrivateRoom,
  onOpenAuth
}) {
  const lobbyVideoRef = useRef(null);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
  
    const triggerToast = (msg) => {
      setToastMessage(msg);
      setShowToast(true);
    };

  useEffect(() => {
    if (lobbyVideoRef.current && mediaStream) {
      lobbyVideoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, camOn]);

  const isVerifiedHost = user && !user.isAnonymous;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none">
    <Toast 
      isVisible={showToast} 
      message={toastMessage} 
      onClose={() => setShowToast(false)} 
    />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl grid md:grid-cols-12 z-10">
        {/* Left Side: Video Preview & Hardware Toggles */}
        <div className="md:col-span-5 bg-slate-950/60 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg tracking-tight text-white">Ngawadul</h1>
                  <p className="text-xs text-slate-400">Ngawadul in Virtual Space</p>
                </div>
              </div>

              {/* Status Akun Pill */}
              <div className="text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 font-medium">
                {isVerifiedHost ? (
                  <span className="text-emerald-400 border-emerald-500/30 bg-emerald-500/15">
                    ● Host Terdaftar ({user.email.split('@')[0]})
                  </span>
                ) : (
                  <span className="text-slate-400 border-slate-700 bg-slate-800">
                    ● Tamu (Guest)
                  </span>
                )}
              </div>
            </div>

            <div className="relative aspect-video rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner mb-4">
              {camOn && mediaStream ? (
                <video
                  ref={lobbyVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <div className="relative w-20 h-20 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center mb-2 shadow-lg">
                    <div className="flex flex-col items-center animate-bounce">
                      <div className="w-8 h-3 rounded-t-md" style={{ backgroundColor: selectedAvatar.hair }} />
                      <div className="w-8 h-6 rounded-b-md flex items-center justify-around px-1.5" style={{ backgroundColor: selectedAvatar.skin }}>
                        <span className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                        <span className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                      </div>
                      <div className="w-9 h-6 rounded-md -mt-0.5" style={{ backgroundColor: selectedAvatar.body }} />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-300">{playerName || 'Tanpa Nama'}</span>
                  <span className="text-[11px] text-emerald-400 mt-0.5">{selectedAvatar.name}</span>
                </div>
              )}

              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800 text-xs">
                <span className={`w-2 h-2 rounded-full ${micOn ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span>{micOn ? 'Mic Aktif' : 'Mic Mute'}</span>
              </div>
            </div>

            {camError && (
              <div className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl p-2.5 mb-3">
                {camError}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setMicOn((p) => !p)}
                className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition ${
                  micOn
                    ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {micOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                {micOn ? 'Matikan Mic' : 'Nyalakan Mic'}
              </button>
              <button
                type="button"
                onClick={toggleCamera}
                className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition ${
                  camOn
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
              >
                {camOn ? <Video className="w-4 h-4 text-indigo-400" /> : <VideoOff className="w-4 h-4" />}
                {camOn ? 'Kamera On' : 'Kamera Off'}
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Spatial Proximity Call</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Mikrofon & kamera hanya aktif saat mendekati pengguna lain di dalam ruangan.
            </p>
          </div>
        </div>

        {/* Right Side: Profile Customization & Room Controls */}
        <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between">
          <div>
            {targetRoomId ? (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mb-3">
                <Lock className="w-3.5 h-3.5" /> Undangan Room: {targetRoomId}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full mb-3">
                <Globe className="w-3.5 h-3.5" /> Beranda Multi-Room
              </div>
            )}

            <h2 className="text-2xl font-bold text-white mb-1">Pengaturan Profil</h2>
            <p className="text-sm text-slate-400 mb-6">
              Kustomisasi tampilan Anda sebelum memasuki ruang virtual.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nama Tampilan
                </label>
                <input
                  type="text"
                  required
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Contoh: Budi, Andi, Sarah..."
                  maxLength={24}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Status Aktivitas
                </label>
                <input
                  type="text"
                  value={playerStatus}
                  onChange={(e) => setPlayerStatus(e.target.value)}
                  placeholder="Contoh: Siap Diskusi, Sedang Ngopi..."
                  maxLength={30}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Pilih Karakter
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedAvatar(preset)}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                        selectedAvatar.id === preset.id
                          ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow"
                        style={{ backgroundColor: preset.body }}
                      >
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.skin }} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-white truncate">{preset.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons: Join, Create Private Room, or Register */}
          <div className="mt-8 space-y-3">
            {targetRoomId ? (
              <button
                type="button"
                onClick={() => {
                  if (!playerName.trim()) {
                    triggerToast('Silakan masukkan nama panggilan sebelum masuk ke ruangan.');
                    return;
                  }else{
                    onJoinRoom(targetRoomId);
                  }
                }}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
              >
                <span>Masuk ke Room Undangan Ini</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!playerName.trim()) {
                        triggerToast('Silakan masukkan nama panggilan sebelum masuk ke ruangan.');
                        return;
                    }else{
                        onJoinRoom('global-public-room');
                    }
                  }}
                  className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
                >
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>Masuk Ruang Publik</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!playerName.trim()) {
                        triggerToast('Silakan masukkan nama panggilan sebelum masuk ke ruangan.');
                        return;
                    }else{
                        if(isVerifiedHost){
                            onCreatePrivateRoom()
                        }else{
                            onOpenAuth()
                        };
                    }
                  }}
                  className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isVerifiedHost ? 'Buat Private Room' : 'Daftar / Buat Room'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}