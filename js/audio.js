/**
 * Audio Manager for Monster Kenan Game
 * Handles Proximity Chase Audio (3ooo.mp3), Impact SFX (w7sh.mp3), Web Audio API Proximity Volume & Fallback Synth
 */
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.chaseAudio = null;
    this.impactAudio = null;
    this.chaseGainNode = null;
    this.isMuted = false;
    this.isPlayingChase = false;
    this.isLoaded = false;
    
    // Synth fallback state
    this.synthOscillator = null;
    this.synthGain = null;
    this.isUsingSynth = false;

    this.init();
  }

  init() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }

      // Load HTML5 Audio elements with relative paths
      this.chaseAudio = new Audio('./3ooo.mp3');
      this.chaseAudio.loop = true;
      this.chaseAudio.preload = 'auto';

      this.impactAudio = new Audio('./w7sh.mp3');
      this.impactAudio.preload = 'auto';

      // Connect chase audio to Web Audio API gain node if supported
      if (this.audioContext && this.chaseAudio) {
        try {
          const source = this.audioContext.createMediaElementSource(this.chaseAudio);
          this.chaseGainNode = this.audioContext.createGain();
          source.connect(this.chaseGainNode);
          this.chaseGainNode.connect(this.audioContext.destination);
        } catch (e) {
          console.warn('MediaElementSource fallback:', e);
        }
      }

      this.isLoaded = true;
    } catch (err) {
      console.warn('Audio Init error, using fallback:', err);
    }
  }

  // Ensure AudioContext is resumed after user interaction
  unlockAudio() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  startChase() {
    if (this.isMuted) return;
    this.unlockAudio();

    if (this.chaseAudio) {
      this.chaseAudio.currentTime = 0;
      this.chaseAudio.playbackRate = 1.0;
      const playPromise = this.chaseAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.isPlayingChase = true;
        }).catch(err => {
          console.warn('Chase audio play blocked, enabling synth fallback:', err);
          this.startSynthChase();
        });
      }
    } else {
      this.startSynthChase();
    }
  }

  // Dynamic proximity volume & pitch update
  updateProximity(distance, maxDistance, isRage = false) {
    if (this.isMuted || !this.isPlayingChase) return;

    // Calculate volume: 1.0 when close (0 distance), 0.10 when far (maxDistance)
    const normDist = Math.min(Math.max(distance / maxDistance, 0), 1);
    const volume = Math.max(0.1, 1.0 - normDist * 0.85);

    if (this.chaseGainNode) {
      this.chaseGainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.05);
    } else if (this.chaseAudio) {
      this.chaseAudio.volume = volume;
    }

    // Set playback pitch rate for Rage Mode
    if (this.chaseAudio) {
      this.chaseAudio.playbackRate = isRage ? 1.25 : 1.0;
    }

    // If using fallback synth
    if (this.isUsingSynth && this.synthGain) {
      this.synthGain.gain.setValueAtTime(volume * 0.3, this.audioContext.currentTime);
      if (this.synthOscillator) {
        const freq = 120 + (1 - normDist) * 180 + (isRage ? 60 : 0);
        this.synthOscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      }
    }
  }

  stopChase() {
    this.isPlayingChase = false;
    if (this.chaseAudio) {
      this.chaseAudio.pause();
      this.chaseAudio.currentTime = 0;
    }
    this.stopSynthChase();
  }

  playImpact() {
    this.stopChase();
    if (this.isMuted) return;

    this.unlockAudio();
    if (this.impactAudio) {
      this.impactAudio.currentTime = 0;
      this.impactAudio.play().catch(err => {
        console.warn('Impact play failed, triggering synth sfx:', err);
        this.playSynthImpact();
      });
    } else {
      this.playSynthImpact();
    }
  }

  // Synthesizer Fallbacks
  startSynthChase() {
    if (!this.audioContext || this.isUsingSynth) return;
    try {
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
      console.warn('Synth start error:', e);
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

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.chaseAudio) this.chaseAudio.pause();
      this.stopSynthChase();
    } else if (this.isPlayingChase) {
      if (this.chaseAudio) this.chaseAudio.play();
    }
    return this.isMuted;
  }
}

window.audioManager = new AudioManager();
