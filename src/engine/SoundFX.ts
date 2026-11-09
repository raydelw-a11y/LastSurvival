// High-Output Mobile-Ready Web Audio API Synthesizer & Ambience Engine for LastSurvival

class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private unlocked: boolean = false;
  private bgmInterval: number | null = null;
  private bgmStep: number = 0;
  public muted: boolean = false;
  public appPaused: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'click', 'keydown'];
      const handleGesture = () => {
        if (!this.appPaused) {
          this.unlockAudio();
        }
      };
      unlockEvents.forEach((evt) => {
        window.addEventListener(evt, handleGesture, { passive: true, capture: true });
      });

      const handleHide = () => {
        if (document.visibilityState === 'hidden') {
          this.suspendForBackground();
        }
      };
      document.addEventListener('visibilitychange', handleHide);
      window.addEventListener('blur', () => this.suspendForBackground());
      window.addEventListener('pagehide', () => this.suspendForBackground());
    }
  }

  public suspendForBackground() {
    this.appPaused = true;
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public resumeFromBackground() {
    this.appPaused = false;
    if (!this.muted && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public unlockAudio() {
    if (this.muted) return;

    // 1. Force iOS 17+ AudioSession to 'playback' so physical silent switch doesn't mute game
    try {
      const nav = navigator as unknown as { audioSession?: { type: string } };
      if (nav.audioSession) {
        nav.audioSession.type = 'playback';
      }
    } catch {
      // Ignore if unsupported
    }

    // 2. Initialize AudioContext + Master Compressor
    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!this.unlocked) {
      this.unlocked = true;

      // Play a 1-frame silent buffer to unlock WebKit AudioContext
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {
        // Ignore
      }

      // Play tiny inline WAV via HTML5 Audio element to switch iOS to media playback channel
      try {
        const silentWav =
          'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        const audio = new Audio(silentWav);
        audio.volume = 0.01;
        audio.play().catch(() => {});
      } catch {
        // Ignore
      }

      this.startBackgroundMusic();
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted || this.appPaused) return null;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        compressor.knee.setValueAtTime(12, this.ctx.currentTime);
        compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.95, this.ctx.currentTime);
        this.masterGain.connect(compressor);
        compressor.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && !this.appPaused) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getDest(): AudioNode | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    return this.masterGain || ctx.destination;
  }

  // Dark Gritty Post-Apocalyptic Bass & Percussion Loop so you always hear the game alive
  public startBackgroundMusic() {
    if (this.bgmInterval !== null) return;
    const bassNotes = [110, 110, 130.81, 110, 146.83, 130.81, 98, 98];

    this.bgmInterval = window.setInterval(() => {
      if (this.muted || this.appPaused) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const ctx = this.getContext();
      const dest = this.getDest();
      if (!ctx || !dest || ctx.state !== 'running') return;

      const now = ctx.currentTime;
      const step = this.bgmStep % 8;
      this.bgmStep++;

      // Gritty plucked bass guitar note
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassNotes[step], now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(620, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.22);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.24);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.25);

      // Kick / Hi-hat pulse
      if (step % 2 === 0) {
        const kick = ctx.createOscillator();
        const kGain = ctx.createGain();
        kick.type = 'triangle';
        kick.frequency.setValueAtTime(150, now);
        kick.frequency.exponentialRampToValueAtTime(48, now + 0.1);
        kGain.gain.setValueAtTime(0.22, now);
        kGain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
        kick.connect(kGain);
        kGain.connect(dest);
        kick.start(now);
        kick.stop(now + 0.11);
      } else {
        // Metallic hi-hat tick
        const bufLen = Math.floor(ctx.sampleRate * 0.04);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.012));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const hFilter = ctx.createBiquadFilter();
        hFilter.type = 'highpass';
        hFilter.frequency.setValueAtTime(3500, now);
        const hGain = ctx.createGain();
        hGain.gain.setValueAtTime(0.09, now);
        hGain.gain.exponentialRampToValueAtTime(0.005, now + 0.04);
        noise.connect(hFilter);
        hFilter.connect(hGain);
        hGain.connect(dest);
        noise.start(now);
      }
    }, 280);
  }

  public playShotgun() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.24);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.07));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.Q.setValueAtTime(0.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.23);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(now);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.15);
    oscGain.gain.setValueAtTime(0.48, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playRifle() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.11);
    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playMeleeHit(heavy = false) {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Crisp mid-range "WACK!" smack audible on mobile speakers
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = heavy ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(heavy ? 380 : 520, now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 95 : 130, now + (heavy ? 0.13 : 0.09));
    gain.gain.setValueAtTime(heavy ? 0.52 : 0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (heavy ? 0.14 : 0.1));
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + (heavy ? 0.14 : 0.1));

    // Short impact noise transient
    const bufLen = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.35, now);
    nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    noise.connect(nGain);
    nGain.connect(dest);
    noise.start(now);
  }

  public playBarricadeBash() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.14);
    gain.gain.setValueAtTime(0.48, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playExplosion() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.55);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.18));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(now);
  }

  public playCouragePickup() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const notes = [587.33, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.35, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.16);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.17);
    });
  }

  public playUnitSpawn() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.12);
    gain.gain.setValueAtTime(0.36, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playZombieReanimate() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(240, now + 0.18);
    osc.frequency.linearRampToValueAtTime(120, now + 0.35);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.36);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playSiren() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(780, now + 0.45);
    osc.frequency.linearRampToValueAtTime(340, now + 0.9);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.95);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.95);
  }

  public playBusEngineRam() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.8);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.9);
  }
}

export const soundFX = new SoundSystem();
