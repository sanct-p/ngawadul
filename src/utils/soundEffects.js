// Web Audio API Sound Synthesizer
let audioCtx = null;
let isMuted = localStorage.getItem('sfx_muted') === 'true';

export const setSfxMuted = (muted) => {
  isMuted = muted;
  localStorage.setItem('sfx_muted', muted ? 'true' : 'false');
};

export const getSfxMuted = () => isMuted;

const getAudioContext = () => {
  if (isMuted) return null; // Jika di-mute, langsung abaikan
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// 1. Suara Loncat (Pitch naik cepat ala game retro)
export const playJumpSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const now = ctx.currentTime;

    // Frekuensi naik dari 150Hz ke 420Hz dalam 0.15 detik
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {}
};

// 2. Suara User Masuk Proximity / Panggilan (Nada Chime dua ketukan ramah)
export const playProximityJoinSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Nada pertama (E5 - 659 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Nada kedua lebih tinggi (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch (e) {}
};

// 3. Suara Pesan Chat Baru (Pop / Bubble sound)
export const playChatSound = (isPrivate = false) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Nada DM Privat sedikit lebih tinggi agar berbeda dengan chat umum
    const startFreq = isPrivate ? 880 : 587.33;
    const endFreq = isPrivate ? 1174.66 : 783.99;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.1);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {}
};