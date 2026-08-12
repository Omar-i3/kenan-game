/**
 * Entities & Game Mechanics (Expansion: Enlarged Kenan, Dash, Banana Traps, Speed Boost Pads, Interactive Doors, Night Mode Flashlight)
 */

// Image Preloader for Kenan Sprite (Relative path for GitHub Pages & APK)
const kenanImg = new Image();
kenanImg.src = './kenan.png';
let isKenanImgLoaded = false;
kenanImg.onload = () => { isKenanImgLoaded = true; };

// Floating Meme Quotes List & Voice Mapping
const MEME_VOICE_MAPPING = [
  { text: "وراك وراك!", voice: "voice_warak" },
  { text: "وين رايح؟", voice: "voice_ray7" },
  { text: "هات الجوال!", voice: "voice_jwal" },
  { text: "ما فيه مفر!", voice: "voice_mafer" },
  { text: "أنا جايك عشان أقتلك!", voice: "voice_jayak" },
  { text: "وقّف لا تركض!", voice: "voice_wagaf" }
];

const MEME_QUOTES = MEME_VOICE_MAPPING.map(item => item.text);

// Random Meme Loss Quotes for Game Over Screen
const LOSS_QUOTES = [
  "تم اصطيادك بنجاح!",
  "كنان أخذ حقك!",
  "حاول مرة أخرى قبل لا يصيدك كنان ثاني!",
  "أكلك كنان!",
  "لا تحاول، كنان ما يرحم!",
  "خيرها بغيرها يا كابتن!",
  "سرعتك ما كفت أمام غضب كنان!"
];

/**
 * Particle System
 */
class Particle {
  constructor(x, y, vx, vy, color, size, maxLife) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = maxLife;
    this.maxLife = maxLife;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Player Entity
 */
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 22;
    this.baseSpeed = 260; // px/sec
    this.speedBoostMultiplier = 1.0;
    this.speedBoostTimer = 0;
    this.padSpeedBoostTimer = 0;

    this.angle = 0;
    this.vx = 0;
    this.vy = 0;

