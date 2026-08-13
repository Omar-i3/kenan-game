/**
 * Audio Manager for Monster Kenan Game — Mobile-First Web Audio API Engine
 * Uses AudioBuffer preloading for zero-latency, Capacitor/Android compatible playback.
 * No HTML5 Audio elements — all sounds decoded into Web Audio API buffers.
 */

// ─── Sound Manifest ───
const SOUND_MANIFEST = {
  chase:          './3ooo.mp3',
  impact:         './w7sh.mp3',
  voice_warak:    './voice_warak.mp3',
  voice_ray7:     './voice_ray7.mp3',
  voice_jwal:     './voice_jwal.mp3',
  voice_mafer:    './voice_mafer.mp3',
  voice_jayak:    './voice_jayak.mp3',
  voice_wagaf:    './voice_wagaf.mp3',
  voice_assabt:   './voice_assabt.mp3',
  voice_sadtak:   './voice_sadtak.mp3',
  voice_akaltak:  './voice_akaltak.mp3',
  kenan_hit:      './kenan_hit.mp3',
  kenan_dead:     './kenan_dead.mp3'
};

// Fallback paths (try ./assets/ if root fails)
const ASSET_FALLBACK_PREFIX = './assets/';

class AudioManager {
  constructor() {
    this.audioContext = null;
    this.isMuted = false;
    this.isPlayingChase = false;
    this.isLoaded = false;

    // AudioBuffer cache: key → AudioBuffer
    this.buffers = {};

    // Active source nodes for stoppable sounds
    this.chaseSource = null;
    this.chaseGain = null;
    this.currentVoiceSource = null;
    this.currentVoiceGain = null;

    // Master gain
    this.masterGain = null;

    // Volume state
    this.baseVolume = 1.0;
    this.voiceDuckingMultiplier = 1.0;

    // Synth fallback state (if all preloading fails)
    this.synthOscillator = null;
    this.synthGain = null;
    this.isUsingSynth = false;

    // Chase playback rate
    this._chasePlaybackRate = 1.0;

    this._initContext();
  }

