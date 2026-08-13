/**
 * Audio Manager for Monster Kenan Game — Hybrid Mobile-First Engine
 * Uses HTML5 Audio (instant, reliable) + Web Audio API synth fallback.
 * All audio elements are pre-warmed on first user gesture for Android/Capacitor.
 */

// ─── Sound File Paths ───
const VOICE_FILES = {
  voice_warak:   './voice_warak.mp3',
  voice_ray7:    './voice_ray7.mp3',
  voice_jwal:    './voice_jwal.mp3',
  voice_mafer:   './voice_mafer.mp3',
  voice_jayak:   './voice_jayak.mp3',
  voice_wagaf:   './voice_wagaf.mp3',
  voice_assabt:  './voice_assabt.mp3',
  voice_sadtak:  './voice_sadtak.mp3',
  voice_akaltak: './voice_akaltak.mp3',
  w7sh:          './w7sh.mp3',
  aseel_1:       './assets/aseel_1.mp3',
  aseel_2:       './assets/aseel_2.mp3',
  aseel_3:       './assets/aseel_3.mp3',
  elias_1:       './assets/elias_1.mp3',
  elias_2:       './assets/elias_2.mp3',
  elias_3:       './assets/elias_3.mp3',
  qamar_1:       './assets/qamar_1.mp3',
  qamar_2:       './assets/qamar_2.mp3',
  qamar_3:       './assets/qamar_3.mp3'
};

// Asset folder fallback paths (for Capacitor www builds)
const ASSET_VOICE_FILES = {
  voice_warak:   './assets/voice_warak.mp3',
  voice_ray7:    './assets/voice_ray7.mp3',
  voice_jwal:    './assets/voice_jwal.mp3',
  voice_mafer:   './assets/voice_mafer.mp3',
  voice_jayak:   './assets/voice_jayak.mp3',
  voice_wagaf:   './assets/voice_wagaf.mp3',
  voice_assabt:  './assets/voice_assabt.mp3',
  voice_sadtak:  './assets/voice_sadtak.mp3',
  voice_akaltak: './assets/voice_akaltak.mp3',
  w7sh:          './assets/w7sh.mp3',
  aseel_1:       './assets/aseel_1.mp3',
  aseel_2:       './assets/aseel_2.mp3',
  aseel_3:       './assets/aseel_3.mp3',
  elias_1:       './assets/elias_1.mp3',
  elias_2:       './assets/elias_2.mp3',
  elias_3:       './assets/elias_3.mp3',
  qamar_1:       './assets/qamar_1.mp3',
  qamar_2:       './assets/qamar_2.mp3',
  qamar_3:       './assets/qamar_3.mp3'
};

class AudioManager {
  constructor() {
    this.audioContext = null;
    this.isMuted = false;
    this.isPlayingChase = false;
    this.isLoaded = false;
    this._unlocked = false;

    // Volume state
    this.baseVolume = 1.0;
    this.voiceDuckingMultiplier = 1.0;

    // HTML5 Audio elements
    this.chaseAudio = null;
    this.impactAudio = null;
    this.voiceAudioMap = {};
    this.currentVoiceAudio = null;

    // All audio elements for bulk unlock
    this._allAudioElements = [];

    // Synth fallback state
    this.synthOscillator = null;
    this.synthGain = null;
    this.isUsingSynth = false;

    this._init();
  }

  _init() {
    // Create shared AudioContext
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    } catch (e) {}

    // Create & preload monster chase loops
    this.chaseAudioMap = {
      kenan: this._createAudio('./3ooo.mp3', true),
      elias: this._createAudio('./assets/3oo.elias.mp3', true),
      qamar: this._createAudio('./assets/3oo.qamar.mp3', true)
    };
    for (const audio of Object.values(this.chaseAudioMap)) {
      audio.loop = true;
    }
    this.activeChaseAudio = null;

    // Create & preload impact audio
    this.impactAudio = this._createAudio('./w7sh.mp3', true);

    // Create & preload all voice clips
    for (const [key, path] of Object.entries(VOICE_FILES)) {
      this.voiceAudioMap[key] = this._createAudio(path, true);
    }

