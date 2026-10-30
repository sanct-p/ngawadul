import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, ScreenShare, StopCircle, 
  MessageSquare, Users, Maximize2, Minimize2, PhoneOff, 
  Send, Globe, ExternalLink
} from 'lucide-react';
import { collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Helper agar video di-render dengan object-fit: contain (tidak gepeng & rasio terjaga)
function drawVideoAspectFit(ctx, video, x, y, width, height) {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
  const videoRatio = video.videoWidth / video.videoHeight;
  const targetRatio = width / height;
  let renderWidth = width;
  let renderHeight = height;
  let offsetX = x;
  let offsetY = y;

  if (videoRatio > targetRatio) {
    renderHeight = width / videoRatio;
    offsetY = y + (height - renderHeight) / 2;
  } else {
    renderWidth = height * videoRatio;
    offsetX = x + (width - renderWidth) / 2;
  }
  ctx.drawImage(video, offsetX, offsetY, renderWidth, renderHeight);
}

// Helper agar thumbnail video di-render dengan object-fit: cover (penuh tanpa distorsi)
function drawVideoAspectFill(ctx, video, x, y, width, height) {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
  const videoRatio = video.videoWidth / video.videoHeight;
  const targetRatio = width / height;
  let sx = 0, sy = 0, sWidth = video.videoWidth, sHeight = video.videoHeight;

  if (videoRatio > targetRatio) {
    sWidth = video.videoHeight * targetRatio;
    sx = (video.videoWidth - sWidth) / 2;
  } else {
    sHeight = video.videoWidth / targetRatio;
    sy = (video.videoHeight - sHeight) / 2;
  }
  ctx.drawImage(video, sx, sy, sWidth, sHeight, x, y, width, height);
}

// Komponen Remote Video yang Stabil (Menghindari unmount dan blank screen)
function RemoteParticipantVideo({ id, stream, isCamOn, avatar, name }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-slate-900 overflow-hidden">
      <audio autoPlay ref={(el) => { if (el && stream && el.srcObject !== stream) el.srcObject = stream; }} />
      <video
        ref={videoRef}
        id={id}
        autoPlay
        playsInline
        muted
        style={{ opacity: isCamOn ? 1 : 0 }}
        className="w-full h-full object-cover transition-opacity duration-200"
      />
      {!isCamOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 pointer-events-none">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg text-lg"
            style={{ backgroundColor: avatar?.body || '#10b981' }}
          >
            {(name || 'U').slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetFullScreenModal({
  isOpen,
  onClose,
  roomId,
  roomTitle,
  user,
  playerName,
  selectedAvatar,
  micOn,
  setMicOn,
  camOn,
  toggleCamera,
  mediaStream,
  connectedPeers = [],
  remoteStreams = {},
  peerConnectionsRef
}) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const [activeSidePanel, setActiveSidePanel] = useState(null);

  // Status Share Screen
  const [activePresenterId, setActivePresenterId] = useState(null);
  const [activePresenterName, setActivePresenterName] = useState('');

  // Status PiP
  const [isPipActive, setIsPipActive] = useState(false);

  // Chat States
  const [chatScope, setChatScope] = useState('room'); 
  const [roomChatMessages, setRoomChatMessages] = useState([]);
  const [privateChatMessages, setPrivateChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');

  // Video Refs
  const localVideoRef = useRef(null);
  const localScreenVideoRef = useRef(null);
  const remoteScreenVideoRef = useRef(null);
  const screenTrackRef = useRef(null);

  // Canvas & Video Virtual untuk Multi-Video PiP
  const pipCanvasRef = useRef(null);
  const pipVideoRef = useRef(null);
  const pipAnimFrameRef = useRef(null);

  // Identifikasi Presenter
  const isMePresenting = activePresenterId === user?.uid;
  const isSomeonePresenting = Boolean(activePresenterId);
  const totalParticipants = 1 + connectedPeers.length;

  // 1. Pantau Status Presenter di Firestore
  useEffect(() => {
    if (!isOpen || !roomId || !db) return;
    const roomRef = doc(db, 'rooms', roomId);
    const unsub = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setActivePresenterId(data.sharingScreenBy || null);
        setActivePresenterName(data.sharingScreenByName || '');
      }
    });
    return () => unsub();
  }, [isOpen, roomId]);

  // 2. Sinkronisasi Video Kamera Lokal
    useEffect(() => {
        if (localVideoRef.current && mediaStream && isOpen) {
            if (localVideoRef.current.srcObject !== mediaStream) {
            localVideoRef.current.srcObject = mediaStream;
            }
            localVideoRef.current.play().catch(() => {});
        }
    }, [mediaStream, camOn, isOpen]);

  // 3. Sinkronisasi Layar Presentasi Lokal
  useEffect(() => {
    if (localScreenVideoRef.current && localScreenStream) {
      if (localScreenVideoRef.current.srcObject !== localScreenStream) {
        localScreenVideoRef.current.srcObject = localScreenStream;
      }
    }
  }, [localScreenStream, activePresenterId]);

  // 4. Sinkronisasi Layar Presentasi Teman
  useEffect(() => {
    if (activePresenterId && activePresenterId !== user?.uid) {
      const presenterStream = remoteStreams[activePresenterId];
      if (remoteScreenVideoRef.current && presenterStream) {
        if (remoteScreenVideoRef.current.srcObject !== presenterStream) {
          remoteScreenVideoRef.current.srcObject = presenterStream;
        }
      }
    }
  }, [activePresenterId, remoteStreams, user?.uid]);

  // 5. Sinkronisasi Chat
  useEffect(() => {
    if (!isOpen || !roomId || !db) return;
    const chatCol = collection(db, 'rooms', roomId, 'meet_room_chats');
    const unsub = onSnapshot(chatCol, (snap) => {
      const msgs = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setRoomChatMessages(msgs);
    });
    return () => unsub();
  }, [isOpen, roomId]);

  useEffect(() => {
    if (!isOpen || !roomId || !db || !user) return;
    const dmCol = collection(db, 'rooms', roomId, 'meet_private_chats');
    const unsub = onSnapshot(dmCol, (snap) => {
      const msgs = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.senderId === user.uid || data.receiverId === user.uid) {
          msgs.push({ id: d.id, ...data });
        }
      });
      msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setPrivateChatMessages(msgs);
    });
    return () => unsub();
  }, [isOpen, roomId, user]);

  // 6. Loop Rendering Canvas Bebas Kedip (30 FPS Throttle) & Aspek Rasio Akurat
  // Tambahkan 3 ref pembantu ini di dekat deklarasi ref lainnya:
    const connectedPeersRef = useRef(connectedPeers);
    const isSomeonePresentingRef = useRef(isSomeonePresenting);
    const isMePresentingRef = useRef(isMePresenting);
    const camOnRef = useRef(camOn);

    useEffect(() => {
    connectedPeersRef.current = connectedPeers;
    isSomeonePresentingRef.current = isSomeonePresenting;
    isMePresentingRef.current = isMePresenting;
    camOnRef.current = camOn;
    }, [connectedPeers, isSomeonePresenting, isMePresenting, camOn]);

  // Ganti seluruh useEffect poin 6 menjadi seperti ini:
