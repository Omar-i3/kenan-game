/**
 * Sound Effects & Voice Synthesizer for Monster Kenan Expansion
 * Shares AudioContext from AudioManager. Uses HTML5 Audio for kenan_hit & kenan_dead.
 * All other SFX use Web Audio API oscillator synthesis (zero-latency).
 */
class SoundEffectsManager {
  constructor() {
    this.lastPanicTime = 0;
    this.hitAudio = null;
    this.deadAudio = null;
    this._allAudioElements = [];
    this._unlocked = false;
    this._init();
  }

  _init() {
    // Create & preload boss sound effects
    this.hitAudio = this._createAudio('./kenan_hit.mp3');
    this.deadAudio = this._createAudio('./kenan_dead.mp3');
  }

  _createAudio(path) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio._triedAsset = false;
    const withCacheBust = (p) => p + (p.includes('?') ? '&' : '?') + 't=' + Date.now();
    audio.src = withCacheBust(path);

    audio.onerror = () => {
      if (!audio._triedAsset) {
        audio._triedAsset = true;
        // Try ./assets/ fallback for Capacitor/www builds
        const filename = path.split('/').pop();
        audio.src = withCacheBust('./assets/' + filename);
        audio.load();
      }
    };

    audio.load();
    this._allAudioElements.push(audio);
    return audio;
  }

  /**
   * Get shared AudioContext from AudioManager.
   */
  _getContext() {
    if (window.audioManager && window.audioManager.audioContext) {
      return window.audioManager.audioContext;
    }
    return null;
  }

  unlock() {
    // Resume shared AudioContext
    const ctx = this._getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Pre-warm HTML5 Audio elements on first gesture
    if (!this._unlocked) {
      this._unlocked = true;
      this._allAudioElements.forEach(audio => {
        try {
          audio.volume = 0;
          const p = audio.play();
          if (p !== undefined) {
            p.then(() => {
              audio.pause();
              audio.currentTime = 0;
              audio.volume = 1.0;
            }).catch(() => {
              audio.volume = 1.0;
            });
          } else {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 1.0;
          }
        } catch (e) {
          audio.volume = 1.0;
        }
      });
    }
  }

  // ─── Comical Panic Voice Scream when Kenan is extremely close (<130px) ───
  playPanicVoice() {
    const ctx = this._getContext();
    if (!ctx) return;

    const now = performance.now();
    if (now - this.lastPanicTime < 2500) return;
    this.lastPanicTime = now;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(750, ctx.currentTime + 0.15);
      osc.frequency.linearRampToValueAtTime(350, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  // ─── Dash Skill Burst SFX ───
  playDashSound() {
    const ctx = this._getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }

  // ─── Banana Slip Whistle SFX ───
  playBananaSlipSound() {
    const ctx = this._getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  // ─── Teleport Warp SFX ───
  playTeleportSound() {
    const ctx = this._getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  // ─── Door Break Wood Crunch SFX ───
  playDoorBreakSound() {
    const ctx = this._getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.setValueAtTime(90, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  // ─── Giant Kenan Boss Hit SFX ───
  playBossHitSound() {
    if (this.hitAudio) {
      try { this.hitAudio.currentTime = 0; } catch (e) {}
      const p = this.hitAudio.play();
      if (p !== undefined) {
        p.catch(() => this.playSynthBossHit());
      }
    } else {
      this.playSynthBossHit();
    }
  }

  playSynthBossHit() {
    const ctx = this._getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  // ─── Giant Kenan Boss Death SFX ───
  playBossDeadSound() {
    if (this.deadAudio) {
      try { this.deadAudio.currentTime = 0; } catch (e) {}
      const p = this.deadAudio.play();
      if (p !== undefined) {
        p.catch(() => this.playSynthBossDead());
      }
    } else {
      this.playSynthBossDead();
    }
  }

  playSynthBossDead() {
    const ctx = this._getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.2);

      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {}
  }
}

window.soundEffectsManager = new SoundEffectsManager();
