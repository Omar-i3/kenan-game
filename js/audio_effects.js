/**
 * Sound Effects & Voice Synthesizer for Monster Kenan Expansion
 * Handles Panic Screams, Dash, Banana Slip, Teleport Warp, Door Break, and Boss Hit/Death SFX
 */
class SoundEffectsManager {
  constructor() {
    this.audioCtx = null;
    this.lastPanicTime = 0;
    this.hitAudio = null;
    this.deadAudio = null;
    this.init();
  }

  init() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }

      this.hitAudio = new Audio('./kenan_hit.mp3');
      this.hitAudio.preload = 'auto';
      this.hitAudio.onerror = () => {
        this.hitAudio.src = './assets/kenan_hit.mp3';
        this.hitAudio.load();
      };

      this.deadAudio = new Audio('./kenan_dead.mp3');
      this.deadAudio.preload = 'auto';
      this.deadAudio.onerror = () => {
        this.deadAudio.src = './assets/kenan_dead.mp3';
        this.deadAudio.load();
      };
    } catch (e) {}
  }

  unlock() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Comical Panic Voice Scream when Kenan is extremely close (< 130px)
  playPanicVoice() {
    if (!this.audioCtx) return;
    const now = performance.now();
    if (now - this.lastPanicTime < 2500) return; // Cooldown between screams
    this.lastPanicTime = now;

    this.unlock();
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, this.audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(750, this.audioCtx.currentTime + 0.15);
      osc.frequency.linearRampToValueAtTime(350, this.audioCtx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch (e) {}
  }

  // Dash Skill Burst SFX
  playDashSound() {
    if (!this.audioCtx) return;
    this.unlock();
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.2);
    } catch (e) {}
  }

  // Banana Slip Whistle SFX
  playBananaSlipSound() {
    if (!this.audioCtx) return;
    this.unlock();
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch (e) {}
  }

  // Teleport Warp SFX
  playTeleportSound() {
    if (!this.audioCtx) return;
    this.unlock();
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.audioCtx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.3);
    } catch (e) {}
  }

  // Door Break Wood Crunch SFX
  playDoorBreakSound() {
    if (!this.audioCtx) return;
    this.unlock();
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.audioCtx.currentTime);
      osc.frequency.setValueAtTime(90, this.audioCtx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.3);
    } catch (e) {}
  }

  // Giant Kenan Boss Hit SFX (kenan_hit.mp3 or synth fallback)
  playBossHitSound() {
    this.unlock();
    if (this.hitAudio) {
      this.hitAudio.currentTime = 0;
      this.hitAudio.play().catch(() => this.playSynthBossHit());
    } else {
      this.playSynthBossHit();
    }
  }

  playSynthBossHit() {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.6, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.25);
    } catch (e) {}
  }

  // Giant Kenan Boss Death SFX (kenan_dead.mp3 or synth fallback)
  playBossDeadSound() {
    this.unlock();
    if (this.deadAudio) {
      this.deadAudio.currentTime = 0;
      this.deadAudio.play().catch(() => this.playSynthBossDead());
    } else {
      this.playSynthBossDead();
    }
  }

  playSynthBossDead() {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.audioCtx.currentTime + 1.2);

      gain.gain.setValueAtTime(0.8, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 1.2);
    } catch (e) {}
  }
}

window.soundEffectsManager = new SoundEffectsManager();
