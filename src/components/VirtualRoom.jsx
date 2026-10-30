import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { 
  collection, doc, setDoc, onSnapshot, deleteDoc, addDoc 
} from 'firebase/firestore';
import { 
  Maximize2, Mic, MicOff, Video, VideoOff, MessageSquare, Users, 
  HelpCircle, Coffee, FileText, PenTool, LogOut, 
  Volume2, MapPin, Send, Trash2, ChevronUp, 
  ChevronDown, ChevronLeft, ChevronRight, Radio, X, Share2, Check
} from 'lucide-react';
import MeetFullScreenModal from './MeetFullScreenModal';

const TILE_SIZE = 48;
const MAP_COLS = 24;
const MAP_ROWS = 16;
const PROXIMITY_RADIUS = 155;

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const OFFICE_MAP = [
  [1, 1, 10,10,1, 1, 1, 1, 1, 1, 10,10,10,1, 1, 1, 1, 1, 10,10,1, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 7,  7,  0, 0, 0, 1, 3, 3, 3,  3, 3, 8, 6, 1],
  [1, 2, 6, 2, 2, 6, 2, 1, 0, 0, 0,  0,  0, 0, 0, 1, 3, 5, 5,  5, 3, 3, 3, 1],
  [1, 2, 2, 4, 4, 2, 2, 1, 0, 0, 0,  9,  0, 0, 0, 1, 3, 5, 4,  5, 3, 3, 3, 1],
  [1, 2, 2, 4, 4, 2, 2, 1, 0, 0, 0,  0,  0, 0, 0, 0, 3, 3, 3,  3, 3, 3, 6, 1],
  [1, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0,  0,  0, 0, 0, 0, 3, 3, 3,  3, 3, 3, 3, 1],
  [1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0,  0,  0, 0, 0, 1, 1, 1, 0,  0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0,  0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6,  0,  0, 6, 0, 0, 0, 0, 0,  0, 0, 0, 0, 1],
  [1, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0,  0,  0, 0, 0, 0, 4, 4, 0,  0, 4, 4, 0, 1],
  [1, 0, 5, 0, 0, 4, 0, 0, 0, 0, 0,  0,  0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 1],
  [1, 0, 5, 0, 0, 4, 0, 0, 0, 0, 0,  0,  0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 1],
  [1, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0,  0,  0, 0, 0, 0, 4, 4, 0,  0, 4, 4, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0,  0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 1],
  [1, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0,  0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 6, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10, 10, 10,10,1, 1, 1, 1, 1,  1, 1, 1, 1, 1],
];

const COLLISION_TILES = new Set([1, 4, 6, 7, 8, 9, 10]);
const EMOTES = ['👋', '❤️', '🎉', '💡', '🔥', '😂', '👍', '☕'];

function RemoteVideoBubble({ peer, stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="w-36 sm:w-44 h-24 sm:h-28 rounded-2xl bg-slate-900/95 border-2 border-emerald-500 shadow-xl overflow-hidden relative shrink-0 flex flex-col items-center justify-center animate-fadeIn">
      <div className="absolute top-1.5 left-2 z-10 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
        <Volume2 className="w-2.5 h-2.5 animate-pulse" />
        <span>{peer.connectionType}</span>
      </div>

      {peer.camOn && stream && stream.getVideoTracks().some((t) => t.enabled) ? (
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center mt-2">
          {stream && <audio autoPlay ref={(el) => { if (el) el.srcObject = stream; }} />}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg relative"
            style={{ backgroundColor: peer.avatar?.body || '#10b981' }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-around px-1"
              style={{ backgroundColor: peer.avatar?.skin || '#fde68a' }}
            >
              <span className="w-1 h-1 bg-slate-900 rounded-full" />
              <span className="w-1 h-1 bg-slate-900 rounded-full" />
            </div>
            {peer.micOn && (
              <span className="absolute -inset-1 rounded-2xl border-2 border-emerald-400/60 animate-ping pointer-events-none" />
            )}
          </div>
          <span className="text-[10px] text-emerald-300 mt-1 font-medium">
            {peer.status || 'Terhubung'}
          </span>
        </div>
      )}

      <div className="absolute bottom-1.5 left-2 right-2 z-10 flex items-center justify-between bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px]">
        <span className="font-semibold truncate text-white">{peer.name}</span>
        {peer.micOn ? <Mic className="w-3 h-3 text-emerald-400 shrink-0" /> : <MicOff className="w-3 h-3 text-rose-400 shrink-0" />}
      </div>
    </div>
  );
}

function getZoneName(x, y) {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  if (row >= 1 && row <= 5 && col >= 1 && col <= 6) return 'Ruang Rapat A (Privat)';
  if (row >= 1 && row <= 5 && col >= 16 && col <= 22) return 'Coffee Lounge & Santai';
  if (row >= 1 && row <= 5 && col >= 8 && col <= 14) return 'Area Kolaborasi & Papan Tulis';
  if (row >= 9 && row <= 13 && col >= 15 && col <= 22) return 'Area Fokus Kerja (Desk Pods)';
  return 'Lobi Utama';
}

function checkTileCollision(newX, newY) {
  const margin = 14;
  const points = [
    { x: newX - margin, y: newY - margin },
    { x: newX + margin, y: newY - margin },
    { x: newX - margin, y: newY + margin },
    { x: newX + margin, y: newY + margin },
  ];

  for (const pt of points) {
    const col = Math.floor(pt.x / TILE_SIZE);
    const row = Math.floor(pt.y / TILE_SIZE);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return true;
    if (COLLISION_TILES.has(OFFICE_MAP[row][col])) return true;
  }
  return false;
}

function getNearbyInteractiveObject(x, y) {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
        const tile = OFFICE_MAP[r][c];
        if (tile === 7) return { type: 'whiteboard', label: 'Buka Papan Tulis Bersama' };
        if (tile === 8) return { type: 'coffee', label: 'Ambil Kopi Virtual ☕' };
        if (tile === 9) return { type: 'docs', label: 'Buka Papan Catatan Tim' };
      }
    }
  }
  return null;
}

