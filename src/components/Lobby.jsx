import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Shield, Mic, MicOff, Video, VideoOff, 
  ChevronRight, PlusCircle, Globe, Lock, AlertCircle, 
  X, LogOut, Copy, Check, DoorOpen, Trash2 
} from 'lucide-react';

export const AVATAR_PRESETS = [
  { id: 'indigo', name: 'Cyber Indigo', body: '#6366f1', shirt: '#4338ca', skin: '#fcd34d', hair: '#1e1b4b' },
  { id: 'emerald', name: 'Emerald Ranger', body: '#10b981', shirt: '#047857', skin: '#fde68a', hair: '#064e3b' },
  { id: 'rose', name: 'Sunset Rose', body: '#f43f5e', shirt: '#be123c', skin: '#fed7aa', hair: '#881337' },
  { id: 'amber', name: 'Solar Amber', body: '#f59e0b', shirt: '#b45309', skin: '#fde047', hair: '#451a03' },
  { id: 'purple', name: 'Neon Violet', body: '#a855f7', shirt: '#7e22ce', skin: '#fbcfe8', hair: '#3b0764' },
  { id: 'cyan', name: 'Ocean Cyan', body: '#06b6d4', shirt: '#0e7490', skin: '#fef08a', hair: '#164e63' },
];

function Toast({ message, isVisible, onClose }) {
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => onClose(), 3500);
    return () => clearTimeout(timer);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-slate-900/95 border border-rose-500/40 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl shadow-rose-950/50 backdrop-blur-md animate-fadeIn">
      <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
        <AlertCircle className="w-5 h-5 animate-pulse" />
      </div>
      <div>
        <p className="text-xs font-semibold text-rose-300">Peringatan</p>
        <p className="text-[11px] text-slate-300">{message}</p>
      </div>
      <button onClick={onClose} className="ml-2 p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

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
  targetRoomTitle,
  userRooms = [],
  onJoinRoom,
  onCreatePrivateRoom,
  onDeleteRoom,
  onOpenAuth,
  onLogout
}) {
  const lobbyVideoRef = useRef(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // State untuk modal custom nama room
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roomTitleInput, setRoomTitleInput] = useState('');

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

  const handleValidateAndJoin = (targetId) => {
    if (!playerName || !playerName.trim()) {
      triggerToast('Silakan masukkan nama panggilan terlebih dahulu.');
      return;
    }
    onJoinRoom(targetId);
  };

  const handleOpenCreateFlow = () => {
    if (!playerName || !playerName.trim()) {
      triggerToast('Silakan masukkan nama panggilan terlebih dahulu.');
      return;
    }
    if (!isVerifiedHost) {
      onOpenAuth();
      return;
    }
    setRoomTitleInput(`Ruang Rapat ${playerName}`);
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreate = (e) => {
    e.preventDefault();
    const finalTitle = roomTitleInput.trim() || `Ruang Privat ${playerName}`;
    setIsCreateModalOpen(false);
    onCreatePrivateRoom(finalTitle);
  };

  const handleCopyLink = (roomId, e) => {
    e.stopPropagation();
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(roomId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none">
      <Toast isVisible={showToast} message={toastMessage} onClose={() => setShowToast(false)} />

      {/* MODAL CUSTOM NAMA ROOM */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <DoorOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Buat Ruang Privat Baru</h3>
                <p className="text-xs text-slate-400">Beri nama unik untuk ruangan Anda</p>
              </div>
            </div>

            <form onSubmit={handleConfirmCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nama Ruangan
                </label>
                <input
                  type="text"
                  required
                  value={roomTitleInput}
                  onChange={(e) => setRoomTitleInput(e.target.value)}
                  placeholder="Misal: Rapat Desain UI/UX..."
                  maxLength={40}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition"
                >
                  Buat & Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl grid md:grid-cols-12 z-10 my-4">
        {/* Sisi Kiri: Video & Mic */}
        <div className="md:col-span-5 bg-slate-950/60 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg tracking-tight text-white">GatherVerse</h1>
                  <p className="text-xs text-slate-400">Multi-Room Virtual Space</p>
                </div>
              </div>

              {isVerifiedHost ? (
                <div className="flex items-center gap-2">
                  <div className="text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-medium">
                    ● {user.email?.split('@')[0]}
                  </div>
                  <button
                    onClick={onLogout}
                    title="Logout & Gunakan Email Lain"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-[10px] px-2.5 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-400 font-medium">
                  ● Tamu
                </div>
              )}
            </div>

            <div className="relative aspect-video rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner mb-4">
              {camOn && mediaStream ? (
                <video ref={lobbyVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
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
                  micOn ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {micOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                {micOn ? 'Matikan Mic' : 'Nyalakan Mic'}
              </button>
              <button
                type="button"
                onClick={toggleCamera}
                className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition ${
                  camOn ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
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

        {/* Sisi Kanan: Profil & Manajemen Room */}
        <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              {targetRoomId ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mb-2">
                  <Lock className="w-3.5 h-3.5" /> Undangan Room: {targetRoomTitle}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full mb-2">
                  <Globe className="w-3.5 h-3.5" /> Beranda Multi-Room
                </div>
              )}
              <h2 className="text-2xl font-bold text-white">Pengaturan Profil</h2>
            </div>

            {/* Input Nama & Status */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nama Tampilan
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Masukkan nama..."
                  maxLength={24}
                  className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-xs text-white outline-none transition ${
                    showToast && (!playerName || !playerName.trim())
                      ? 'border-rose-500 focus:border-rose-400'
                      : 'border-slate-800 focus:border-indigo-500'
                  }`}
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
                  maxLength={30}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition"
                />
              </div>
            </div>

            {/* Pilihan Karakter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Pilih Karakter
              </label>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedAvatar(preset)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      selectedAvatar.id === preset.id
                        ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow" style={{ backgroundColor: preset.body }}>
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.skin }} />
                    </div>
                    <p className="text-xs font-semibold text-white truncate">{preset.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Daftar Ruangan Saya & Tombol Hapus */}
            {isVerifiedHost && (
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5" />
                  <span>Ruangan Saya yang Pernah Dibuat ({userRooms.length})</span>
                </label>
                
                {userRooms.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                    Belum ada private room yang dibuat. Klik tombol di bawah untuk membuat ruangan.
                  </p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {userRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <div className="overflow-hidden mr-2">
                          <p className="text-xs font-bold text-white truncate">{room.title || room.id}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">ID: {room.id}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Tombol Salin Link */}
                          <button
                            onClick={(e) => handleCopyLink(room.id, e)}
                            title="Salin link room"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          >
                            {copiedId === room.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          
                          {/* Tombol Hapus Room */}
                          <button
                            onClick={() => onDeleteRoom(room.id, room.title)}
                            title="Hapus ruangan ini secara permanen"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Masuk */}
                          <button
                            onClick={() => handleValidateAndJoin(room.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition"
                          >
                            Masuk
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tombol Aksi Bawah */}
          <div className="mt-6 space-y-2.5">
            {targetRoomId ? (
              <button
                type="button"
                onClick={() => handleValidateAndJoin(targetRoomId)}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
              >
                <span>Masuk ke Room Undangan Ini</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleValidateAndJoin('global-public-room')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
                >
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>Masuk Ruang Publik</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreateFlow}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
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