    this.isLoaded = true;
  }

  /**
   * Create an Audio element with preload, dynamic cache-busting timestamp, multiple fallback paths, and tracking.
   */
  _createAudio(path, addToPool = true) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio._originalPath = path;
    audio._fallbackIndex = 0;

    const filename = path.split('/').pop();
    const possiblePaths = [
      path,
      './assets/' + filename,
      './' + filename,
      'assets/' + filename,
      filename
    ];

    const withCacheBust = (p) => p + (p.includes('?') ? '&' : '?') + 't=' + Date.now();

    audio.src = withCacheBust(possiblePaths[0]);

    audio.onerror = () => {
      audio._fallbackIndex = (audio._fallbackIndex || 0) + 1;
      if (audio._fallbackIndex < possiblePaths.length) {
        audio.src = withCacheBust(possiblePaths[audio._fallbackIndex]);
        audio.load();
      }
    };

    audio.load();

    if (addToPool) {
      this._allAudioElements.push(audio);
    }

    return audio;
  }

  /**
   * Unlock all audio on first user gesture.
   * On Android/iOS, audio elements must receive a play() call inside a user gesture
   * before they can play programmatically later.
   */
  unlockAudio() {
    // Resume AudioContext
    if (!this.audioContext) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      } catch (e) {}
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    // Pre-warm all Audio elements (only once)
    if (!this._unlocked) {
      this._unlocked = true;
      this._allAudioElements.forEach(audio => {
        try {
          audio.volume = 0;
          const p = audio.play();
          if (p !== undefined) {
            p.then(() => {
              // NEVER pause if this audio was started as the active chase music!
              if (this.isPlayingChase && audio === this.activeChaseAudio) {
                audio.volume = Math.max(0, Math.min(1, this.baseVolume * this.voiceDuckingMultiplier));
                return;
              }
              audio.pause();
              audio.currentTime = 0;
              audio.volume = 1.0;
            }).catch(() => {
              audio.volume = 1.0;
            });
          } else {
            if (!this.isPlayingChase || audio !== this.activeChaseAudio) {
              audio.pause();
              audio.currentTime = 0;
            }
            audio.volume = 1.0;
          }
        } catch (e) {
          audio.volume = 1.0;
        }
      });
    }

    // Share unlock with SoundEffectsManager
    if (window.soundEffectsManager) {
      window.soundEffectsManager.unlock();
    }
  }

  // ─── Chase Music (looping background) ───
  startChase(monsterType = 'kenan') {
    if (this.isMuted) return;
    this.unlockAudio();
    this.isPlayingChase = true;
    this.currentChaseMonster = monsterType;

    this.stopChaseLoopOnly();

    let targetAudio = null;
    const m = (monsterType || 'kenan').toLowerCase();
    if (m === 'kenan' || m === 'all') {
      targetAudio = this.chaseAudioMap.kenan;
    } else if (m === 'elias') {
      targetAudio = this.chaseAudioMap.elias;
    } else if (m === 'qamar') {
      targetAudio = this.chaseAudioMap.qamar;
    }

    if (targetAudio) {
      this.activeChaseAudio = targetAudio;
      try {
        targetAudio.currentTime = 0;
        targetAudio.playbackRate = 1.0;
        this.applyCurrentVolume();
        const p = targetAudio.play();
        if (p !== undefined) {
          p.catch(err => {
            console.warn('[AudioManager] Chase play failed on first attempt, retrying:', err.message);
            targetAudio.load();
            targetAudio.play().catch(() => this.startSynthChase());
          });
        }
      } catch (e) {
        this.startSynthChase();
      }
    } else {
      // For monsters without a loop (e.g. Aseel), keep clean without 3ooo sound
      this.activeChaseAudio = null;
      this.stopSynthChase();
    }
  }

  stopChaseLoopOnly() {
    if (this.chaseAudioMap) {
      for (const audio of Object.values(this.chaseAudioMap)) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {}
      }
    }
    this.activeChaseAudio = null;
    this.stopSynthChase();
  }

  stopChase() {
    this.isPlayingChase = false;
    this.stopCurrentVoice();
    this.stopChaseLoopOnly();
  }

  // ─── Voice Clips (with 70% background ducking) ───
  playVoice(voiceKey) {
    if (this.isMuted) return;
    this.unlockAudio();

    // Stop any currently playing voice
    this.stopCurrentVoice();

    const voiceAudio = this.voiceAudioMap[voiceKey];
    if (!voiceAudio) return;

    this.currentVoiceAudio = voiceAudio;
    try {
      voiceAudio.currentTime = 0;
      voiceAudio.volume = 1.0;
    } catch (e) {}

    // Duck background chase volume to 30%
    this.voiceDuckingMultiplier = 0.3;
    this.applyCurrentVolume();

    const onVoiceEnd = () => {
      if (this.currentVoiceAudio === voiceAudio) {
        this.voiceDuckingMultiplier = 1.0;
        this.applyCurrentVolume();
        this.currentVoiceAudio = null;
      }
    };

    voiceAudio.onended = onVoiceEnd;

    const p = voiceAudio.play();
    if (p !== undefined) {
      p.catch(err => {
        console.warn(`[AudioManager] Voice play failed for ${voiceKey}:`, err.message);
        onVoiceEnd();
      });
    }
  }

  playMonsterVoice(monsterType) {
    if (monsterType === 'kenan') {
      const keys = ['voice_warak', 'voice_ray7', 'voice_jwal', 'voice_mafer', 'voice_jayak', 'voice_wagaf'];
      this.playVoice(keys[Math.floor(Math.random() * keys.length)]);
    } else if (monsterType === 'aseel') {
      const keys = ['aseel_1', 'aseel_2', 'aseel_3'];
      this.playVoice(keys[Math.floor(Math.random() * keys.length)]);
    } else if (monsterType === 'elias') {
      const keys = ['elias_1', 'elias_2', 'elias_3'];
      this.playVoice(keys[Math.floor(Math.random() * keys.length)]);
    } else if (monsterType === 'qamar') {
      const keys = ['qamar_1', 'qamar_2', 'qamar_3'];
      this.playVoice(keys[Math.floor(Math.random() * keys.length)]);
    }
  }

  stopCurrentVoice() {
    if (this.currentVoiceAudio) {
      try {
        this.currentVoiceAudio.pause();
        this.currentVoiceAudio.currentTime = 0;
        this.currentVoiceAudio.onended = null;
      } catch (e) {}
      this.currentVoiceAudio = null;
    }
    this.voiceDuckingMultiplier = 1.0;
    this.applyCurrentVolume();
  }

  // ─── Impact SFX ───
  playImpact() {
    this.stopChase();
    if (this.isMuted) return;
    this.unlockAudio();

    if (this.impactAudio) {
      try {
        this.impactAudio.currentTime = 0;
        this.impactAudio.volume = 1.0;
      } catch (e) {}
      const p = this.impactAudio.play();
      if (p !== undefined) {
        p.catch(err => {
          console.warn('[AudioManager] Impact play failed, using synth:', err.message);
          this.playSynthImpact();
        });
      }
    } else {
      this.playSynthImpact();
    }
  }

  // ─── Volume Control ───
  applyCurrentVolume() {
    const finalVolume = Math.max(0, Math.min(1, this.baseVolume * this.voiceDuckingMultiplier));
    if (this.activeChaseAudio) {
      try { this.activeChaseAudio.volume = finalVolume; } catch (e) {}
    }
    if (this.isUsingSynth && this.synthGain && this.audioContext) {
      try { this.synthGain.gain.setValueAtTime(finalVolume * 0.3, this.audioContext.currentTime); } catch (e) {}
    }
  }

  // ─── Proximity-based dynamic volume & pitch ───
  updateProximity(distance, maxDistance, isRage = false) {
    if (this.isMuted || !this.isPlayingChase) return;

    const normDist = Math.min(Math.max(distance / maxDistance, 0), 1);
    this.baseVolume = Math.max(0.1, 1.0 - normDist * 0.85);
    this.applyCurrentVolume();

    if (this.activeChaseAudio) {
      try { this.activeChaseAudio.playbackRate = isRage ? 1.25 : 1.0; } catch (e) {}
    }

    if (this.isUsingSynth && this.synthGain && this.synthOscillator && this.audioContext) {
      const freq = 120 + (1 - normDist) * 180 + (isRage ? 60 : 0);
      try { this.synthOscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime); } catch (e) {}
    }
  }

  // ─── Synth Fallbacks ───
  startSynthChase() {
    if (this.isUsingSynth) return;
    if (!this.audioContext) return;
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      this.synthOscillator = this.audioContext.createOscillator();
      this.synthGain = this.audioContext.createGain();

      this.synthOscillator.type = 'sawtooth';
      this.synthOscillator.frequency.value = 140;
      this.synthGain.gain.value = 0.2;

      this.synthOscillator.connect(this.synthGain);
      this.synthGain.connect(this.audioContext.destination);

      this.synthOscillator.start();
      this.isUsingSynth = true;
      this.isPlayingChase = true;
    } catch (e) {
      console.warn('[AudioManager] Synth start error:', e);
    }
  }

  stopSynthChase() {
    if (this.synthOscillator) {
      try {
        this.synthOscillator.stop();
        this.synthOscillator.disconnect();
      } catch (e) {}
      this.synthOscillator = null;
    }
    this.isUsingSynth = false;
  }

  playSynthImpact() {
    if (!this.audioContext) return;
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(300, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);

      gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.5);
    } catch (e) {}
  }

  // ─── Mute Toggle ───
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopCurrentVoice();
      if (this.chaseAudio) { try { this.chaseAudio.pause(); } catch (e) {} }
      this.stopSynthChase();
    } else if (this.isPlayingChase) {
      if (this.chaseAudio) { try { this.chaseAudio.play(); } catch (e) {} }
    }
    return this.isMuted;
  }
}

window.audioManager = new AudioManager();

// ─── Global user interaction listener to unlock audio ───
const globalAudioUnlocker = () => {
  if (window.audioManager) {
    window.audioManager.unlockAudio();
  }
  if (window.soundEffectsManager) {
    window.soundEffectsManager.unlock();
  }
};

['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'].forEach(evt => {
  window.addEventListener(evt, globalAudioUnlocker, { passive: true });
});
