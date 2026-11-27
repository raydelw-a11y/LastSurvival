// High-Output Mobile-Ready Web Audio API Synthesizer & Ambience Engine for LastSurvival

const MUTE_KEY = 'last_survival_muted_v1';

class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private unlocked: boolean = false;
  private bgmInterval: number | null = null;
  private bgmStep: number = 0;
  public muted: boolean = false;
  public appPaused: boolean = false;
  private muteListeners = new Set<(muted: boolean) => void>();

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      // Ignore
    }
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

  /** Mute/unmute everything (music + SFX), remembered on this device and shared by map & battle. */
  public setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // Ignore
    }
    if (muted) {
      if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
    } else {
      this.unlockAudio();
      this.playCouragePickup();
    }
    this.muteListeners.forEach((fn) => fn(muted));
  }

  public toggleMuted() {
    this.setMuted(!this.muted);
  }

  public onMutedChange(fn: (muted: boolean) => void): () => void {
    this.muteListeners.add(fn);
    return () => {
      this.muteListeners.delete(fn);
    };
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

  // ===========================================================================
  // REALISTIC LAYERED WEAPON ENGINE
  // Every shot = supersonic crack + muzzle blast + low-end thump + outdoor
  // reverb tail, plus per-weapon mechanics (pump, bolt, brass, motor...).
  // ===========================================================================
  private noiseBuf: AudioBuffer | null = null;
  private reverbSend: GainNode | null = null;
  private saturator: WaveShaperNode | null = null;
  private weaponBus: GainNode | null = null;
  private lastPlayed: Record<string, number> = {};
  private activeVoices = 0;

  private getNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 2);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    return this.noiseBuf;
  }

  // Shared outdoor "valley" reverb (procedural impulse response) + soft-clip saturator
  private getFxBus(ctx: AudioContext, dest: AudioNode) {
    if (!this.reverbSend) {
      const seconds = 1.6;
      const len = Math.floor(ctx.sampleRate * seconds);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          // Early slap-back reflections, then a diffuse exponential tail
          const early = i < ctx.sampleRate * 0.09 && Math.random() < 0.004 ? 1.6 : 0;
          d[i] = ((Math.random() * 2 - 1) + early) * Math.pow(1 - t, 3.2);
        }
      }
      const conv = ctx.createConvolver();
      conv.buffer = ir;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3200;
      this.reverbSend = ctx.createGain();
      this.reverbSend.gain.value = 0.32;
      this.reverbSend.connect(lp);
      lp.connect(conv);
      conv.connect(dest);

      this.saturator = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i / 1023) * 2 - 1;
        curve[i] = Math.tanh(x * 2.4) / Math.tanh(2.4);
      }
      this.saturator.curve = curve;
      this.saturator.connect(dest);
    }
    return { reverb: this.reverbSend, sat: this.saturator! };
  }

  /** Weapon sub-mix: headroom so heavy guns punch through the master compressor without clipping. */
  private getWeaponOut(dest: AudioNode): AudioNode {
    const ctx = this.ctx!;
    if (!this.weaponBus) {
      this.weaponBus = ctx.createGain();
      this.weaponBus.gain.value = 0.62;
      this.weaponBus.connect(dest);
    }
    return this.weaponBus;
  }

  /** Rate-limit identical sounds and cap simultaneous voices so big squads don't clip or lag. */
  private allow(key: string, minGap: number, ctx: AudioContext): boolean {
    const now = ctx.currentTime;
    if (this.activeVoices > 22) return false;
    if (now - (this.lastPlayed[key] ?? -1) < minGap) return false;
    this.lastPlayed[key] = now;
    return true;
  }

  private trackVoice(src: AudioScheduledSourceNode) {
    this.activeVoices++;
    src.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    };
  }

  /** Filtered noise burst with sharp attack and exponential decay. */
  private burst(
    ctx: AudioContext,
    out: AudioNode,
    at: number,
    o: {
      type: BiquadFilterType;
      freq: number;
      freqEnd?: number;
      q?: number;
      vol: number;
      attack?: number;
      decay: number;
      rate?: number;
      send?: number;
      saturate?: boolean;
    }
  ) {
    const { reverb, sat } = this.getFxBus(ctx, out);
    const src = ctx.createBufferSource();
    src.buffer = this.getNoise(ctx);
    src.playbackRate.value = o.rate ?? 1;
    const f = ctx.createBiquadFilter();
    f.type = o.type;
    f.frequency.setValueAtTime(o.freq, at);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, at + o.decay);
    f.Q.value = o.q ?? 0.7;
    const g = ctx.createGain();
    const atk = o.attack ?? 0.0015;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(o.vol, at + atk);
    g.gain.exponentialRampToValueAtTime(0.0008, at + atk + o.decay);
    src.connect(f);
    f.connect(g);
    g.connect(o.saturate ? sat : out);
    if (o.send) {
      const s = ctx.createGain();
      s.gain.value = o.send;
      g.connect(s);
      s.connect(reverb);
    }
    const offset = Math.random() * 1.5;
    src.start(at, offset, atk + o.decay + 0.05);
    this.trackVoice(src);
  }

  /** Pitched oscillator hit (body thump, metal ring, bark...). */
  private tone(
    ctx: AudioContext,
    out: AudioNode,
    at: number,
    o: { type: OscillatorType; f0: number; f1?: number; vol: number; decay: number; attack?: number }
  ) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.f0, at);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, at + o.decay);
    const atk = o.attack ?? 0.002;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(o.vol, at + atk);
    g.gain.exponentialRampToValueAtTime(0.0008, at + atk + o.decay);
    osc.connect(g);
    g.connect(out);
    osc.start(at);
    osc.stop(at + atk + o.decay + 0.02);
    this.trackVoice(osc);
  }

  /** Small mechanical click (slide, bolt, pump, lever). */
  private mechClick(ctx: AudioContext, out: AudioNode, at: number, freq: number, vol: number) {
    this.burst(ctx, out, at, { type: 'bandpass', freq, q: 4, vol, decay: 0.025 });
    this.tone(ctx, out, at, { type: 'square', f0: freq * 1.9, vol: vol * 0.25, decay: 0.012 });
  }

  /** Brass shell casing bouncing on asphalt. */
  private brass(ctx: AudioContext, out: AudioNode, at: number, vol = 0.05) {
    const base = 4200 + Math.random() * 1400;
    [0, 0.07 + Math.random() * 0.03, 0.12 + Math.random() * 0.04].forEach((dt, i) => {
      this.tone(ctx, out, at + dt, { type: 'sine', f0: base * (1 + i * 0.07), vol: vol / (i + 1), decay: 0.04 });
    });
  }

  private jit(spread = 0.08) {
    return 1 - spread / 2 + Math.random() * spread;
  }

  /** Plays the signature firearm / weapon sound of a squad unit. */
  public playUnitWeapon(unit: string) {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const out = this.getWeaponOut(dest);
    const t = ctx.currentTime + 0.002;
    const j = this.jit();

    switch (unit) {
      case 'farmer': {
        // Double-barrel 12-gauge: huge low boom, wide spread, long valley echo
        if (!this.allow(unit, 0.09, ctx)) return;
        this.burst(ctx, out, t, { type: 'highpass', freq: 2800, vol: 0.55, decay: 0.008 });
        this.burst(ctx, out, t, { type: 'lowpass', freq: 2600 * j, freqEnd: 500, vol: 0.95, decay: 0.3, send: 0.6, saturate: true });
        this.tone(ctx, out, t, { type: 'sine', f0: 125 * j, f1: 36, vol: 0.75, decay: 0.26 });
        this.burst(ctx, out, t + 0.012, { type: 'bandpass', freq: 650, q: 0.9, vol: 0.35, decay: 0.18 });
        break;
      }
      case 'policeman': {
        // Pump-action riot shotgun: bright boom followed by the iconic "chk-chk" rack
        if (!this.allow(unit, 0.09, ctx)) return;
        this.burst(ctx, out, t, { type: 'highpass', freq: 3200, vol: 0.55, decay: 0.007 });
        this.burst(ctx, out, t, { type: 'bandpass', freq: 1500 * j, freqEnd: 600, q: 0.6, vol: 0.9, decay: 0.24, send: 0.5, saturate: true });
        this.tone(ctx, out, t, { type: 'sine', f0: 140 * j, f1: 42, vol: 0.65, decay: 0.2 });
        this.mechClick(ctx, out, t + 0.34, 1900, 0.22);
        this.burst(ctx, out, t + 0.36, { type: 'bandpass', freq: 900, q: 2, vol: 0.08, decay: 0.06 });
        this.mechClick(ctx, out, t + 0.46, 1250, 0.26);
        break;
      }
      case 'gunslinger': {
        // Akimbo 9mm: snappy crack, short blast, ejected brass tinkling
        if (!this.allow(unit, 0.05, ctx)) return;
        this.burst(ctx, out, t, { type: 'highpass', freq: 4200 * j, vol: 0.45, decay: 0.005 });
        this.burst(ctx, out, t, { type: 'bandpass', freq: 1900 * j, freqEnd: 900, q: 0.9, vol: 0.75, decay: 0.075, send: 0.28, saturate: true });
        this.tone(ctx, out, t, { type: 'sine', f0: 230 * j, f1: 85, vol: 0.32, decay: 0.06 });
        this.mechClick(ctx, out, t + 0.018, 3000 * j, 0.07);
        if (Math.random() < 0.6) this.brass(ctx, out, t + 0.22, 0.035);
        break;
      }
      case 'sniper': {
        // .338 Magnum: supersonic snap, heavy boom, long echo rolling back, bolt cycling
        if (!this.allow(unit, 0.15, ctx)) return;
        this.burst(ctx, out, t, { type: 'highpass', freq: 5200, vol: 0.75, decay: 0.004 });
        this.burst(ctx, out, t, { type: 'lowpass', freq: 3600, freqEnd: 420, vol: 1.0, decay: 0.38, send: 0.95, saturate: true });
        this.tone(ctx, out, t, { type: 'sine', f0: 95, f1: 28, vol: 0.85, decay: 0.36 });
        this.burst(ctx, out, t + 0.38, { type: 'lowpass', freq: 700, vol: 0.16, attack: 0.03, decay: 0.45, send: 0.4 });
        this.mechClick(ctx, out, t + 0.62, 1500, 0.2);
        this.mechClick(ctx, out, t + 0.74, 2300, 0.18);
        this.brass(ctx, out, t + 0.82, 0.04);
        this.mechClick(ctx, out, t + 0.92, 1700, 0.22);
        break;
      }
      case 'turret': {
        // Rotary gatling: tight punchy rounds over a whining spin-motor
        if (!this.allow(unit, 0.06, ctx)) return;
        this.burst(ctx, out, t, { type: 'highpass', freq: 3000 * j, vol: 0.42, decay: 0.004 });
        this.burst(ctx, out, t, { type: 'bandpass', freq: 1150 * j, q: 0.8, vol: 0.8, decay: 0.055, send: 0.18, saturate: true });
        this.tone(ctx, out, t, { type: 'sine', f0: 165 * j, f1: 70, vol: 0.38, decay: 0.05 });
        this.burst(ctx, out, t + 0.08, { type: 'bandpass', freq: 1250 * j, q: 0.8, vol: 0.55, decay: 0.045, saturate: true });
        this.tone(ctx, out, t, { type: 'sawtooth', f0: 210, f1: 230, vol: 0.035, attack: 0.02, decay: 0.22 });
        if (Math.random() < 0.35) this.brass(ctx, out, t + 0.15, 0.025);
        break;
      }
      case 'drone': {
        // Airborne MQ-9: lighter distant-sounding burst muffled by altitude + rotor buzz
        if (!this.allow(unit, 0.07, ctx)) return;
        this.burst(ctx, out, t, { type: 'bandpass', freq: 2600 * j, q: 0.7, vol: 0.7, decay: 0.05, send: 0.45 });
        this.burst(ctx, out, t + 0.06, { type: 'bandpass', freq: 2400 * j, q: 0.7, vol: 0.58, decay: 0.05, send: 0.45 });
        this.tone(ctx, out, t, { type: 'sine', f0: 300, f1: 120, vol: 0.34, decay: 0.07 });
        this.tone(ctx, out, t, { type: 'square', f0: 118, f1: 126, vol: 0.022, attack: 0.03, decay: 0.3 });
        break;
      }
      case 'tesla': {
        // High-voltage discharge: rising capacitor whine, sharp arc snap, buzzing 120Hz hum + crackle
        if (!this.allow(unit, 0.12, ctx)) return;
        this.tone(ctx, out, t, { type: 'sawtooth', f0: 380 * j, f1: 1650, vol: 0.09, attack: 0.03, decay: 0.07 });
        this.burst(ctx, out, t + 0.07, { type: 'highpass', freq: 2600, vol: 0.75, decay: 0.012, send: 0.35 });
        this.burst(ctx, out, t + 0.07, { type: 'bandpass', freq: 3400 * j, q: 1.4, vol: 0.55, decay: 0.16, send: 0.4, saturate: true });
        this.tone(ctx, out, t + 0.07, { type: 'square', f0: 120, f1: 116, vol: 0.13, attack: 0.004, decay: 0.26 });
        this.tone(ctx, out, t + 0.07, { type: 'sawtooth', f0: 240, f1: 228, vol: 0.06, attack: 0.004, decay: 0.22 });
        for (let i = 0; i < 6; i++) {
          this.burst(ctx, out, t + 0.08 + Math.random() * 0.24, {
            type: 'highpass',
            freq: 3000 + Math.random() * 3000,
            vol: 0.12 + Math.random() * 0.14,
            decay: 0.006 + Math.random() * 0.01,
          });
        }
        break;
      }
      case 'flamethrower': {
        // Pressurized napalm jet: roaring whoosh + low rumble + crackling embers
        if (!this.allow(unit, 0.16, ctx)) return;
        this.burst(ctx, out, t, { type: 'lowpass', freq: 700, freqEnd: 1900, vol: 0.7, attack: 0.04, decay: 0.38, send: 0.2 });
        this.burst(ctx, out, t, { type: 'bandpass', freq: 380, q: 1.2, vol: 0.4, attack: 0.03, decay: 0.34 });
        this.tone(ctx, out, t, { type: 'sine', f0: 58, f1: 48, vol: 0.2, attack: 0.04, decay: 0.32 });
        for (let i = 0; i < 4; i++) {
          this.burst(ctx, out, t + 0.05 + Math.random() * 0.3, { type: 'highpass', freq: 3500, vol: 0.05 + Math.random() * 0.05, decay: 0.01 });
        }
        break;
      }
      case 'bill':
      default: {
        // Bill's lever-action hunting rifle from the bus roof
        if (!this.allow('bill', 0.08, ctx)) return;
        this.burst(ctx, out, t, { type: 'highpass', freq: 4300, vol: 0.6, decay: 0.005 });
        this.burst(ctx, out, t, { type: 'lowpass', freq: 3000 * j, freqEnd: 520, vol: 0.85, decay: 0.22, send: 0.6, saturate: true });
        this.tone(ctx, out, t, { type: 'sine', f0: 115 * j, f1: 38, vol: 0.62, decay: 0.2 });
        this.mechClick(ctx, out, t + 0.38, 1400, 0.16);
        this.mechClick(ctx, out, t + 0.48, 2100, 0.16);
        break;
      }
    }
  }

  /** Signature melee impact of each close-combat squad unit. */
  public playUnitMelee(unit: string, crit = false) {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const out = this.getWeaponOut(dest);
    if (!this.allow(`melee_${unit}`, 0.05, ctx)) return;
    const t = ctx.currentTime + 0.002;
    const j = this.jit(0.12);
    const boost = crit ? 1.35 : 1;

    switch (unit) {
      case 'redneck': // Wooden baseball bat "THOK" into flesh
        this.burst(ctx, out, t, { type: 'bandpass', freq: 950 * j, q: 2.5, vol: 0.8 * boost, decay: 0.07 });
        this.tone(ctx, out, t, { type: 'sine', f0: 310 * j, f1: 140, vol: 0.6 * boost, decay: 0.08 });
        this.burst(ctx, out, t + 0.01, { type: 'lowpass', freq: 500, vol: 0.3 * boost, decay: 0.1 });
        break;
      case 'builder': // Claw hammer: metallic clank with ring
        this.burst(ctx, out, t, { type: 'highpass', freq: 2500, vol: 0.35 * boost, decay: 0.02 });
        this.tone(ctx, out, t, { type: 'sine', f0: 1240 * j, vol: 0.16 * boost, decay: 0.16 });
        this.tone(ctx, out, t, { type: 'sine', f0: 1870 * j, vol: 0.1 * boost, decay: 0.12 });
        this.tone(ctx, out, t, { type: 'sine', f0: 220, f1: 90, vol: 0.4 * boost, decay: 0.09 });
        break;
      case 'mechanic': // Heavy wrench: bright steel "TINK-CLANG"
        this.burst(ctx, out, t, { type: 'bandpass', freq: 3200, q: 3, vol: 0.35 * boost, decay: 0.03 });
        this.tone(ctx, out, t, { type: 'triangle', f0: 2150 * j, vol: 0.13 * boost, decay: 0.2 });
        this.tone(ctx, out, t, { type: 'sine', f0: 3310 * j, vol: 0.08 * boost, decay: 0.14 });
        this.tone(ctx, out, t, { type: 'sine', f0: 260, f1: 110, vol: 0.32 * boost, decay: 0.08 });
        break;
      case 'hound': // K-9 snarling bite
        this.tone(ctx, out, t, { type: 'sawtooth', f0: 560 * j, f1: 330, vol: 0.4 * boost, attack: 0.008, decay: 0.11 });
        this.burst(ctx, out, t, { type: 'bandpass', freq: 1100 * j, q: 3, vol: 0.55 * boost, attack: 0.006, decay: 0.1 });
        this.burst(ctx, out, t + 0.05, { type: 'bandpass', freq: 2600, q: 2, vol: 0.4 * boost, decay: 0.03 });
        break;
      case 'raptor': // Velociraptor: raspy shriek + snapping jaws
        this.tone(ctx, out, t, { type: 'sawtooth', f0: 980 * j, f1: 520, vol: 0.26 * boost, attack: 0.006, decay: 0.1 });
        this.burst(ctx, out, t, { type: 'bandpass', freq: 1900 * j, q: 3, vol: 0.5 * boost, attack: 0.005, decay: 0.09 });
        this.burst(ctx, out, t + 0.045, { type: 'bandpass', freq: 3200, q: 2, vol: 0.42 * boost, decay: 0.03 });
        break;
      case 'trike': // Triceratops: horned ram, bone on bone
        this.tone(ctx, out, t, { type: 'sine', f0: 120, f1: 40, vol: 0.85 * boost, decay: 0.28 });
        this.burst(ctx, out, t, { type: 'lowpass', freq: 1100, freqEnd: 260, vol: 0.65 * boost, decay: 0.2, send: 0.3, saturate: true });
        this.burst(ctx, out, t + 0.02, { type: 'bandpass', freq: 1700 * j, q: 2, vol: 0.3 * boost, decay: 0.05 });
        break;
      case 'rex': // T-Rex: bone-crushing bite with a deep growl under it
        this.tone(ctx, out, t, { type: 'sawtooth', f0: 110 * j, f1: 48, vol: 0.5 * boost, attack: 0.01, decay: 0.3 });
        this.tone(ctx, out, t, { type: 'sine', f0: 80, f1: 30, vol: 0.9 * boost, decay: 0.34 });
        this.burst(ctx, out, t, { type: 'lowpass', freq: 800, freqEnd: 180, vol: 0.7 * boost, decay: 0.26, send: 0.4, saturate: true });
        this.burst(ctx, out, t + 0.06, { type: 'bandpass', freq: 2400, q: 2, vol: 0.45 * boost, decay: 0.04 });
        break;
      case 'juggernaut': // Seismic sledgehammer: ground-shaking boom + crunch
        this.tone(ctx, out, t, { type: 'sine', f0: 95, f1: 32, vol: 0.9 * boost, decay: 0.32 });
        this.burst(ctx, out, t, { type: 'lowpass', freq: 900, freqEnd: 200, vol: 0.7 * boost, decay: 0.26, send: 0.4, saturate: true });
        this.tone(ctx, out, t, { type: 'sine', f0: 720 * j, vol: 0.08 * boost, decay: 0.2 });
        break;
      default:
        this.playMeleeHit(crit);
    }
  }

  /** The player's hero arsenal: each weapon has its own signature sound. */
  public playHeroWeapon(weapon: string) {
    if (weapon === 'pistol' || weapon === 'dual_pistol') return this.playUnitWeapon('gunslinger');
    if (weapon === 'shotgun') return this.playUnitWeapon('policeman');
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const out = this.getWeaponOut(dest);
    const t = ctx.currentTime + 0.002;
    const j = this.jit();
    switch (weapon) {
      case 'm16': {
        // 5.56 rifle: tight supersonic crack, mid blast, short tail
        if (!this.allow('hero_m16', 0.05, ctx)) return;
        this.burst(ctx, out, t, { type: 'highpass', freq: 4500 * j, vol: 0.5, decay: 0.004 });
        this.burst(ctx, out, t, { type: 'bandpass', freq: 1700 * j, freqEnd: 800, q: 0.8, vol: 0.7, decay: 0.08, send: 0.3, saturate: true });
        this.tone(ctx, out, t, { type: 'sine', f0: 180 * j, f1: 70, vol: 0.38, decay: 0.07 });
        break;
      }
      case 'ak47': {
        // 7.62 rifle: heavier, lower and dirtier than the M16
        if (!this.allow('hero_ak', 0.06, ctx)) return;
        this.burst(ctx, out, t, { type: 'highpass', freq: 3500 * j, vol: 0.5, decay: 0.005 });
        this.burst(ctx, out, t, { type: 'lowpass', freq: 2200 * j, freqEnd: 520, vol: 0.85, decay: 0.12, send: 0.35, saturate: true });
        this.tone(ctx, out, t, { type: 'sine', f0: 140 * j, f1: 50, vol: 0.5, decay: 0.1 });
        break;
      }
      case 'uzi': {
        // 9mm SMG: light, snappy, very rapid
        if (!this.allow('hero_uzi', 0.04, ctx)) return;
        this.burst(ctx, out, t, { type: 'highpass', freq: 3800 * j, vol: 0.38, decay: 0.004 });
        this.burst(ctx, out, t, { type: 'bandpass', freq: 2100 * j, q: 1, vol: 0.5, decay: 0.045, send: 0.15, saturate: true });
        this.tone(ctx, out, t, { type: 'sine', f0: 240 * j, f1: 110, vol: 0.22, decay: 0.04 });
        break;
      }
      case 'bow': {
        // String twang + arrow whoosh
        if (!this.allow('hero_bow', 0.1, ctx)) return;
        this.tone(ctx, out, t, { type: 'triangle', f0: 190 * j, f1: 150, vol: 0.3, attack: 0.002, decay: 0.16 });
        this.tone(ctx, out, t, { type: 'sine', f0: 380 * j, f1: 300, vol: 0.12, decay: 0.12 });
        this.burst(ctx, out, t + 0.01, { type: 'bandpass', freq: 2400, freqEnd: 900, q: 1.5, vol: 0.22, attack: 0.02, decay: 0.2 });
        break;
      }
      case 'bazooka': {
        // Launch thump + rocket hiss
        if (!this.allow('hero_bazooka', 0.2, ctx)) return;
        this.tone(ctx, out, t, { type: 'sine', f0: 110, f1: 40, vol: 0.85, decay: 0.24 });
        this.burst(ctx, out, t, { type: 'lowpass', freq: 1400, freqEnd: 300, vol: 0.7, decay: 0.2, send: 0.5, saturate: true });
        this.burst(ctx, out, t + 0.05, { type: 'bandpass', freq: 3000, freqEnd: 1600, q: 0.8, vol: 0.3, attack: 0.04, decay: 0.55 });
        break;
      }
      case 'sniper': {
        // .50 cal: huge crack, long rolling tail
        if (!this.allow('hero_sniper', 0.2, ctx)) return;
        this.burst(ctx, out, t, { type: 'highpass', freq: 3000 * j, vol: 0.7, decay: 0.008 });
        this.burst(ctx, out, t, { type: 'lowpass', freq: 2600 * j, freqEnd: 380, vol: 1, decay: 0.3, send: 0.6, saturate: true });
        this.tone(ctx, out, t, { type: 'sine', f0: 120 * j, f1: 38, vol: 0.7, decay: 0.2 });
        break;
      }
      case 'minigun': {
        // Buzzsaw of very fast, light shots over a motor whine
        if (!this.allow('hero_minigun', 0.035, ctx)) return;
        this.burst(ctx, out, t, { type: 'bandpass', freq: 1500 * j, q: 0.9, vol: 0.5, decay: 0.04, send: 0.15, saturate: true });
        this.tone(ctx, out, t, { type: 'sawtooth', f0: 210 * j, f1: 150, vol: 0.12, decay: 0.045 });
        break;
      }
      case 'launcher': {
        // Hollow "thoomp"
        if (!this.allow('hero_launcher', 0.15, ctx)) return;
        this.tone(ctx, out, t, { type: 'sine', f0: 260, f1: 70, vol: 0.8, decay: 0.16 });
        this.burst(ctx, out, t, { type: 'lowpass', freq: 900, freqEnd: 250, vol: 0.5, decay: 0.12, send: 0.3 });
        break;
      }
      case 'chainsaw': {
        // Two-stroke engine growl
        if (!this.allow('hero_chainsaw', 0.07, ctx)) return;
        this.tone(ctx, out, t, { type: 'sawtooth', f0: 95 * j, f1: 80, vol: 0.3, decay: 0.09 });
        this.burst(ctx, out, t, { type: 'bandpass', freq: 1200 * j, q: 1.2, vol: 0.22, decay: 0.07, saturate: true });
        break;
      }
      case 'molotov':
      case 'dynamite':
      case 'grenade': {
        // Pin clink + throw whoosh
        if (!this.allow('hero_grenade', 0.2, ctx)) return;
        this.tone(ctx, out, t, { type: 'sine', f0: 3800, vol: 0.12, decay: 0.06 });
        this.burst(ctx, out, t + 0.06, { type: 'bandpass', freq: 900, freqEnd: 2200, q: 1.2, vol: 0.3, attack: 0.03, decay: 0.22 });
        break;
      }
      case 'sword':
      default: {
        // Blade swish + steel ring
        if (!this.allow('hero_sword', 0.08, ctx)) return;
        this.burst(ctx, out, t, { type: 'bandpass', freq: 1400, freqEnd: 4200, q: 1.4, vol: 0.38, attack: 0.03, decay: 0.12 });
        this.tone(ctx, out, t + 0.05, { type: 'sine', f0: 2600 * j, vol: 0.06, decay: 0.25 });
        this.tone(ctx, out, t + 0.05, { type: 'sine', f0: 3900 * j, vol: 0.04, decay: 0.2 });
        break;
      }
    }
  }

  /** Hero reload foley: mag out / mag in / charging handle, shotgun shell, rocket load, dry fire. */
  public playHeroReload(step: 'out' | 'in' | 'rack' | 'shell' | 'rocket' | 'dry') {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest || !this.allow(`reload_${step}`, 0.06, ctx)) return;
    const out = this.getWeaponOut(dest);
    const t = ctx.currentTime + 0.002;
    switch (step) {
      case 'out':
        this.mechClick(ctx, out, t, 1500, 0.2);
        this.burst(ctx, out, t + 0.05, { type: 'bandpass', freq: 700, q: 2, vol: 0.1, decay: 0.05 });
        break;
      case 'in':
        this.mechClick(ctx, out, t, 1100, 0.3);
        this.mechClick(ctx, out, t + 0.04, 2200, 0.14);
        break;
      case 'rack':
        this.mechClick(ctx, out, t, 1800, 0.24);
        this.mechClick(ctx, out, t + 0.09, 1250, 0.3);
        break;
      case 'shell':
        this.mechClick(ctx, out, t, 2400, 0.16);
        this.tone(ctx, out, t, { type: 'sine', f0: 900, vol: 0.05, decay: 0.05 });
        break;
      case 'rocket':
        this.burst(ctx, out, t, { type: 'lowpass', freq: 600, vol: 0.4, decay: 0.12 });
        this.mechClick(ctx, out, t + 0.08, 1300, 0.28);
        break;
      case 'dry':
        this.mechClick(ctx, out, t, 2600, 0.18);
        break;
    }
  }

  /** Zombie spitter hocking an acid glob (wet gurgle + throaty spit). */
  public playAcidSpit() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest || !this.allow('acid_spit', 0.12, ctx)) return;
    const out = this.getWeaponOut(dest);
    const t = ctx.currentTime + 0.002;
    this.burst(ctx, out, t, { type: 'bandpass', freq: 520, freqEnd: 1400, q: 3, vol: 0.45, attack: 0.02, decay: 0.16 });
    this.tone(ctx, out, t, { type: 'sawtooth', f0: 140, f1: 260, vol: 0.12, attack: 0.02, decay: 0.14 });
    this.burst(ctx, out, t + 0.15, { type: 'highpass', freq: 2200, vol: 0.3, decay: 0.03 });
  }

  /** Acid glob splashing on the asphalt and sizzling. */
  public playAcidSplash() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest || !this.allow('acid_splash', 0.1, ctx)) return;
    const out = this.getWeaponOut(dest);
    const t = ctx.currentTime + 0.002;
    this.burst(ctx, out, t, { type: 'lowpass', freq: 900, vol: 0.5, decay: 0.08 });
    this.burst(ctx, out, t + 0.03, { type: 'highpass', freq: 4200, vol: 0.18, attack: 0.05, decay: 0.55, send: 0.2 });
  }

  /** Growl of a zombie dog pack arriving. */
  public playZombieDogPack() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest || !this.allow('dog_pack', 1.2, ctx)) return;
    const out = this.getWeaponOut(dest);
    const t = ctx.currentTime + 0.002;
    for (let i = 0; i < 3; i++) {
      const at = t + i * 0.16;
      this.tone(ctx, out, at, { type: 'sawtooth', f0: 210 + i * 40, f1: 120, vol: 0.16, attack: 0.01, decay: 0.13 });
      this.burst(ctx, out, at, { type: 'bandpass', freq: 700 + i * 120, q: 2.5, vol: 0.28, attack: 0.008, decay: 0.12 });
    }
  }

  /** Dinosaur call: a raptor's rasping shriek, or the long chest-shaking roar of a T-Rex. */
  public playDinoRoar(big: boolean) {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest || !this.allow(big ? 'dino_roar_big' : 'dino_roar', big ? 1.4 : 0.8, ctx)) return;
    const out = this.getWeaponOut(dest);
    const t = ctx.currentTime + 0.002;
    if (big) {
      this.tone(ctx, out, t, { type: 'sawtooth', f0: 150, f1: 58, vol: 0.34, attack: 0.08, decay: 1.0 });
      this.tone(ctx, out, t, { type: 'square', f0: 96, f1: 41, vol: 0.16, attack: 0.1, decay: 1.05 });
      this.tone(ctx, out, t + 0.05, { type: 'sine', f0: 70, f1: 34, vol: 0.5, attack: 0.06, decay: 0.9 });
      this.burst(ctx, out, t, { type: 'bandpass', freq: 520, freqEnd: 240, q: 1.2, vol: 0.5, attack: 0.09, decay: 0.95, send: 0.45, saturate: true });
      this.burst(ctx, out, t + 0.12, { type: 'highpass', freq: 2600, vol: 0.1, attack: 0.1, decay: 0.6, send: 0.3 });
    } else {
      for (let i = 0; i < 2; i++) {
        const at = t + i * 0.13;
        this.tone(ctx, out, at, { type: 'sawtooth', f0: 1250 - i * 180, f1: 640, vol: 0.12, attack: 0.012, decay: 0.16 });
        this.burst(ctx, out, at, { type: 'bandpass', freq: 2100, q: 3, vol: 0.2, attack: 0.01, decay: 0.14, send: 0.2 });
      }
    }
  }

  /** Shriek of a winged zombie swooping in. */
  public playFlyerScreech() {
    const ctx = this.getContext();
    const dest = this.getDest();
    if (!ctx || !dest || !this.allow('flyer', 1.0, ctx)) return;
    const out = this.getWeaponOut(dest);
    const t = ctx.currentTime + 0.002;
    this.tone(ctx, out, t, { type: 'sawtooth', f0: 1500, f1: 820, vol: 0.09, attack: 0.03, decay: 0.32 });
    this.tone(ctx, out, t, { type: 'square', f0: 1720, f1: 940, vol: 0.04, attack: 0.03, decay: 0.3 });
    this.burst(ctx, out, t, { type: 'bandpass', freq: 2600, q: 3, vol: 0.14, attack: 0.04, decay: 0.28, send: 0.3 });
  }

  public playShotgun() {
    this.playUnitWeapon('farmer');
  }

  public playPistol() {
    this.playUnitWeapon('gunslinger');
  }

  public playRifle() {
    this.playUnitWeapon('bill');
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

/** React-free subscription helper: use with useSyncExternalStore or useEffect. */
export const subscribeMuted = (fn: () => void) => soundFX.onMutedChange(() => fn());
export const getMutedSnapshot = () => soundFX.muted;