export default function VirtualRoom({
  roomId,
  roomTitle,
  user,
  playerName,
  playerStatus,
  selectedAvatar,
  micOn,
  setMicOn,
  camOn,
  toggleCamera,
  mediaStream,
  onLeave
}) {
  const [isMeetOpen, setIsMeetOpen] = useState(false);
  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const [remoteStreams, setRemoteStreams] = useState({});

  const [playerPos, setPlayerPos] = useState({ x: 11.5 * TILE_SIZE, y: 10.5 * TILE_SIZE, direction: 'down', isMoving: false });
  const playerPosRef = useRef({ x: 11.5 * TILE_SIZE, y: 10.5 * TILE_SIZE, direction: 'down', isMoving: false, emote: null });
  const jumpRef = useRef({
    isJumping: false,
    offsetY: 0,       // Tinggi lompatan (pixel)
    velocity: 0       // Kecepatan loncat
  });
  const [activeEmote, setActiveEmote] = useState(null);
  const [remotePlayers, setRemotePlayers] = useState({});
  const keysPressedRef = useRef({});
  const targetPointRef = useRef(null);

  const [activeModal, setActiveModal] = useState(null);
  const [showChat, setShowChat] = useState(true);
  const [showPeople, setShowPeople] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sharedNotes, setSharedNotes] = useState([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [whiteboardStrokes, setWhiteboardStrokes] = useState([]);
  const [coffeeToast, setCoffeeToast] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const mapCanvasRef = useRef(null);
  const whiteboardCanvasRef = useRef(null);
  const [wbColor, setWbColor] = useState('#38bdf8');
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef([]);

  // Sinkronisasi data dinamis berdasarkan roomId
  useEffect(() => {
    if (!user || !db || !roomId) return;

    // 1. Players
    const playersCol = collection(db, 'rooms', roomId, 'players');
    const unsubPlayers = onSnapshot(playersCol, (snap) => {
      const now = Date.now();
      const others = {};
      snap.forEach((d) => {
        const data = d.data();
        if (d.id !== user.uid && data && now - (data.updatedAt || 0) < 30000) {
          others[d.id] = { id: d.id, ...data };
        }
      });
      setRemotePlayers(others);
    });

    // 2. Chats
    const chatCol = collection(db, 'rooms', roomId, 'chats');
    const unsubChat = onSnapshot(chatCol, (snap) => {
      const msgs = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setChatMessages([
        { id: 'welcome', sender: 'Sistem', text: `Selamat datang di room: ${roomTitle}`, time: 'Sistem', isSystem: true },
        ...msgs.slice(-50)
      ]);
    });

    // 3. Notes
    const notesCol = collection(db, 'rooms', roomId, 'notes');
    const unsubNotes = onSnapshot(notesCol, (snap) => {
      const notesList = [];
      snap.forEach((d) => notesList.push({ id: d.id, ...d.data() }));
      notesList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setSharedNotes(notesList);
    });

    // 4. Whiteboard
    const wbCol = collection(db, 'rooms', roomId, 'whiteboard');
    const unsubWb = onSnapshot(wbCol, (snap) => {
      const strokes = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.pointsJson) {
          try {
            strokes.push({
              id: d.id,
              color: data.color || '#38bdf8',
              points: JSON.parse(data.pointsJson),
              timestamp: data.timestamp || 0
            });
          } catch (e) {}
        }
      });
      strokes.sort((a, b) => a.timestamp - b.timestamp);
      setWhiteboardStrokes(strokes);
    });

    return () => {
      unsubPlayers();
      unsubChat();
      unsubNotes();
      unsubWb();
    };
  }, [user, roomId]);

  // Update posisi pemain ke sub-koleksi room
  useEffect(() => {
    if (!user || !db || !roomId) return;

    const syncPos = async () => {
      try {
        const playerDoc = doc(db, 'rooms', roomId, 'players', user.uid);
        await setDoc(playerDoc, {
          name: playerName,
          status: playerStatus,
          avatar: selectedAvatar,
          x: Math.round(playerPosRef.current.x),
          y: Math.round(playerPosRef.current.y),
          direction: playerPosRef.current.direction,
          micOn,
          camOn,
          emote: activeEmote,
          updatedAt: Date.now()
        });
      } catch (e) {}
    };

    syncPos();
    const interval = setInterval(syncPos, 500);
    return () => clearInterval(interval);
  }, [user, roomId, playerName, playerStatus, selectedAvatar, micOn, camOn, activeEmote]);

  // Handle Video Stream Lokal
  useEffect(() => {
    if (localVideoRef.current && mediaStream) {
      localVideoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, camOn]);

  // Proximity Calculation
  const connectedPeers = useMemo(() => {
    const myX = playerPos.x;
    const myY = playerPos.y;
    const myCol = Math.floor(myX / TILE_SIZE);
    const myRow = Math.floor(myY / TILE_SIZE);
    const inMeetingRoom = OFFICE_MAP[myRow]?.[myCol] === 2;

    const connected = [];
    for (const peer of Object.values(remotePlayers)) {
      const eCol = Math.floor(peer.x / TILE_SIZE);
      const eRow = Math.floor(peer.y / TILE_SIZE);
      const peerInMeeting = OFFICE_MAP[eRow]?.[eCol] === 2;
      const dist = Math.hypot(peer.x - myX, peer.y - myY);

      if ((inMeetingRoom && peerInMeeting) || dist <= PROXIMITY_RADIUS) {
        connected.push({
          ...peer,
          distance: Math.round(dist),
          connectionType: inMeetingRoom && peerInMeeting ? 'Ruang Rapat Privat' : 'Proximity Call'
        });
      }
    }
    return connected;
  }, [playerPos.x, playerPos.y, remotePlayers]);

  // WebRTC Signals Handling (Per-Room)
  useEffect(() => {
    if (!user || !db || !roomId) return;

    const connectedMap = new Map();
    connectedPeers.forEach((p) => connectedMap.set(p.id, p));

    Object.keys(peerConnectionsRef.current).forEach((peerId) => {
      if (!connectedMap.has(peerId)) {
        peerConnectionsRef.current[peerId].close();
        delete peerConnectionsRef.current[peerId];
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    });

    connectedPeers.forEach((peer) => {
      const peerId = peer.id;
      if (peerConnectionsRef.current[peerId]) return;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionsRef.current[peerId] = pc;

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => pc.addTrack(track, mediaStream));
      }

      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          const sigCol = collection(db, 'rooms', roomId, 'signals');
          await addDoc(sigCol, {
            sender: user.uid,
            target: peerId,
            type: 'candidate',
            candidate: JSON.stringify(event.candidate),
            timestamp: Date.now()
          });
        }
      };

      if (user.uid < peerId) {
        pc.createOffer().then(async (offer) => {
          await pc.setLocalDescription(offer);
          const sigCol = collection(db, 'rooms', roomId, 'signals');
          await addDoc(sigCol, {
            sender: user.uid,
            target: peerId,
            type: 'offer',
            sdp: offer.sdp,
            timestamp: Date.now()
          });
        }).catch(console.error);
      }
    });
  }, [connectedPeers, user, db, roomId, mediaStream]);

  // Listen WebRTC signals di dalam room
  useEffect(() => {
    if (!user || !db || !roomId) return;

    const sigCol = collection(db, 'rooms', roomId, 'signals');
    const unsub = onSnapshot(sigCol, (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        if (data.target !== user.uid) return;

        const peerId = data.sender;
        let pc = peerConnectionsRef.current[peerId];

        if (data.type === 'offer') {
          if (!pc) {
            pc = new RTCPeerConnection(RTC_CONFIG);
            peerConnectionsRef.current[peerId] = pc;

            if (mediaStream) {
              mediaStream.getTracks().forEach((track) => pc.addTrack(track, mediaStream));
            }

            pc.ontrack = (event) => {
              const stream = event.streams[0] || new MediaStream([event.track]);
              setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
            };

            pc.onicecandidate = async (event) => {
              if (event.candidate) {
                await addDoc(sigCol, {
                  sender: user.uid,
                  target: peerId,
                  type: 'candidate',
                  candidate: JSON.stringify(event.candidate),
                  timestamp: Date.now()
                });
              }
            };
          }

          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await addDoc(sigCol, {
            sender: user.uid,
            target: peerId,
            type: 'answer',
            sdp: answer.sdp,
            timestamp: Date.now()
          });
        } else if (data.type === 'answer' && pc) {
          if (pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
          }
        } else if (data.type === 'candidate' && pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(data.candidate)));
          } catch (e) {}
        }

        try {
          await deleteDoc(change.doc.ref);
        } catch (e) {}
      });
    });

    return () => unsub();
  }, [user, db, roomId, mediaStream]);

  // Kontrol Keyboard Gerak
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      // --- FITUR LONCAT SPACE ---
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault(); // Mencegah halaman scroll ke bawah
      if (!jumpRef.current.isJumping) {
        jumpRef.current.isJumping = true;
        jumpRef.current.velocity = 8; // Daya loncat ke atas (semakin besar semakin tinggi)
      }
      return;
    }

      const key = e.key.toLowerCase();
      keysPressedRef.current[key] = true;
      targetPointRef.current = null;

      if (key === 'e' || key === 'x') {
        const nearby = getNearbyInteractiveObject(playerPosRef.current.x, playerPosRef.current.y);
        if (nearby) handleInteractObject(nearby.type);
      }
    };

    const handleKeyUp = (e) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Canvas Render Loop
  useEffect(() => {
    let animationFrameId;
    let walkFrame = 0;

    const updateAndDraw = () => {
      walkFrame += 0.15;
      const keys = keysPressedRef.current;
      let dx = 0;
      let dy = 0;
      let newDir = playerPosRef.current.direction;

      if (keys['w'] || keys['arrowup']) { dy -= 1; newDir = 'up'; }
      if (keys['s'] || keys['arrowdown']) { dy += 1; newDir = 'down'; }
      if (keys['a'] || keys['arrowleft']) { dx -= 1; newDir = 'left'; }
      if (keys['d'] || keys['arrowright']) { dx += 1; newDir = 'right'; }

      if (dx === 0 && dy === 0 && targetPointRef.current) {
        const tx = targetPointRef.current.x - playerPosRef.current.x;
        const ty = targetPointRef.current.y - playerPosRef.current.y;
        const dist = Math.hypot(tx, ty);
        if (dist > 6) {
          dx = tx / dist;
          dy = ty / dist;
          newDir = Math.abs(tx) > Math.abs(ty) ? (tx > 0 ? 'right' : 'left') : (ty > 0 ? 'down' : 'up');
        } else {
          targetPointRef.current = null;
        }
      }

      const speed = 3.4;
      let isMoving = false;
      
      // --- UPDATE FISIKA LOMPATAN ---
      if (jumpRef.current.isJumping) {
        jumpRef.current.offsetY += jumpRef.current.velocity;
        jumpRef.current.velocity -= 0.55; // Efek gravitasi bumi (menarik ke bawah)

        // Ketika mendarat kembali ke lantai
        if (jumpRef.current.offsetY <= 0) {
          jumpRef.current.offsetY = 0;
          jumpRef.current.velocity = 0;
          jumpRef.current.isJumping = false;
        }
      }

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        const moveX = (dx / len) * speed;
        const moveY = (dy / len) * speed;

        let nextX = playerPosRef.current.x;
        let nextY = playerPosRef.current.y;

        if (!checkTileCollision(nextX + moveX, nextY)) {
          nextX += moveX;
          isMoving = true;
        } else {
          targetPointRef.current = null;
        }

        if (!checkTileCollision(nextX, nextY + moveY)) {
          nextY += moveY;
          isMoving = true;
        } else {
          targetPointRef.current = null;
        }

        playerPosRef.current = { ...playerPosRef.current, x: nextX, y: nextY, direction: newDir, isMoving };
        setPlayerPos({ x: nextX, y: nextY, direction: newDir, isMoving });
      } else if (playerPosRef.current.isMoving) {
        playerPosRef.current.isMoving = false;
        setPlayerPos((prev) => ({ ...prev, isMoving: false }));
      }

      const canvas = mapCanvasRef.current;
      if (canvas) {
        renderOfficeCanvas(canvas.getContext('2d'), walkFrame);
      }

      animationFrameId = requestAnimationFrame(updateAndDraw);
    };

    animationFrameId = requestAnimationFrame(updateAndDraw);
    return () => cancelAnimationFrame(animationFrameId);
  }, [remotePlayers, selectedAvatar, playerName, micOn, activeEmote]);

  const renderOfficeCanvas = (ctx, walkFrame) => {
    ctx.clearRect(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tile = OFFICE_MAP[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        // Lantai Dasar
        if (tile === 2) {
          // Karpet Biru Ruang Rapat Privat
          ctx.fillStyle = (r + c) % 2 === 0 ? '#1e3a8a' : '#1d4ed8';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        } else if (tile === 3 || tile === 5 || tile === 8) {
          // Lantai Lounge Hangat
          ctx.fillStyle = (r + c) % 2 === 0 ? '#064e3b' : '#065f46';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        } else {
          // Lantai Kayu Kantor Modern
          ctx.fillStyle = (r + c) % 2 === 0 ? '#334155' : '#3b495e';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }

        // Grid tipis estetis
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

        // Gambar Objek Spesifik di Atas Lantai
        if (tile === 1) {
          // Tembok
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 10);
        } else if (tile === 10) {
          // Jendela Kaca
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(x + 4, y + 8, TILE_SIZE - 8, TILE_SIZE - 16);
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(x + 8, y + 12, 10, TILE_SIZE - 24);
        } else if (tile === 4) {
          // Meja Kayu + Laptop
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.roundRect(x + 4, y + 6, TILE_SIZE - 8, TILE_SIZE - 12, 6);
          ctx.fill();
          ctx.fillStyle = '#92400e';
          ctx.beginPath();
          ctx.roundRect(x + 6, y + 8, TILE_SIZE - 12, TILE_SIZE - 18, 4);
          ctx.fill();
          // Laptop kecil di atas meja
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(x + 16, y + 14, 16, 12);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(x + 18, y + 16, 12, 8);
        } else if (tile === 5) {
          // Sofa Lounge
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.roundRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12, 10);
          ctx.fill();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.roundRect(x + 10, y + 10, TILE_SIZE - 20, TILE_SIZE - 20, 6);
          ctx.fill();
        } else if (tile === 6) {
          // Tanaman Hias Pot
          ctx.fillStyle = '#9a3412';
          ctx.beginPath();
          ctx.arc(x + 24, y + 30, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(x + 24, y + 22, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.arc(x + 20, y + 18, 8, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 7) {
          // Papan Tulis Interaktif (Whiteboard)
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(x + 2, y + 8, TILE_SIZE - 4, TILE_SIZE - 16);
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 2, y + 8, TILE_SIZE - 4, TILE_SIZE - 16);
          // Coretan warna-warni simulasi
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(x + 8, y + 14, 14, 3);
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(x + 8, y + 20, 22, 3);
        } else if (tile === 8) {
          // Mesin Kopi Interaktif
          ctx.fillStyle = '#475569';
          ctx.fillRect(x + 8, y + 6, TILE_SIZE - 16, TILE_SIZE - 12);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 12, y + 14, TILE_SIZE - 24, 14);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(x + 24, y + 10, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 9) {
          // Meja Pengumuman / Dokumen Bersama
          ctx.fillStyle = '#4f46e5';
          ctx.beginPath();
          ctx.roundRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12, 8);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 14, y + 12, 20, 24);
          ctx.fillStyle = '#6366f1';
          ctx.fillRect(x + 17, y + 16, 14, 3);
          ctx.fillRect(x + 17, y + 22, 10, 3);
        }
      }
    }

    ctx.save();
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText('🔒 RUANG RAPAT A (ZONA PRIVAT)', 1.4 * TILE_SIZE, 1.6 * TILE_SIZE);
    ctx.fillText('🎨 PAPAN TULIS & KOLABORASI', 9.2 * TILE_SIZE, 2.5 * TILE_SIZE);
    ctx.fillText('☕ COFFEE LOUNGE', 17.5 * TILE_SIZE, 1.6 * TILE_SIZE);
    ctx.fillText('💻 AREA FOKUS KERJA', 16.5 * TILE_SIZE, 8.6 * TILE_SIZE);
    ctx.restore();

    if (targetPointRef.current) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(targetPointRef.current.x, targetPointRef.current.y, 10 + Math.sin(walkFrame * 2) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const myX = playerPosRef.current.x;
    const myY = playerPosRef.current.y;
    const myCol = Math.floor(myX / TILE_SIZE);
    const myRow = Math.floor(myY / TILE_SIZE);
    const inPrivateZone = OFFICE_MAP[myRow]?.[myCol] === 2;

    ctx.save();
    if (inPrivateZone) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 3;
      ctx.strokeRect(1 * TILE_SIZE, 1 * TILE_SIZE, 6 * TILE_SIZE, 5 * TILE_SIZE);
    } else {
      const grad = ctx.createRadialGradient(myX, myY, 10, myX, myY, PROXIMITY_RADIUS);
      grad.addColorStop(0, 'rgba(99, 102, 241, 0.18)');
      grad.addColorStop(0.8, 'rgba(99, 102, 241, 0.06)');
      grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(myX, myY, PROXIMITY_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(129, 140, 248, 0.35)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(myX, myY, PROXIMITY_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    Object.values(remotePlayers).forEach((entity) => {
      const dist = Math.hypot(entity.x - myX, entity.y - myY);
      const eCol = Math.floor(entity.x / TILE_SIZE);
      const eRow = Math.floor(entity.y / TILE_SIZE);
      const bothInMeeting = inPrivateZone && OFFICE_MAP[eRow]?.[eCol] === 2;

      if (bothInMeeting || dist <= PROXIMITY_RADIUS) {
        ctx.save();
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(myX, myY);
        ctx.lineTo(entity.x, entity.y);
        ctx.stroke();
        ctx.restore();
      }
    });

    const charactersToDraw = [
      ...Object.values(remotePlayers).map((p) => ({ ...p, isMe: false, jumpOffset: 0 })),
      {
        id: 'local-player',
        name: playerName + ' (Kamu)',
        x: myX,
        y: myY,
        direction: playerPosRef.current.direction,
        isMoving: playerPosRef.current.isMoving,
        avatar: selectedAvatar,
        micOn,
        emote: activeEmote,
        jumpOffset: jumpRef.current.offsetY,
        isMe: true
      }
    ].sort((a, b) => a.y - b.y);

    charactersToDraw.forEach((char) => drawCharacterSprite(ctx, char, walkFrame));
  };

  const drawCharacterSprite = (ctx, char, walkFrame) => {
    const { x, y, avatar, name, direction, isMoving, micOn, emote, isMe, jumpOffset = 0 } = char;
    const bounce = isMoving ? Math.abs(Math.sin(walkFrame * 2)) * 4 : 0;
    const currentJump = jumpOffset; // Tinggi lompatan pixel
    const colors = avatar || { body: '#6366f1', shirt: '#4338ca', skin: '#fcd34d', hair: '#1e1b4b' };

    ctx.save();

    // 1. Bayangan di lantai (Mengecil saat melompat tinggi, TETAP di lantai)
    const shadowScale = Math.max(0.35, 1 - (currentJump / 35));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 14 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight Cincin Pemain (Tetap di lantai bersama bayangan)
    if (isMe) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y + 16, 16 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // TOTAL ANGKAT BADAN (Animasi jalan + Tinggi lompatan Space)
    const totalLift = bounce + currentJump;

    // 2. Kaki (Terangkat naik bersama lompatan)
    const leftLegOffset = isMoving ? Math.sin(walkFrame * 2) * 4 : 0;
    const rightLegOffset = isMoving ? -Math.sin(walkFrame * 2) * 4 : 0;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 8, y + 6 + leftLegOffset - totalLift, 6, 10);
    ctx.fillRect(x + 2, y + 6 + rightLegOffset - totalLift, 6, 10);

    // 3. Badan / Baju (Gunakan - totalLift agar ikut loncat)
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.roundRect(x - 12, y - 8 - totalLift, 24, 18, 6);
    ctx.fill();

    // 4. Detail Kerah Baju (Gunakan - totalLift)
    ctx.fillStyle = colors.shirt || '#4338ca';
    ctx.fillRect(x - 6, y - 6 - totalLift, 12, 10);

    // 5. Kepala (Gunakan - totalLift)
    ctx.fillStyle = colors.skin;
    ctx.beginPath();
    ctx.roundRect(x - 13, y - 26 - totalLift, 26, 20, 8);
    ctx.fill();

    // 6. Rambut (Gunakan - totalLift)
    ctx.fillStyle = colors.hair;
    ctx.beginPath();
    ctx.roundRect(x - 14, y - 28 - totalLift, 28, 9, [8, 8, 2, 2]);
    ctx.fill();

    // 7. Mata (Gunakan - totalLift)
    ctx.fillStyle = '#0f172a';
    if (direction !== 'up') {
      let eyeOffsetX = 0;
      if (direction === 'left') eyeOffsetX = -4;
      if (direction === 'right') eyeOffsetX = 4;

      ctx.beginPath();
      ctx.arc(x - 5 + eyeOffsetX, y - 16 - totalLift, 2.2, 0, Math.PI * 2);
      ctx.arc(x + 5 + eyeOffsetX, y - 16 - totalLift, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. Floating Emote (Ikut melayang saat loncat)
    if (emote) {
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(emote, x, y - 48 - totalLift);
    }

    // 9. Name Tag Pill (Ikut melayang bersama kepala)
    ctx.font = '600 11px Inter, sans-serif';
    const textWidth = ctx.measureText(name).width;
    const pillWidth = textWidth + 24;
    const pillX = x - pillWidth / 2;
    const pillY = y - 44 - totalLift;

    ctx.fillStyle = isMe ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, 18, 9);
    ctx.fill();

    ctx.strokeStyle = isMe ? '#38bdf8' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = micOn ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.arc(pillX + 9, pillY + 9, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'left';
    ctx.fillText(name, pillX + 16, pillY + 13);

    ctx.restore();
  };

  const handleCanvasClick = (e) => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const col = Math.floor(clickX / TILE_SIZE);
    const row = Math.floor(clickY / TILE_SIZE);
    const clickedTile = OFFICE_MAP[row]?.[col];

    if (clickedTile === 7) return handleInteractObject('whiteboard');
    if (clickedTile === 8) return handleInteractObject('coffee');
    if (clickedTile === 9) return handleInteractObject('docs');

    if (!COLLISION_TILES.has(clickedTile)) {
      targetPointRef.current = { x: clickX, y: clickY };
    }
  };

  const handleInteractObject = (type) => {
    if (type === 'whiteboard') setActiveModal('whiteboard');
    else if (type === 'docs') setActiveModal('docs');
    else if (type === 'coffee') {
      triggerEmote('☕');
      setCoffeeToast('Secangkir kopi hangat diseduh! Energi +100% ☕✨');
      setTimeout(() => setCoffeeToast(null), 3500);
    }
  };

  const triggerEmote = (emoji) => {
    setActiveEmote(emoji);
    playerPosRef.current.emote = emoji;
    setTimeout(() => {
      setActiveEmote(null);
      playerPosRef.current.emote = null;
    }, 3500);
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;
    const text = chatInput.trim();
    setChatInput('');

    const msgObj = {
      sender: playerName,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      avatarColor: selectedAvatar.body
    };

    try {
      const chatCol = collection(db, 'rooms', roomId, 'chats');
      await addDoc(chatCol, msgObj);
    } catch (err) {}
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim() || !user) return;

    const noteObj = {
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      author: playerName,
      timestamp: Date.now()
    };

    setNewNoteTitle('');
    setNewNoteContent('');

    try {
      const notesCol = collection(db, 'rooms', roomId, 'notes');
      await addDoc(notesCol, noteObj);
    } catch (err) {}
  };

  // Collaborative Whiteboard
  useEffect(() => {
    if (activeModal !== 'whiteboard') return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    whiteboardStrokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, [activeModal, whiteboardStrokes]);

  const startWbDraw = (e) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    isDrawingRef.current = true;
    currentStrokeRef.current = [{ x: e.clientX - rect.left, y: e.clientY - rect.top }];
  };

  const moveWbDraw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    currentStrokeRef.current.push({ x, y });

    const ctx = canvas.getContext('2d');
    const pts = currentStrokeRef.current;
    if (pts.length >= 2) {
      ctx.strokeStyle = wbColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
  };

  const endWbDraw = async () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const points = currentStrokeRef.current;
    if (points.length < 2 || !user) return;

    try {
      const wbCol = collection(db, 'rooms', roomId, 'whiteboard');
      await addDoc(wbCol, {
        color: wbColor,
        pointsJson: JSON.stringify(points.slice(0, 80)),
        timestamp: Date.now()
      });
    } catch (err) {}
  };

  const clearWhiteboard = async () => {
    if (!user) return;
    try {
      whiteboardStrokes.forEach(async (s) => {
        if (!s.id.startsWith('local-')) {
          await deleteDoc(doc(db, 'rooms', roomId, 'whiteboard', s.id));
        }
      });
    } catch (e) {}
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const nearbyObject = useMemo(() => getNearbyInteractiveObject(playerPos.x, playerPos.y), [playerPos.x, playerPos.y]);
  const currentZone = useMemo(() => getZoneName(playerPos.x, playerPos.y), [playerPos.x, playerPos.y]);

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      
      <MeetFullScreenModal
        isOpen={isMeetOpen}
        onClose={() => setIsMeetOpen(false)}
        roomId={roomId}
        roomTitle={roomTitle}
        user={user}
        playerName={playerName}
        selectedAvatar={selectedAvatar}
        micOn={micOn}
        setMicOn={setMicOn}
        camOn={camOn}
        toggleCamera={toggleCamera}
        mediaStream={mediaStream}
        connectedPeers={connectedPeers}
        remoteStreams={remoteStreams}
        peerConnectionsRef={peerConnectionsRef}
      />
      {/* HEADER BAR */}
      <header className="h-14 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm">N</div>
            <span className="font-bold text-sm hidden sm:inline">Ngawadul</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Current Room Indicator & Share Button */}
          <button
            onClick={handleCopyLink}
            title="Klik untuk menyalin tautan ruangan ini"
            className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/80 px-3 py-1 rounded-full text-xs transition"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-indigo-400" />}
            <span className="font-semibold text-slate-200 truncate max-w-[120px]">{roomTitle}</span>
            <span className="text-[10px] text-indigo-300 ml-1">{copiedLink ? 'Tersalin!' : 'Bagikan Link'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-800 px-3 py-1 rounded-full text-xs">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium text-slate-200">{currentZone}</span>
          </div>

          <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${
            connectedPeers.length > 0 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/50 border-slate-800 text-slate-400'
          }`}>
            <Radio className={`w-3.5 h-3.5 ${connectedPeers.length > 0 ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span>{connectedPeers.length > 0 ? `${connectedPeers.length} Player Terhubung` : 'Dekati player lain'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMeetOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Mode Full Meet</span>
          </button>
          <button
            onClick={() => setActiveModal('docs')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Catatan Tim</span>
          </button>
          <button
            onClick={() => setActiveModal('whiteboard')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition"
          >
            <PenTool className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Papan Tulis</span>
          </button>
          <button
            onClick={() => setActiveModal('help')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* WORKSPACE & CANVAS */}
      <div className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-auto p-2 sm:p-4">
          {/* FLOATING PROXIMITY VIDEO */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 max-w-full overflow-x-auto px-4 py-1 pointer-events-auto">
            <div className="w-36 sm:w-44 h-24 sm:h-28 rounded-2xl bg-slate-900/95 border-2 border-indigo-500/80 shadow-xl overflow-hidden relative shrink-0 flex items-center justify-center">
              {camOn && mediaStream ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                    style={{ backgroundColor: selectedAvatar.body }}
                  >
                    {playerName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Kamera Mati</span>
                </div>
              )}
              <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px]">
                <span className="font-semibold truncate text-white">{playerName} (Kamu)</span>
                {micOn ? <Mic className="w-3 h-3 text-emerald-400 shrink-0" /> : <MicOff className="w-3 h-3 text-rose-400 shrink-0" />}
              </div>
            </div>

            {connectedPeers.map((peer) => (
              <RemoteVideoBubble key={peer.id} peer={peer} stream={remoteStreams[peer.id]} />
            ))}
          </div>

          {coffeeToast && (
            <div className="absolute top-36 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-slate-950 font-semibold text-xs px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-bounce">
              <Coffee className="w-4 h-4" />
              <span>{coffeeToast}</span>
            </div>
          )}

          {nearbyObject && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
              <button
                onClick={() => handleInteractObject(nearbyObject.type)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-3 rounded-2xl shadow-2xl border border-indigo-400 flex items-center gap-2.5 animate-bounce"
              >
                <span className="bg-white text-indigo-700 font-extrabold px-2 py-0.5 rounded text-[11px]">E / Klik</span>
                <span>{nearbyObject.label}</span>
              </button>
            </div>
          )}

          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-slate-900">
            <canvas
              ref={mapCanvasRef}
              width={MAP_COLS * TILE_SIZE}
              height={MAP_ROWS * TILE_SIZE}
              onClick={handleCanvasClick}
              className="block max-w-full max-h-[calc(100vh-140px)] w-auto h-auto cursor-pointer"
            />
          </div>

          {/* D-PAD Controls */}
          <div className="absolute bottom-4 left-4 z-20 grid grid-cols-3 gap-1 w-28 h-28 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-lg">
            <div />
            <button
              onMouseDown={() => (keysPressedRef.current['w'] = true)}
              onMouseUp={() => (keysPressedRef.current['w'] = false)}
              className="bg-slate-800 hover:bg-indigo-600 rounded-lg flex items-center justify-center text-white"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <div />
            <button
              onMouseDown={() => (keysPressedRef.current['a'] = true)}
              onMouseUp={() => (keysPressedRef.current['a'] = false)}
              className="bg-slate-800 hover:bg-indigo-600 rounded-lg flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="bg-slate-950 rounded-lg flex items-center justify-center text-[9px] text-slate-400 font-bold">JALAN</div>
            <button
              onMouseDown={() => (keysPressedRef.current['d'] = true)}
              onMouseUp={() => (keysPressedRef.current['d'] = false)}
              className="bg-slate-800 hover:bg-indigo-600 rounded-lg flex items-center justify-center text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div />
            <button
              onMouseDown={() => (keysPressedRef.current['s'] = true)}
              onMouseUp={() => (keysPressedRef.current['s'] = false)}
              className="bg-slate-800 hover:bg-indigo-600 rounded-lg flex items-center justify-center text-white"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <div />
          </div>
        </div>

        {/* SIDEBAR: CHAT & PLAYERS */}
        {(showChat || showPeople) && (
          <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-20">
            <div className="p-2 border-b border-slate-800 flex gap-1">
              <button
                onClick={() => { setShowChat(true); setShowPeople(false); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
                  showChat ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Obrolan</span>
              </button>
              <button
                onClick={() => { setShowPeople(true); setShowChat(false); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
                  showPeople ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Pemain ({1 + Object.keys(remotePlayers).length})</span>
              </button>
            </div>

            {showChat ? (
              <>
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-xl p-2.5 text-xs ${
                        msg.isSystem ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-200' : 'bg-slate-800/90 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11px] text-white">{msg.sender}</span>
                        <span className="text-[10px] text-slate-400">{msg.time}</span>
                      </div>
                      <p className="leading-relaxed text-slate-200">{msg.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Kirim pesan..."
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                  <button type="submit" className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">Pemain di Room Ini</div>
                <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                      style={{ backgroundColor: selectedAvatar.body }}
                    >
                      {playerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{playerName} (Kamu)</p>
                      <p className="text-[10px] text-emerald-400">{playerStatus}</p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                {Object.values(remotePlayers).map((p) => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                        style={{ backgroundColor: p.avatar?.body || '#6366f1' }}
                      >
                        {(p.name || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.status || 'Online'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => (targetPointRef.current = { x: p.x, y: p.y })}
                      className="text-[10px] bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 px-2 py-1 rounded-md"
                    >
                      Hampiri
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* FOOTER BAR */}
      <footer className="h-16 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="hidden sm:flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow"
            style={{ backgroundColor: selectedAvatar.body }}
          >
            {playerName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-white">{playerName}</p>
            <p className="text-[10px] text-slate-400">{playerStatus}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <button
            onClick={() => setMicOn((p) => !p)}
            className={`px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 ${
              micOn ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' : 'bg-rose-500 text-white'
            }`}
          >
            {micOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
            <span className="hidden md:inline">{micOn ? 'Mic Aktif' : 'Muted'}</span>
          </button>

          <button
            onClick={toggleCamera}
            className={`px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 ${
              camOn ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-slate-400" />}
            <span className="hidden md:inline">{camOn ? 'Kamera On' : 'Kamera Off'}</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-xl">
            {EMOTES.slice(0, 5).map((emoji) => (
              <button
                key={emoji}
                onClick={() => triggerEmote(emoji)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-sm transition transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowChat(!showChat);
              if (showPeople) setShowPeople(false);
            }}
            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 ${
              showChat ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden lg:inline">Chat</span>
          </button>

          <button
            onClick={() => {
              setShowPeople(!showPeople);
              if (showChat) setShowChat(false);
            }}
            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 ${
              showPeople ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden lg:inline">Orang</span>
          </button>

          <button
            onClick={onLeave}
            className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition hover:bg-rose-500/25"
            title="Keluar ke Lobi"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* MODALS */}
      {activeModal === 'whiteboard' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PenTool className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Papan Tulis Kolaboratif</h3>
              </div>
              <div className="flex items-center gap-2">
                {['#38bdf8', '#4ade80', '#f43f5e', '#facc15', '#ffffff'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setWbColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${wbColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button onClick={clearWhiteboard} className="ml-2 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan</span>
                </button>
                <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-950 flex justify-center">
              <canvas
                ref={whiteboardCanvasRef}
                width={700}
                height={400}
                onMouseDown={startWbDraw}
                onMouseMove={moveWbDraw}
                onMouseUp={endWbDraw}
                onMouseLeave={endWbDraw}
                className="rounded-xl border border-slate-800 cursor-crosshair bg-slate-900 max-w-full"
              />
            </div>
          </div>
        </div>
      )}

      {activeModal === 'docs' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Catatan & Dokumen Tim</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <form onSubmit={handleAddNote} className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Judul catatan..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
                <textarea
                  rows={2}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Isi catatan..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs">
                  + Simpan Catatan
                </button>
              </form>
              <div className="space-y-2.5">
                {sharedNotes.map((note) => (
                  <div key={note.id} className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80">
                    <h4 className="font-bold text-xs text-white mb-1">{note.title}</h4>
                    <p className="text-xs text-slate-300">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Panduan Ruangan</h3>
              <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <p>• Gerakkan karakter dengan <b>WASD</b>, <b>Panah Keyboard</b>, atau <b>Klik di lantai</b>.</p>
              <p>• Dekati pemain lain untuk otomatis terhubung ke <b>Audio/Video Call WebRTC</b>.</p>
              <p>• Bagikan tautan ruangan kepada rekan kerja untuk berkolaborasi bersama di ruangan ini.</p>
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs">
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}