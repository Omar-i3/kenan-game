/**
 * Audio Manager for Monster Kenan Game
 * Handles Proximity Chase Audio (3ooo.mp3), Impact SFX (w7sh.mp3), Voice Clips Mapping, Volume Ducking & Fallback Synth
 */
const VOICE_FILES = {
  voice_warak: './voice_warak.mp3',
  voice_ray7: './voice_ray7.mp3',
  voice_jwal: './voice_jwal.mp3',
  voice_mafer: './voice_mafer.mp3',
  voice_jayak: './voice_jayak.mp3',
  voice_wagaf: './voice_wagaf.mp3',
  voice_assabt: './voice_assabt.mp3',
  voice_sadtak: './voice_sadtak.mp3',
  voice_akaltak: './voice_akaltak.mp3'
};

class AudioManager {
  constructor() {
    this.audioContext = null;
    this.chaseAudio = null;
    this.impactAudio = null;
    this.chaseGainNode = null;
    this.isMuted = false;
    this.isPlayingChase = false;
    this.isLoaded = false;

    this.baseVolume = 1.0;
    this.voiceDuckingMultiplier = 1.0;
    this.currentVoiceAudio = null;
    this.voiceAudioMap = {};

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

      // Load HTML5 Audio elements with relative paths and instant load
      this.chaseAudio = new Audio('./3ooo.mp3');
      this.chaseAudio.loop = true;
      this.chaseAudio.preload = 'auto';
      this.chaseAudio.load();

      this.impactAudio = new Audio('./w7sh.mp3');
      this.impactAudio.preload = 'auto';
      this.impactAudio.load();

      // Preload all voice clips instantly
      for (const [key, path] of Object.entries(VOICE_FILES)) {
        const aud = new Audio(path);
        aud.preload = 'auto';
        aud.load();
        this.voiceAudioMap[key] = aud;
      }

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
      this.audioContext.resume().catch(() => {});
    }

    // Force warm up preloading audio elements on touch/click
    if (this.chaseAudio && this.chaseAudio.readyState < 2) {
      this.chaseAudio.load();
    }
    if (this.impactAudio && this.impactAudio.readyState < 2) {
      this.impactAudio.load();
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

  // Play voice clip with zero latency & 70% background audio ducking
  playVoice(voiceKey) {
    if (this.isMuted) return;
    this.unlockAudio();

    // 1. Stop any currently playing voice audio clip immediately
    this.stopCurrentVoice();

    const voiceAudio = this.voiceAudioMap[voiceKey];
    if (!voiceAudio) return;

    this.currentVoiceAudio = voiceAudio;
    this.currentVoiceAudio.currentTime = 0;

    // 2. Reduce background chase volume by 70% (voiceDuckingMultiplier = 0.3)
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
    voiceAudio.onerror = onVoiceEnd;

    const playPromise = voiceAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn(`Voice play failed for ${voiceKey}:`, err);
        onVoiceEnd();
      });
    }
  }

  stopCurrentVoice() {
    if (this.currentVoiceAudio) {
      try {
        this.currentVoiceAudio.pause();
        this.currentVoiceAudio.currentTime = 0;
        this.currentVoiceAudio.onended = null;
        this.currentVoiceAudio.onerror = null;
      } catch (e) {}
      this.currentVoiceAudio = null;
    }
    // Restore ducking multiplier
    this.voiceDuckingMultiplier = 1.0;
    this.applyCurrentVolume();
  }

  applyCurrentVolume() {
    const finalVolume = this.baseVolume * this.voiceDuckingMultiplier;
    if (this.chaseGainNode) {
      this.chaseGainNode.gain.setTargetAtTime(finalVolume, this.audioContext.currentTime, 0.05);
    } else if (this.chaseAudio) {
      this.chaseAudio.volume = finalVolume;
    }
  }

  // Dynamic proximity volume & pitch update
  updateProximity(distance, maxDistance, isRage = false) {
    if (this.isMuted || !this.isPlayingChase) return;

    const normDist = Math.min(Math.max(distance / maxDistance, 0), 1);
    this.baseVolume = Math.max(0.1, 1.0 - normDist * 0.85);

    this.applyCurrentVolume();

    if (this.chaseAudio) {
      this.chaseAudio.playbackRate = isRage ? 1.25 : 1.0;
    }

    if (this.isUsingSynth && this.synthGain) {
      const finalVol = this.baseVolume * this.voiceDuckingMultiplier;
      this.synthGain.gain.setValueAtTime(finalVol * 0.3, this.audioContext.currentTime);
      if (this.synthOscillator) {
        const freq = 120 + (1 - normDist) * 180 + (isRage ? 60 : 0);
        this.synthOscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      }
    }
  }

  stopChase() {
    this.isPlayingChase = false;
    this.stopCurrentVoice();
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
      this.stopCurrentVoice();
      if (this.chaseAudio) this.chaseAudio.pause();
      this.stopSynthChase();
    } else if (this.isPlayingChase) {
      if (this.chaseAudio) this.chaseAudio.play();
    }
    return this.isMuted;
  }
}

window.audioManager = new AudioManager();
