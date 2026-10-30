import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { 
  signInAnonymously, 
  isSignInWithEmailLink, 
  signInWithEmailLink, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Lobby, { AVATAR_PRESETS } from './components/Lobby';
import VirtualRoom from './components/VirtualRoom';
import AuthModal from './components/AuthModal';
import Toast from './components/Toast';

export default function App() {
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
  };
  // Status Pengguna & Navigasi Ruangan
  const [user, setUser] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [targetRoomId, setTargetRoomId] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Status Profil Pengguna
  const [playerName, setPlayerName] = useState('');
  const [playerStatus, setPlayerStatus] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);

  // Status Perangkat Media (Kamera & Mikrofon)
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [camError, setCamError] = useState(null);

  // 1. Verifikasi Validitas Parameter URL (?room=...) & Login Link Email
  useEffect(() => {
    const checkInitialRoom = async () => {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');

      if (roomParam) {
        if (roomParam === 'global-public-room') {
          setTargetRoomId(roomParam);
          return;
        }

        try {
          const roomRef = doc(db, 'rooms', roomParam);
          const roomSnap = await getDoc(roomRef);

          if (!roomSnap.exists()) {
            alert('Ruangan tidak ditemukan atau telah dihapus oleh pemilik.');
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            setTargetRoomId(null);
          } else {
            setTargetRoomId(roomParam);
          }
        } catch (err) {
          console.error('Gagal memverifikasi ruangan awal:', err);
        }
      }
    };

    checkInitialRoom();

    // Memeriksa apakah user membuka link verifikasi email
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Konfirmasi email Anda untuk melanjutkan pendaftaran:');
      }

      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then((res) => {
            window.localStorage.removeItem('emailForSignIn');
            setUser(res.user);
            const params = new URLSearchParams(window.location.search);
            const roomParam = params.get('room');
            const cleanUrl = window.location.pathname + (roomParam ? `?room=${roomParam}` : '');
            window.history.replaceState({}, document.title, cleanUrl);
          })
          .catch((err) => console.error('Error email sign in link:', err));
      }
      return;
    }

    // Listener Autentikasi Firebase (Otomatis Anonymous untuk Tamu)
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
          const res = await signInAnonymously(auth);
          setUser(res.user);
        } catch (e) {
          console.error('Gagal login anonim:', e);
        }
      }
    });

    return () => unsub();
  }, []);

  // 2. Inisialisasi Akses Mikrofon & Kamera Perangkat
  useEffect(() => {
    let activeStream = null;
    const initLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        activeStream = stream;
        stream.getAudioTracks().forEach((t) => { t.enabled = micOn; });
        stream.getVideoTracks().forEach((t) => { t.enabled = camOn; });
        setMediaStream(stream);
      } catch (err) {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          activeStream = audioOnly;
          audioOnly.getAudioTracks().forEach((t) => { t.enabled = micOn; });
          setMediaStream(audioOnly);
        } catch (e) {
          setCamError('Izin mikrofon/kamera belum diberikan.');
        }
      }
    };

    initLocalMedia();
    return () => {
      if (activeStream) activeStream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!mediaStream) return;
    mediaStream.getAudioTracks().forEach((t) => { t.enabled = micOn; });
    mediaStream.getVideoTracks().forEach((t) => { t.enabled = camOn; });
  }, [micOn, camOn, mediaStream]);

  const toggleCamera = async () => {
    if (!mediaStream) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getAudioTracks().forEach((t) => { t.enabled = micOn; });
        setMediaStream(stream);
        setCamOn(true);
      } catch (err) {
        setCamError('Tidak dapat mengakses kamera.');
      }
      return;
    }

    const videoTracks = mediaStream.getVideoTracks();
    if (videoTracks.length === 0) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = newStream.getVideoTracks()[0];
        mediaStream.addTrack(newTrack);
        setCamOn(true);
      } catch (e) {
        setCamError('Gagal menyalakan kamera.');
      }
    } else {
      videoTracks.forEach((t) => { t.enabled = !camOn; });
      setCamOn(!camOn);
    }
  };

  // 3. Handler Pembuatan Ruang Privat (Khusus Akun Terdaftar)
  const handleCreatePrivateRoom = async () => {
    if (!user || user.isAnonymous) {
      setIsAuthOpen(true);
      return;
    }

    const newRoomId = 'room-' + Math.random().toString(36).substring(2, 9);
    try {
      await setDoc(doc(db, 'rooms', newRoomId), {
        ownerId: user.uid,
        ownerEmail: user.email,
        title: `Ruang Privat ${playerName}`,
        createdAt: Date.now()
      });

      // Update URL browser agar link bisa langsung disalin
      const roomUrl = `${window.location.origin}${window.location.pathname}?room=${newRoomId}`;
      window.history.replaceState({}, document.title, `?room=${newRoomId}`);
      setCurrentRoomId(newRoomId);
    } catch (e) {
      alert('Gagal membuat room: ' + e.message);
    }
  };

  // 4. Handler Masuk Ruangan dengan Validasi Keberadaan Room di Database
  const handleJoinRoom = async (roomId) => {
    if (!roomId) return;


    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);

    if (roomId === 'global-public-room') {
      if (!roomSnap.exists()) {
        await setDoc(roomRef, {
          title: 'Ruang Publik Bersama',
          isPublic: true,
          createdAt: Date.now()
        });
      }
      if (!playerName.trim());
      setCurrentRoomId(roomId);
      return;
    }

      if (!roomSnap.exists()) {
        alert('Gagal masuk: Ruangan ini tidak valid atau telah dihapus.');
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        setTargetRoomId(null);
        setCurrentRoomId(null);
        return;
      }

      if (!playerName.trim());
      setCurrentRoomId(roomId);
    } catch (err) {
      alert('Terjadi kesalahan saat memeriksa ruangan: ' + err.message);
    }
  };

  // 5. Handler Keluar Ruangan (Reset State & URL)
  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    setTargetRoomId(null);
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  };

  return (
    <>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {!currentRoomId ? (
        <Lobby
          user={user}
          playerName={playerName}
          setPlayerName={setPlayerName}
          playerStatus={playerStatus}
          setPlayerStatus={setPlayerStatus}
          selectedAvatar={selectedAvatar}
          setSelectedAvatar={setSelectedAvatar}
          micOn={micOn}
          setMicOn={setMicOn}
          camOn={camOn}
          toggleCamera={toggleCamera}
          mediaStream={mediaStream}
          camError={camError}
          targetRoomId={targetRoomId}
          onJoinRoom={handleJoinRoom}
          onCreatePrivateRoom={handleCreatePrivateRoom}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      ) : (
        <VirtualRoom
          roomId={currentRoomId}
          user={user}
          playerName={playerName}
          playerStatus={playerStatus}
          selectedAvatar={selectedAvatar}
          micOn={micOn}
          setMicOn={setMicOn}
          camOn={camOn}
          toggleCamera={toggleCamera}
          mediaStream={mediaStream}
          onLeave={handleLeaveRoom}
        />
      )}
    </>
  );
}