    // Dash Skill State
    this.dashCooldown = 0; // 8s max
    this.dashDuration = 0; // 0.35s duration
    this.bananaTraps = 2; // Starts with 2 banana traps
  }

  triggerDash() {
    if (this.dashCooldown <= 0) {
      this.dashCooldown = 8.0;
      this.dashDuration = 0.35;
      window.soundEffectsManager.playDashSound();
      window.hapticsManager.triggerTac();
      return true;
    }
    return false;
  }

  update(dt, inputVector, arenaWidth, arenaHeight, obstacles, doors) {
    // Cooldown updates
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.dashDuration > 0) this.dashDuration -= dt;

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt;
      this.speedBoostMultiplier = 1.5;
    } else if (this.padSpeedBoostTimer > 0) {
      this.padSpeedBoostTimer -= dt;
      this.speedBoostMultiplier = 1.7; // +70% speed from pad
    } else {
      this.speedBoostMultiplier = 1.0;
    }

    let currentSpeed = this.baseSpeed * this.speedBoostMultiplier;

    // Dash burst speed override
    if (this.dashDuration > 0) {
      currentSpeed *= 2.8;
    }

    if (inputVector.x !== 0 || inputVector.y !== 0) {
      this.vx = inputVector.x * currentSpeed;
      this.vy = inputVector.y * currentSpeed;
      this.angle = Math.atan2(inputVector.y, inputVector.x);
    } else {
      // If dashing without joystick movement, dash forward in facing direction
      if (this.dashDuration > 0) {
        this.vx = Math.cos(this.angle) * currentSpeed;
        this.vy = Math.sin(this.angle) * currentSpeed;
      } else {
        this.vx *= 0.8;
        this.vy *= 0.8;
      }
    }

    let nextX = this.x + this.vx * dt;
    let nextY = this.y + this.vy * dt;

    // Obstacle Collisions sliding
    for (const obs of obstacles) {
      const col = obs.checkCollision(nextX, nextY, this.radius);
      if (col.collided) {
        nextX += col.normalX * col.overlap;
        nextY += col.normalY * col.overlap;
      }
    }

    // Door Collisions (Player passes through or closes doors)
    for (const door of doors) {
      if (door.isClosed && !door.isBroken) {
        const col = door.checkCollision(nextX, nextY, this.radius);
        if (col.collided) {
          nextX += col.normalX * col.overlap;
          nextY += col.normalY * col.overlap;
        }
      }
    }

    // Boundary constraints
    this.x = Math.min(Math.max(nextX, this.radius), arenaWidth - this.radius);
    this.y = Math.min(Math.max(nextY, this.radius), arenaHeight - this.radius);
  }

  draw(ctx, particles, isNightMode = false) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Dashing or Speed Trail
    if (this.dashDuration > 0 || this.speedBoostMultiplier > 1.0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.fillStyle = this.dashDuration > 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(0, 255, 136, 0.3)';
      ctx.fill();

      // Emit trail particles
      if (Math.random() < 0.6) {
        particles.push(new Particle(
          this.x + (Math.random() - 0.5) * 12,
          this.y + (Math.random() - 0.5) * 12,
          -this.vx * 0.3,
          -this.vy * 0.3,
          this.dashDuration > 0 ? '#00f0ff' : '#00ff88',
          5,
          0.35
        ));
      }
    }

    ctx.rotate(this.angle);

    // Outer Glow Ring
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 14;

    // Body Circle
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Direction Marker / Cap
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    // Funny Eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(6, -6, 3, 0, Math.PI * 2);
    ctx.arc(6, 6, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw Night Mode Flashlight Conical Beam
  drawFlashlightBeam(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const beamAngle = Math.PI / 3.2; // ~56 degrees cone
    const beamLength = 320;

    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, beamLength);
    grad.addColorStop(0, 'rgba(255, 255, 220, 0.95)');
    grad.addColorStop(0.5, 'rgba(255, 255, 180, 0.6)');
    grad.addColorStop(1, 'rgba(255, 255, 120, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, beamLength, -beamAngle / 2, beamAngle / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Monster Kenan (AI Pursuer - Enlarged 40%!)
 */
class KenanMonster {
  constructor(x, y, difficulty = 'normal') {
    this.x = x;
    this.y = y;
    this.radius = 39; // Scaled up +40% (was 28)
    this.angle = 0;
    this.difficulty = difficulty;

    this.isRage = false;
    this.freezeTimer = 0;
    this.slipTimer = 0; // Banana Slip 2.0s duration
    this.teleportCooldown = 35.0; // Teleport Jump every 35s

    // Difficulty Settings
    this.configureDifficulty();

    // Meme text & voice timer
    this.currentQuote = "وراك وراك!";
    this.memeTimer = 0;
    this.memeInterval = 4.5;
  }

  configureDifficulty() {
    switch (this.difficulty) {
      case 'easy':
        this.baseSpeed = 200;
        this.turnRate = 0.05;
        break;
      case 'hard':
        this.baseSpeed = 310;
        this.turnRate = 0.25;
        break;
      case 'normal':
      default:
        this.baseSpeed = 250;
        this.turnRate = 0.12;
        break;
    }
  }

  setRageMode(active) {
    this.isRage = active;
  }

  freeze(duration = 1.5) {
    this.freezeTimer = duration;
  }

  slipOnBanana() {
    this.slipTimer = 2.0; // Spin & slip for 2.0s
    window.soundEffectsManager.playBananaSlipSound();
  }

  update(dt, playerX, playerY, arenaWidth, arenaHeight, obstacles, doors, particles) {
    // Handle Banana Slip
    if (this.slipTimer > 0) {
      this.slipTimer -= dt;
      this.angle += dt * 15; // Rapid comical spin
      return;
    }

    // Handle Freeze Clock
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      return;
    }

    // Teleport Jump Skill (every 35s)
    this.teleportCooldown -= dt;
    if (this.teleportCooldown <= 0) {
      this.teleportCooldown = 35.0;
      this.triggerTeleportJump(playerX, playerY, arenaWidth, arenaHeight, particles);
    }

    // Meme text update & voice playback mapping
    this.memeTimer += dt;
    if (this.memeTimer >= this.memeInterval) {
      this.memeTimer = 0;
      this.memeInterval = 4.5 + Math.random() * 2.5;
      const item = MEME_VOICE_MAPPING[Math.floor(Math.random() * MEME_VOICE_MAPPING.length)];
      this.currentQuote = item.text;
      if (window.audioManager) {
        window.audioManager.playVoice(item.voice);
      }
    }

    // Speed calculation
    let currentSpeed = this.baseSpeed;
    if (this.isRage) {
      currentSpeed *= 1.35; // +35% speed in Rage Mode
    }

    // Target direction to Player
    let targetDx = playerX - this.x;
    let targetDy = playerY - this.y;
    let targetAngle = Math.atan2(targetDy, targetDx);

    // Obstacle avoidance
    for (const obs of obstacles) {
      const distToObs = Math.hypot(obs.x - this.x, obs.y - this.y);
      if (distToObs < obs.radius + this.radius + 60) {
        const avoidAngle = Math.atan2(this.y - obs.y, this.x - obs.x);
        targetAngle = targetAngle * 0.6 + avoidAngle * 0.4;
      }
    }

    // Smooth Turn Angle Interpolation
    let diffAngle = targetAngle - this.angle;
    while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
    while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;

    this.angle += diffAngle * Math.min(1.0, this.turnRate * 60 * dt);

    let nextX = this.x + Math.cos(this.angle) * currentSpeed * dt;
    let nextY = this.y + Math.sin(this.angle) * currentSpeed * dt;

    // Obstacle Collisions sliding
    for (const obs of obstacles) {
      const col = obs.checkCollision(nextX, nextY, this.radius);
      if (col.collided) {
        nextX += col.normalX * col.overlap;
        nextY += col.normalY * col.overlap;
      }
    }

    // Door Bashing (Kenan bashes closed doors for 1.5s before breaking them)
    for (const door of doors) {
      if (door.isClosed && !door.isBroken) {
        const col = door.checkCollision(nextX, nextY, this.radius);
        if (col.collided) {
          nextX += col.normalX * col.overlap;
          nextY += col.normalY * col.overlap;
          door.bash(dt, particles);
        }
      }
    }

    this.x = Math.min(Math.max(nextX, this.radius), arenaWidth - this.radius);
    this.y = Math.min(Math.max(nextY, this.radius), arenaHeight - this.radius);
  }

  triggerTeleportJump(px, py, arenaWidth, arenaHeight, particles) {
    // Create shockwave particles at origin
    for (let i = 0; i < 15; i++) {
      particles.push(new Particle(
        this.x, this.y,
        (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200,
        '#ff0044', 8, 0.4
      ));
    }

    // Teleport to 140px in front of player
    const angleToPlayer = Math.atan2(py - this.y, px - this.x);
    this.x = Math.min(Math.max(px - Math.cos(angleToPlayer) * 140, this.radius), arenaWidth - this.radius);
    this.y = Math.min(Math.max(py - Math.sin(angleToPlayer) * 140, this.radius), arenaHeight - this.radius);

    window.soundEffectsManager.playTeleportSound();
    window.hapticsManager.triggerImpact();

    // Shockwave particles at target
    for (let i = 0; i < 15; i++) {
      particles.push(new Particle(
        this.x, this.y,
        (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200,
        '#00f0ff', 8, 0.4
      ));
    }
  }

  draw(ctx, particles, isNightMode = false) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Freeze / Banana Slip Visuals
    if (this.slipTimer > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 204, 0, 0.4)';
      ctx.fill();
    } else if (this.freezeTimer > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.fill();
    }

    // Scale enlarge (+15% scale in Rage Mode)
    const scale = (this.isRage ? 1.15 : 1.0);
    ctx.scale(scale, scale);

    if (this.isRage) {
      ctx.shadowColor = '#ff0044';
      ctx.shadowBlur = 28;

      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 68, 0.45)';
      ctx.fill();

      if (Math.random() < 0.6) {
        particles.push(new Particle(
          this.x + (Math.random() - 0.5) * 25,
          this.y + (Math.random() - 0.5) * 25,
          (Math.random() - 0.5) * 50,
          -50 - Math.random() * 30,
          '#ff0044',
          6,
          0.45
        ));
      }
    }

    ctx.rotate(this.angle);

    // Draw Enlarged Kenan Image Asset (scaled up 40%!)
    const imgSize = this.radius * 2.7; // ~105px width
    if (isKenanImgLoaded) {
      ctx.drawImage(kenanImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
    } else {
      ctx.fillStyle = '#ff3366';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(14, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glowing Red Eye Beams in Night Mode
    if (isNightMode) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(15, -10, 6, 0, Math.PI * 2);
      ctx.arc(15, 10, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Render Floating Meme Speech Bubble
    this.drawSpeechBubble(ctx);
  }

  drawSpeechBubble(ctx) {
    const text = this.currentQuote || "وراك وراك!";
    ctx.save();
    ctx.font = 'bold 16px Tajawal, sans-serif';

    const padding = 12;
    const textWidth = ctx.measureText(text).width;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = 32;
    const boxX = this.x - boxWidth / 2;
    const boxY = this.y - this.radius - 52;

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 12);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(this.x - 6, boxY + boxHeight);
    ctx.lineTo(this.x, boxY + boxHeight + 9);
    ctx.lineTo(this.x + 6, boxY + boxHeight);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.x, boxY + boxHeight / 2);
    ctx.restore();
  }
}

/**
 * Kenan Clone (Decoy Monster at 45s)
 */
class KenanClone {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 39;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 190;
    this.changeDirTimer = 0;
  }

  update(dt, arenaWidth, arenaHeight, obstacles) {
    this.changeDirTimer -= dt;
    if (this.changeDirTimer <= 0) {
      this.changeDirTimer = 1.5 + Math.random() * 2;
      this.angle += (Math.random() - 0.5) * 1.5;
    }

    let nextX = this.x + Math.cos(this.angle) * this.speed * dt;
    let nextY = this.y + Math.sin(this.angle) * this.speed * dt;

    if (nextX < this.radius || nextX > arenaWidth - this.radius) this.angle = Math.PI - this.angle;
    if (nextY < this.radius || nextY > arenaHeight - this.radius) this.angle = -this.angle;

    this.x = Math.min(Math.max(nextX, this.radius), arenaWidth - this.radius);
    this.y = Math.min(Math.max(nextY, this.radius), arenaHeight - this.radius);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const imgSize = this.radius * 2.7;
    if (isKenanImgLoaded) {
      ctx.drawImage(kenanImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
    } else {
      ctx.fillStyle = '#aa00ff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * Banana Trap Entity 🍌
 */
class BananaTrap {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 18;
    this.isPlaced = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = '24px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 10;
    ctx.fillText('🍌', 0, 0);
    ctx.restore();
  }
}

/**
 * Speed Boost Pad Entity 🚀
 */
class SpeedBoostPad {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 30;
    this.animTimer = 0;
  }

  update(dt) {
    this.animTimer += dt * 5;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 15;

    // Glowing Neon Base Box
    ctx.fillStyle = 'rgba(0, 255, 136, 0.25)';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2, 10);
    ctx.fill();
    ctx.stroke();

    // Pulsing Animated Arrows
    const offset = Math.sin(this.animTimer) * 4;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, offset);

    ctx.restore();
  }
}

/**
 * Interactive Door Entity 🚪
 */
class InteractiveDoor {
  constructor(x, y, width = 75, height = 24, label = 'باب ممر') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.radius = Math.hypot(width, height) / 2;
    this.label = label;

    this.isClosed = true;
    this.isBroken = false;
    this.bashTimer = 1.5; // Requires 1.5s bash by Kenan to break
  }

  checkCollision(px, py, pradius) {
    if (!this.isClosed || this.isBroken) return { collided: false };

    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.radius + pradius;

    if (dist < minDist) {
      const overlap = minDist - dist;
      const nx = dist === 0 ? 1 : dx / dist;
      const ny = dist === 0 ? 0 : dy / dist;
      return { collided: true, overlap, normalX: nx, normalY: ny };
    }
    return { collided: false };
  }

  bash(dt, particles) {
    if (!this.isClosed || this.isBroken) return;
    this.bashTimer -= dt;

    // Emit wood splinter particles
    if (Math.random() < 0.4) {
      particles.push(new Particle(
        this.x + (Math.random() - 0.5) * this.width,
        this.y + (Math.random() - 0.5) * this.height,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        '#8b5a2b', 5, 0.4
      ));
    }

    if (this.bashTimer <= 0) {
      this.isBroken = true;
      this.isClosed = false;
      window.soundEffectsManager.playDoorBreakSound();
    }
  }

  draw(ctx) {
    if (this.isBroken) return; // Broken door disappears

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;

    ctx.fillStyle = '#8b5a2b';
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 6);
    ctx.fill();
    ctx.stroke();

    // Door knob detail
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(this.width / 3, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Arena Obstacle
 */
class Obstacle {
  constructor(x, y, radius, label = 'طاولة') {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.label = label;
  }

  checkCollision(px, py, pradius) {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.radius + pradius;

    if (dist < minDist) {
      const overlap = minDist - dist;
      const nx = dist === 0 ? 1 : dx / dist;
      const ny = dist === 0 ? 0 : dy / dist;
      return { collided: true, overlap, normalX: nx, normalY: ny };
    }
    return { collided: false };
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    ctx.fillStyle = '#2c254e';
    ctx.strokeStyle = '#4a3e7a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * PowerUp Entity
 */
class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.radius = 18;
    this.type = type; // 'speed', 'freeze', 'banana'
    this.lifespan = 6.0;
    this.animTimer = 0;
  }

  update(dt) {
    this.lifespan -= dt;
    this.animTimer += dt * 4;
  }

  draw(ctx) {
    if (this.lifespan <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const pulse = 1 + Math.sin(this.animTimer) * 0.12;
    ctx.scale(pulse, pulse);

    let color = '#00ff88';
    let icon = '⚡';

    if (this.type === 'freeze') {
      color = '#00f0ff';
      icon = '❄️';
    } else if (this.type === 'banana') {
      color = '#ffcc00';
      icon = '🍌';
    }

    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.font = '18px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 0);

    ctx.restore();
  }
}

window.Entities = {
  Particle,
  Player,
  KenanMonster,
  KenanClone,
  BananaTrap,
  SpeedBoostPad,
  InteractiveDoor,
  Obstacle,
  PowerUp,
  LOSS_QUOTES
};
