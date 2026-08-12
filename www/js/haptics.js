/**
 * Haptic Feedback & Proximity Vibration Manager for Mobile Devices
 * Uses Web Vibration API (navigator.vibrate)
 */
class HapticsManager {
  constructor() {
    this.hasVibration = 'vibrate' in navigator;
    this.lastPulseTime = 0;
    this.isEnabled = true;
  }

  // Heavy vibration on crash / game over
  triggerImpact() {
    if (!this.hasVibration || !this.isEnabled) return;
    try {
      navigator.vibrate([200, 80, 300, 80, 400]);
    } catch (e) {}
  }

  // Light vibration on powerup pickup or UI tap
  triggerTac() {
    if (!this.hasVibration || !this.isEnabled) return;
    try {
      navigator.vibrate(40);
    } catch (e) {}
  }

  // Update proximity vibration based on distance between Kenan and player
  updateProximity(distance, maxDistance, now) {
    if (!this.hasVibration || !this.isEnabled) return;

    const normDist = Math.min(Math.max(distance / maxDistance, 0), 1);
    
    // Only vibrate if Kenan is reasonably close (distance ratio < 0.6)
    if (normDist > 0.6) return;

    // Pulse interval scales from 600ms (far) down to 100ms (very close)
    const pulseInterval = 100 + normDist * 800;

    if (now - this.lastPulseTime > pulseInterval) {
      this.lastPulseTime = now;
      // Pulse duration scales from 15ms up to 60ms
      const duration = Math.round(60 - normDist * 40);
      try {
        navigator.vibrate(duration);
      } catch (e) {}
    }
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
  }
}

window.hapticsManager = new HapticsManager();
