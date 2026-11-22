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
      case 'juggernaut': // Seismic sledgehammer: ground-shaking boom + crunch
        this.tone(ctx, out, t, { type: 'sine', f0: 95, f1: 32, vol: 0.9 * boost, decay: 0.32 });
        this.burst(ctx, out, t, { type: 'lowpass', freq: 900, freqEnd: 200, vol: 0.7 * boost, decay: 0.26, send: 0.4, saturate: true });
        this.tone(ctx, out, t, { type: 'sine', f0: 720 * j, vol: 0.08 * boost, decay: 0.2 });
        break;
      default:
        this.playMeleeHit(crit);
    }
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
