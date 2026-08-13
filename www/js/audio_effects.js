/**
 * Sound Effects & Voice Synthesizer for Monster Kenan Expansion
 * Shares AudioContext from AudioManager. Uses preloaded AudioBuffers for kenan_hit & kenan_dead.
 * All other SFX use Web Audio API oscillator synthesis (zero-latency, Android compatible).
 */
class SoundEffectsManager {
  constructor() {
    this.lastPanicTime = 0;
  }

  /**
   * Get shared AudioContext from AudioManager (single context for entire app).
   * Falls back to creating own context if AudioManager not ready yet.
   */
  _getContext() {
    if (window.audioManager && window.audioManager.audioContext) {
      return window.audioManager.audioContext;
    }
    return null;
  }

  /**
   * Get the master gain node from AudioManager for routing.
   */
  _getDestination() {
    if (window.audioManager && window.audioManager.masterGain) {
      return window.audioManager.masterGain;
    }
    const ctx = this._getContext();
    return ctx ? ctx.destination : null;
  }

  unlock() {
    // AudioContext resumption is handled by AudioManager.unlockAudio()
    if (window.audioManager) {
      // Ensure context exists
      if (!window.audioManager.audioContext) {
        window.audioManager._initContext();
      }
      if (window.audioManager.audioContext && window.audioManager.audioContext.state === 'suspended') {
        window.audioManager.audioContext.resume().catch(() => {});
      }
    }
  }

  // ─── Comical Panic Voice Scream when Kenan is extremely close (<130px) ───
  playPanicVoice() {
    this.unlock();
    const ctx = this._getContext();
    const dest = this._getDestination();
    if (!ctx || !dest) return;

    const now = performance.now();
    if (now - this.lastPanicTime < 2500) return; // Cooldown between screams
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
      gain.connect(dest);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  // ─── Dash Skill Burst SFX ───
  playDashSound() {
    this.unlock();
    const ctx = this._getContext();
    const dest = this._getDestination();
    if (!ctx || !dest) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(dest);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }

  // ─── Banana Slip Whistle SFX ───
  playBananaSlipSound() {
    this.unlock();
    const ctx = this._getContext();
    const dest = this._getDestination();
    if (!ctx || !dest) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(dest);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  // ─── Teleport Warp SFX ───
  playTeleportSound() {
    this.unlock();
    const ctx = this._getContext();
    const dest = this._getDestination();
    if (!ctx || !dest) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(dest);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  // ─── Door Break Wood Crunch SFX ───
  playDoorBreakSound() {
    this.unlock();
    const ctx = this._getContext();
    const dest = this._getDestination();
    if (!ctx || !dest) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.setValueAtTime(90, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(dest);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  // ─── Giant Kenan Boss Hit SFX (preloaded kenan_hit buffer or synth fallback) ───
  playBossHitSound() {
    this.unlock();
    // Try preloaded buffer from AudioManager
    if (window.audioManager && window.audioManager.buffers.kenan_hit) {
      const result = window.audioManager._playBuffer('kenan_hit', { volume: 1.0 });
      if (result) return;
    }
    this.playSynthBossHit();
  }

  playSynthBossHit() {
    this.unlock();
    const ctx = this._getContext();
    const dest = this._getDestination();
    if (!ctx || !dest) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(dest);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  // ─── Giant Kenan Boss Death SFX (preloaded kenan_dead buffer or synth fallback) ───
  playBossDeadSound() {
    this.unlock();
    // Try preloaded buffer from AudioManager
    if (window.audioManager && window.audioManager.buffers.kenan_dead) {
      const result = window.audioManager._playBuffer('kenan_dead', { volume: 1.0 });
      if (result) return;
    }
    this.playSynthBossDead();
  }

  playSynthBossDead() {
    this.unlock();
    const ctx = this._getContext();
    const dest = this._getDestination();
    if (!ctx || !dest) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.2);

      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(dest);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {}
  }
}

window.soundEffectsManager = new SoundEffectsManager();