useEffect(() => {
  if (!isPipActive) {
    if (pipAnimFrameRef.current) cancelAnimationFrame(pipAnimFrameRef.current);
    return;
  }

  const canvas = pipCanvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false }); // alpha: false mencegah flickering buffer
  canvas.width = 1280;
  canvas.height = 720;

  let lastDrawTime = 0;
  const fpsInterval = 1000 / 30;

  const renderPipFrame = (currentTime) => {
    pipAnimFrameRef.current = requestAnimationFrame(renderPipFrame);

    const elapsed = currentTime - lastDrawTime;
    if (elapsed < fpsInterval) return;
    lastDrawTime = currentTime - (elapsed % fpsInterval);

    const presenting = isSomeonePresentingRef.current;
    const mePresenting = isMePresentingRef.current;
    const peers = connectedPeersRef.current;
    const myCam = camOnRef.current;

    // Background dasar canvas
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 1280, 720);

    if (presenting) {
      const screenEl = mePresenting ? localScreenVideoRef.current : remoteScreenVideoRef.current;
      
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, 960, 720);

      if (screenEl && screenEl.readyState >= 2) {
        drawVideoAspectFit(ctx, screenEl, 0, 0, 960, 720);
      }

      const sideParticipants = [
        { el: localVideoRef.current, name: `${playerName} (Kamu)`, isCam: myCam },
        ...peers.map((p) => ({
          el: document.getElementById(`peer-video-${p.id}`),
          name: p.name,
          isCam: p.camOn
        }))
      ];

      const thumbHeight = Math.min(180, Math.floor(720 / Math.max(1, sideParticipants.length)));
      sideParticipants.forEach((p, idx) => {
        const y = idx * thumbHeight;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(962, y + 2, 316, thumbHeight - 4);

        if (p.isCam && p.el && p.el.readyState >= 2) {
          drawVideoAspectFill(ctx, p.el, 962, y + 2, 316, thumbHeight - 4);
        } else {
          ctx.fillStyle = '#334155';
          ctx.fillRect(962, y + 2, 316, thumbHeight - 4);
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 15px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(p.name, 962 + 158, y + thumbHeight / 2);
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(966, y + thumbHeight - 24, 180, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(p.name, 972, y + thumbHeight - 11);
      });

    } else {
      const allParticipants = [
        { el: localVideoRef.current, name: `${playerName} (Kamu)`, isCam: myCam },
        ...peers.map((p) => ({
          el: document.getElementById(`peer-video-${p.id}`),
          name: p.name,
          isCam: p.camOn
        }))
      ];

      const count = allParticipants.length;
      const cols = count === 1 ? 1 : count <= 4 ? 2 : 3;
      const rows = Math.ceil(count / cols);
      const cellW = 1280 / cols;
      const cellH = 720 / rows;

      allParticipants.forEach((p, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = col * cellW;
        const y = row * cellH;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + 4, y + 4, cellW - 8, cellH - 8);

        if (p.isCam && p.el && p.el.readyState >= 2) {
          drawVideoAspectFill(ctx, p.el, x + 4, y + 4, cellW - 8, cellH - 8);
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 4, y + 4, cellW - 8, cellH - 8);
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 20px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(p.name, x + cellW / 2, y + cellH / 2);
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x + 12, y + cellH - 32, 160, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(p.name, x + 18, y + cellH - 17);
      });
    }
  };

  pipAnimFrameRef.current = requestAnimationFrame(renderPipFrame);

  return () => {
    if (pipAnimFrameRef.current) cancelAnimationFrame(pipAnimFrameRef.current);
  };
}, [isPipActive, playerName]); // HANYA bergantung pada isPipActive dan playerName

  // 7. Handler Buka / Tutup Mode PiP Windows Eksklusif Lewat Tombol
  const handleTogglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
        return;
      }

      if (!document.pictureInPictureEnabled) {
        alert("Browser Anda belum mendukung fitur Picture-in-Picture.");
        return;
      }

      const canvas = pipCanvasRef.current;
      const pipVideo = pipVideoRef.current;
      if (!canvas || !pipVideo) return;

      setIsPipActive(true);

      // Tangkap stream dari offscreen canvas
      const stream = canvas.captureStream(30);
      pipVideo.srcObject = stream;
      await pipVideo.play();

      await pipVideo.requestPictureInPicture();

      pipVideo.onleavepictureinpicture = () => {
        setIsPipActive(false);
      };
    } catch (err) {
      console.warn("Gagal membuka PiP Windows:", err);
      setIsPipActive(false);
    }
  };

  const toggleFullScreenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
    }
  };

  const stopScreenSharing = async () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    setLocalScreenStream(null);

    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        sharingScreenBy: null,
        sharingScreenByName: null
      });
    } catch (e) {}

    if (mediaStream) {
      const webcamTrack = mediaStream.getVideoTracks()[0];
      if (webcamTrack && peerConnectionsRef?.current) {
        Object.values(peerConnectionsRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(webcamTrack);
        });
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isMePresenting) {
      await stopScreenSharing();
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });

        const displayTrack = displayStream.getVideoTracks()[0];
        screenTrackRef.current = displayTrack;
        setLocalScreenStream(displayStream);

        await updateDoc(doc(db, 'rooms', roomId), {
          sharingScreenBy: user.uid,
          sharingScreenByName: playerName
        });

        if (peerConnectionsRef?.current) {
          Object.values(peerConnectionsRef.current).forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
            if (sender) sender.replaceTrack(displayTrack);
          });
        }

        displayTrack.onended = () => {
          stopScreenSharing();
        };
      } catch (err) {
        console.error("Gagal share screen:", err);
      }
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatText.trim() || !user) return;
    const text = chatText.trim();
    setChatText('');

    try {
      if (chatScope === 'room') {
        await addDoc(collection(db, 'rooms', roomId, 'meet_room_chats'), {
          senderId: user.uid,
          senderName: playerName,
          text,
          timestamp: Date.now(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        const targetPeer = connectedPeers.find((p) => p.id === chatScope);
        await addDoc(collection(db, 'rooms', roomId, 'meet_private_chats'), {
          senderId: user.uid,
          senderName: playerName,
          receiverId: chatScope,
          receiverName: targetPeer ? targetPeer.name : 'User',
          text,
          timestamp: Date.now(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    } catch (err) {
      console.error("Gagal mengirim pesan:", err);
    }
  };

  if (!isOpen) return null;

  const activePrivateList = privateChatMessages.filter(
    (m) =>
      (m.senderId === user.uid && m.receiverId === chatScope) ||
      (m.senderId === chatScope && m.receiverId === user.uid)
  );

  const getDynamicGridClass = () => {
    if (totalParticipants === 1) return 'grid-cols-1 max-w-3xl';
    if (totalParticipants === 2) return 'grid-cols-1 md:grid-cols-2 max-w-5xl';
    if (totalParticipants <= 4) return 'grid-cols-2 max-w-5xl';
    if (totalParticipants <= 6) return 'grid-cols-2 md:grid-cols-3 max-w-6xl';
    return 'grid-cols-2 md:grid-cols-4 max-w-7xl';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none animate-fadeIn">
      {/* CANVAS & VIDEO OFFSCREEN UNTUK MULTI-VIDEO PIP */}
      <canvas ref={pipCanvasRef} className="hidden" />
      <video ref={pipVideoRef} muted playsInline className="hidden" />

      {/* 1. HEADER */}
      <header className="h-16 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-600/20">
            M
          </div>
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <span>{roomTitle || 'Meet Call'}</span>
              <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full">
                ● Live Video
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">Room: {roomId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'people' ? null : 'people')}
            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${
              activeSidePanel === 'people'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-xs">{totalParticipants}</span>
          </button>

          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'chat' ? null : 'chat')}
            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${
              activeSidePanel === 'chat'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Pesan</span>
          </button>

          <button
            onClick={toggleFullScreenMode}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition"
            title="Layar Penuh"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN VIEWPORT */}
      <div className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto relative">
          
          {/* TAMPILAN JIKA ADA YANG SHARE SCREEN */}
          {isSomeonePresenting ? (
            <div className="w-full h-full flex flex-col lg:flex-row gap-4 items-center justify-between">
              
              {/* LAYAR UTAMA PRESENTASI (ASPEK RASIO TERJAGA DENGAN OBJECT-CONTAIN) */}
              <div className="flex-1 w-full h-full max-h-[calc(100vh-170px)] bg-slate-900 border-2 border-indigo-500/50 rounded-3xl overflow-hidden relative shadow-2xl flex items-center justify-center">
                {isMePresenting ? (
                  <video
                    ref={localScreenVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    ref={remoteScreenVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                )}

                <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs shadow-lg">
                  <ScreenShare className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="font-semibold text-white">
                    {isMePresenting ? 'Anda sedang membagikan layar' : `Presentasi dari: ${activePresenterName || 'Partisipan'}`}
                  </span>
                </div>
              </div>

              {/* SIDEBAR DAFTAR PESERTA (PIP SAMPING) */}
              <div className="w-full lg:w-72 h-36 lg:h-full flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto shrink-0 p-1">
                {/* Video Sendiri */}
                <div className="w-48 lg:w-full aspect-video rounded-2xl bg-slate-900 border border-indigo-500/50 relative overflow-hidden shrink-0 shadow-lg flex items-center justify-center">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ opacity: camOn ? 1 : 0 }}
                    className="w-full h-full object-cover scale-x-[-1] transition-opacity duration-200"
                  />
                  {!camOn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 pointer-events-none">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: selectedAvatar.body }}
                      >
                        {playerName.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between bg-slate-950/80 px-2 py-0.5 rounded text-[10px]">
                    <span className="truncate">{playerName} (Kamu)</span>
                    {micOn ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-rose-400" />}
                  </div>
                </div>

                {/* Video Peserta Lain */}
                {connectedPeers.map((peer) => {
                  const isPeerPresenting = activePresenterId === peer.id;
                  return (
                    <div
                      key={peer.id}
                      className="w-48 lg:w-full aspect-video rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden shrink-0 shadow-lg flex items-center justify-center"
                    >
                      <RemoteParticipantVideo
                        id={`peer-video-${peer.id}`}
                        stream={remoteStreams[peer.id]}
                        isCamOn={!isPeerPresenting && peer.camOn}
                        avatar={peer.avatar}
                        name={peer.name}
                      />

                      <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between bg-slate-950/80 px-2 py-0.5 rounded text-[10px]">
                        <span className="truncate">{peer.name} {isPeerPresenting && '(Presenter)'}</span>
                        {peer.micOn ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-rose-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ) : (
            /* TAMPILAN NORMAL DYNAMIC GRID */
            <div className={`w-full grid gap-4 justify-center items-center ${getDynamicGridClass()}`}>
              {/* Kartu Video Diri Sendiri */}
              <div className="aspect-video w-full rounded-3xl bg-slate-900 border-2 border-indigo-500/50 shadow-2xl relative overflow-hidden flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ opacity: camOn ? 1 : 0 }}
                  className="w-full h-full object-cover scale-x-[-1] transition-opacity duration-200"
                />
                {!camOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 pointer-events-none">
                    <div
                      className="w-16 h-16 rounded-3xl flex items-center justify-center text-white font-bold text-xl shadow-xl mb-2"
                      style={{ backgroundColor: selectedAvatar.body }}
                    >
                      {playerName.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-xs text-slate-400">Kamera Nonaktif</p>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                  <span className="font-semibold text-white truncate">{playerName} (Kamu)</span>
                  <div className="flex items-center gap-1.5">
                    {micOn ? (
                      <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400"><Mic className="w-3.5 h-3.5" /></span>
                    ) : (
                      <span className="p-1 rounded-full bg-rose-500/20 text-rose-400"><MicOff className="w-3.5 h-3.5" /></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Kartu Video Teman Lain */}
              {connectedPeers.map((peer) => (
                <div
                  key={peer.id}
                  className="aspect-video w-full rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden flex items-center justify-center"
                >
                  <RemoteParticipantVideo
                    id={`peer-video-${peer.id}`}
                    stream={remoteStreams[peer.id]}
                    isCamOn={peer.camOn}
                    avatar={peer.avatar}
                    name={peer.name}
                  />

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                    <span className="font-semibold text-white truncate">{peer.name}</span>
                    <div className="flex items-center gap-1.5">
                      {peer.micOn ? (
                        <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400"><Mic className="w-3.5 h-3.5" /></span>
                      ) : (
                        <span className="p-1 rounded-full bg-rose-500/20 text-rose-400"><MicOff className="w-3.5 h-3.5" /></span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. SIDEBAR CHAT & PARTICIPANTS */}
        {activeSidePanel && (
          <aside className="w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-20 animate-fadeIn">
            {activeSidePanel === 'chat' ? (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-white">Obrolan Meet</h3>
                    <button onClick={() => setActiveSidePanel(null)} className="text-slate-400 hover:text-white text-xs">
                      Tutup
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setChatScope('room')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        chatScope === 'room' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Ruangan</span>
                    </button>

                    <select
                      value={chatScope === 'room' ? '' : chatScope}
                      onChange={(e) => {
                        if (e.target.value) setChatScope(e.target.value);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-transparent outline-none transition cursor-pointer ${
                        chatScope !== 'room' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      <option value="" disabled className="bg-slate-900 text-slate-300">
                        {chatScope !== 'room' ? '💬 DM Privat' : 'Pilih DM Privat...'}
                      </option>
                      {connectedPeers.map((p) => (
                        <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                          DM: {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {chatScope !== 'room' && (
                    <div className="mt-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg flex items-center justify-between">
                      <span className="truncate">
                        🔒 Chat privat dengan: <b>{connectedPeers.find((p) => p.id === chatScope)?.name || 'User'}</b>
                      </span>
                      <button onClick={() => setChatScope('room')} className="underline ml-1">
                        Kembali
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {chatScope === 'room' ? (
                    roomChatMessages.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">Belum ada obrolan di ruangan ini.</p>
                    ) : (
                      roomChatMessages.map((m) => (
                        <div key={m.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{m.senderName}</span>
                            <span className="text-[10px] text-slate-400">{m.time}</span>
                          </div>
                          <p className="text-slate-200 leading-relaxed">{m.text}</p>
                        </div>
                      ))
                    )
                  ) : activePrivateList.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">Belum ada obrolan privat dengan pengguna ini.</p>
                  ) : (
                    activePrivateList.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-2xl text-xs space-y-1 border ${
                          m.senderId === user.uid
                            ? 'bg-indigo-600/20 border-indigo-500/30 ml-4'
                            : 'bg-slate-950 border-slate-800 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{m.senderId === user.uid ? 'Kamu' : m.senderName}</span>
                          <span className="text-[10px] text-slate-400">{m.time}</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed">{m.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder={chatScope === 'room' ? 'Pesan ke semua...' : 'Kirim pesan privat...'}
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  />
                  <button type="submit" className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col h-full p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <h3 className="font-bold text-sm text-white">Partisipan ({totalParticipants})</h3>
                  <button onClick={() => setActiveSidePanel(null)} className="text-slate-400 hover:text-white text-xs">
                    Tutup
                  </button>
                </div>

                <div className="space-y-2 overflow-y-auto flex-1">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white"
                        style={{ backgroundColor: selectedAvatar.body }}
                      >
                        {playerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{playerName} (Kamu)</p>
                        <p className="text-[10px] text-emerald-400">Aktif di Call</p>
                      </div>
                    </div>
                    {micOn ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                  </div>

                  {connectedPeers.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white"
                          style={{ backgroundColor: p.avatar?.body || '#10b981' }}
                        >
                          {(p.name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.status || 'Partisipan'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setChatScope(p.id);
                            setActiveSidePanel('chat');
                          }}
                          className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        {p.micOn ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 4. FOOTER CONTROLS */}
      <footer className="h-20 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="hidden sm:block text-xs text-slate-400">
          GatherVerse Google Meet Mode
        </div>

        <div className="flex items-center gap-3 mx-auto sm:mx-0">
          <button
            onClick={() => setMicOn((p) => !p)}
            className={`p-3.5 rounded-2xl transition shadow-lg ${
              micOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-500 hover:bg-rose-600 text-white'
            }`}
            title={micOn ? 'Mute Mic' : 'Nyalakan Mic'}
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleCamera}
            className={`p-3.5 rounded-2xl transition shadow-lg ${
              camOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-500 hover:bg-rose-600 text-white'
            }`}
            title={camOn ? 'Matikan Kamera' : 'Nyalakan Kamera'}
          >
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl transition shadow-lg ${
              isMePresenting
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={isMePresenting ? 'Hentikan Share Screen' : 'Bagikan Layar'}
          >
            {isMePresenting ? <StopCircle className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
          </button>

          {/* TOMBOL BUKA/TUTUP PIP WINDOWS */}
          <button
            onClick={handleTogglePiP}
            className={`p-3.5 rounded-2xl flex items-center gap-2 transition shadow-lg ${
              isPipActive 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title="Buka jendela melayang di Windows (Always on Top)"
          >
            <ExternalLink className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-semibold">
              {isPipActive ? 'Tutup PiP' : 'Buka PiP Windows'}
            </span>
          </button>

          <button
            onClick={onClose}
            className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-xl flex items-center gap-2 px-5 font-semibold text-xs transition"
            title="Tinggalkan Mode Meet"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">Tinggalkan Meet</span>
          </button>
        </div>

        <div className="hidden sm:block text-xs text-slate-500">
          Tekan 'Tinggalkan Meet' untuk kembali ke Peta
        </div>
      </footer>
    </div>
  );
}