  _initContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
      }
    } catch (err) {
      console.warn('[AudioManager] AudioContext init failed:', err);
    }
  }

  /**
   * Preload all sounds from SOUND_MANIFEST into AudioBuffers.
   * Call once on first user interaction or at game start.
   * Returns a Promise that resolves when all sounds are loaded (or failed gracefully).
   */
  async preloadSounds() {
    if (this.isLoaded) return;
    this.unlockAudio();

    if (!this.audioContext) {
      console.warn('[AudioManager] No AudioContext — cannot preload');
      return;
    }

    const loadPromises = Object.entries(SOUND_MANIFEST).map(async ([key, path]) => {
      try {
        let buffer = await this._fetchAndDecode(path);
        if (!buffer) {
          // Try fallback path
          const fallbackPath = ASSET_FALLBACK_PREFIX + path.replace('./', '');
          buffer = await this._fetchAndDecode(fallbackPath);
        }
        if (buffer) {
          this.buffers[key] = buffer;
        } else {
          console.warn(`[AudioManager] Failed to load sound: ${key}`);
        }
      } catch (err) {
        console.warn(`[AudioManager] Error loading ${key}:`, err);
      }
    });

    await Promise.all(loadPromises);
    this.isLoaded = true;
    console.log(`[AudioManager] Preloaded ${Object.keys(this.buffers).length}/${Object.keys(SOUND_MANIFEST).length} sounds`);
  }

  /**
   * Fetch an audio file and decode it into an AudioBuffer.
   * Returns null on failure (no throw).
   */
  async _fetchAndDecode(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (e) {
      return null;
    }
  }

  /**
   * Play a preloaded buffer by key. Returns the source node (or null).
   * Options: loop, volume, playbackRate
   */
  _playBuffer(key, { loop = false, volume = 1.0, playbackRate = 1.0 } = {}) {
    if (this.isMuted || !this.audioContext || !this.buffers[key]) return null;

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = this.buffers[key];
      source.loop = loop;
      source.playbackRate.value = playbackRate;
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.masterGain);

      source.start(0);
      return { source, gainNode };
    } catch (e) {
      console.warn(`[AudioManager] Playback error for ${key}:`, e);
      return null;
    }
  }

  // ─── Ensure AudioContext is resumed after user interaction ───
  unlockAudio() {
    if (!this.audioContext) {
      this._initContext();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    // Trigger preload on first unlock if not yet loaded
    if (!this.isLoaded && !this._preloadStarted) {
      this._preloadStarted = true;
      this.preloadSounds();
    }
    // Share context with SoundEffectsManager
    if (window.soundEffectsManager) {
      window.soundEffectsManager.unlock();
    }
  }

  // ─── Chase Music (looping background) ───
  startChase() {
    if (this.isMuted) return;
    this.unlockAudio();
    this.isPlayingChase = true;

    // Stop any existing chase
    this._stopChaseSource();

    if (this.buffers.chase) {
      const result = this._playBuffer('chase', {
        loop: true,
        volume: this.baseVolume * this.voiceDuckingMultiplier,
        playbackRate: this._chasePlaybackRate
      });
      if (result) {
        this.chaseSource = result.source;
        this.chaseGain = result.gainNode;
      } else {
        this.startSynthChase();
      }
    } else {
      this.startSynthChase();
    }
  }

  _stopChaseSource() {
    if (this.chaseSource) {
      try {
        this.chaseSource.stop();
        this.chaseSource.disconnect();
      } catch (e) {}
      this.chaseSource = null;
    }
    if (this.chaseGain) {
      try { this.chaseGain.disconnect(); } catch (e) {}
      this.chaseGain = null;
    }
  }

  stopChase() {
    this.isPlayingChase = false;
    this.stopCurrentVoice();
    this._stopChaseSource();
    this.stopSynthChase();
  }

  // ─── Voice Clips (with 70% background ducking) ───
  playVoice(voiceKey) {
    if (this.isMuted) return;
    this.unlockAudio();

    // Stop any currently playing voice
    this.stopCurrentVoice();

    if (!this.buffers[voiceKey]) return;

    // Duck background volume to 30%
    this.voiceDuckingMultiplier = 0.3;
    this.applyCurrentVolume();

    const result = this._playBuffer(voiceKey, { volume: 1.0 });
    if (result) {
      this.currentVoiceSource = result.source;
      this.currentVoiceGain = result.gainNode;

      result.source.onended = () => {
        if (this.currentVoiceSource === result.source) {
          this.voiceDuckingMultiplier = 1.0;
          this.applyCurrentVolume();
          this.currentVoiceSource = null;
          this.currentVoiceGain = null;
        }
      };
    } else {
      // Restore ducking if play failed
      this.voiceDuckingMultiplier = 1.0;
      this.applyCurrentVolume();
    }
  }

  stopCurrentVoice() {
    if (this.currentVoiceSource) {
      try {
        this.currentVoiceSource.onended = null;
        this.currentVoiceSource.stop();
        this.currentVoiceSource.disconnect();
      } catch (e) {}
      this.currentVoiceSource = null;
    }
    if (this.currentVoiceGain) {
      try { this.currentVoiceGain.disconnect(); } catch (e) {}
      this.currentVoiceGain = null;
    }
    this.voiceDuckingMultiplier = 1.0;
    this.applyCurrentVolume();
  }

  // ─── Impact SFX ───
  playImpact() {
    this.stopChase();
    if (this.isMuted) return;
    this.unlockAudio();

    if (this.buffers.impact) {
      this._playBuffer('impact', { volume: 1.0 });
    } else {
      this.playSynthImpact();
    }
  }

  // ─── Volume Control ───
  applyCurrentVolume() {
    const finalVolume = Math.max(0, Math.min(1, this.baseVolume * this.voiceDuckingMultiplier));

    if (this.chaseGain && this.audioContext) {
      try {
        this.chaseGain.gain.setTargetAtTime(finalVolume, this.audioContext.currentTime, 0.05);
      } catch (e) {}
    }

    if (this.isUsingSynth && this.synthGain && this.audioContext) {
      this.synthGain.gain.setValueAtTime(finalVolume * 0.3, this.audioContext.currentTime);
    }
  }

  // ─── Proximity-based dynamic volume & pitch ───
  updateProximity(distance, maxDistance, isRage = false) {
    if (this.isMuted || !this.isPlayingChase) return;

    const normDist = Math.min(Math.max(distance / maxDistance, 0), 1);
    this.baseVolume = Math.max(0.1, 1.0 - normDist * 0.85);
    this._chasePlaybackRate = isRage ? 1.25 : 1.0;

    this.applyCurrentVolume();

    // Update chase playback rate
    if (this.chaseSource) {
      try {
        this.chaseSource.playbackRate.value = this._chasePlaybackRate;
      } catch (e) {}
    }

    // Synth fallback proximity
    if (this.isUsingSynth && this.synthOscillator && this.audioContext) {
      const freq = 120 + (1 - normDist) * 180 + (isRage ? 60 : 0);
      this.synthOscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    }
  }

  // ─── Synth Fallbacks (if mp3 files fail to load entirely) ───
  startSynthChase() {
    if (this.isUsingSynth) return;
    this.unlockAudio();
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
      this.synthGain.connect(this.masterGain);

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
    this.unlockAudio();
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
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.5);
    } catch (e) {}
  }

  // ─── Mute Toggle ───
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopCurrentVoice();
      this._stopChaseSource();
      this.stopSynthChase();
    } else if (this.isPlayingChase) {
      this.startChase();
    }
    return this.isMuted;
  }
}

window.audioManager = new AudioManager();

// ─── Global user interaction listener to unlock audio + trigger preload ───
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
