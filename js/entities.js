/**
 * Entities & Game Mechanics (Expansion: Enlarged Kenan, Dash, Banana Traps, Speed Boost Pads, Interactive Doors, Night Mode Flashlight)
 */

// Image Preloader for Kenan & Player Sprites (Relative paths for GitHub Pages & APK)
const kenanImg = new Image();
kenanImg.src = './kenan.png';
let isKenanImgLoaded = false;
kenanImg.onload = () => { isKenanImgLoaded = true; };

const playerImg = new Image();
playerImg.src = './assets/player.png';
let isPlayerImgLoaded = false;
playerImg.onload = () => { isPlayerImgLoaded = true; };

// Preload Stage Background Images (Level/bg_stage1.png to bg_stage10.png mapped across 20 stages)
const STAGE_BG_IMAGES = {};
for (let i = 1; i <= 20; i++) {
  const img = new Image();
  const bgNum = ((i - 1) % 10) + 1;
  img.src = `./Level/bg_stage${bgNum}.png`;
  STAGE_BG_IMAGES[i] = img;
}

// Preload Item & Obstacle Asset Images (assets/item_*.png, obstacle_*.png, speed_pad.png)
const ASSET_IMAGES = {};
const ASSET_PATHS = {
  key: './assets/item_key.png',
  juice: './assets/item_juice.png',
  switch: './assets/item_switch.png',
  sprinkler: './assets/item_sprinkler.png',
  wire: './assets/item_wire.png',
  candy: './assets/item_candy.png',
  slipper: './assets/item_slipper.png',
  wand: './assets/item_wand.png',
  controller: './assets/item_controller.png',
  tiara: './assets/item_tiara.png',
  aseel: './assets/aseel.png',
  elias: './assets/elias.png',
  qamar: './assets/qamar.png',
  shield: './assets/item_shield.png',
  boost: './assets/item_boost.png',
  freeze_bomb: './assets/item_freeze_bomb.png',
  keycard: './assets/item_key.png',
  generator: './assets/item_switch.png',
  crystal: './assets/obstacle_crystal.png',
  crate: './assets/obstacle_crate.png',
  door: './assets/obstacle_door.png',
  speed_pad: './assets/speed_pad.png'
};

for (const [type, path] of Object.entries(ASSET_PATHS)) {
  const img = new Image();
  img.src = path;
  ASSET_IMAGES[type] = img;
}

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
    this.maxLife = maxLife;
    this.life = maxLife;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Player Character Entity
 */
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 28;
    this.speed = 280;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;

    // Dash Skill Burst State (8s Cooldown, 0.35s burst)
    this.dashCooldown = 0;
    this.dashDuration = 0;
    this.dashMultiplier = 2.4;

    // PowerUp multipliers & Shield
    this.speedBoostTimer = 0;
    this.padSpeedBoostTimer = 0;
    this.hasShield = false;
    this.shieldInvulnerableTimer = 0;

    // Chase Mode Monster Debuff Timers
    this.slowTimer = 0;             // Aseel Wand (Slow 50%)
    this.freezeJoystickTimer = 0;   // Elias Controller (Freeze joystick input)
    this.reverseControlTimer = 0;   // Qamar Tiara (Reverse controls)

    // Item Inventory
    this.bananaTraps = 2;
    this.slippers = 0;
  }

  triggerDash() {
    if (this.dashCooldown <= 0 && this.freezeJoystickTimer <= 0) {
      this.dashDuration = 0.35;
      this.dashCooldown = 8.0;
      window.soundEffectsManager.playDashSound();
      window.hapticsManager.triggerTac();
    }
  }

  update(dt, inputVector, arenaWidth, arenaHeight, obstacles, doors) {
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.dashDuration > 0) this.dashDuration -= dt;
    if (this.speedBoostTimer > 0) this.speedBoostTimer -= dt;
    if (this.padSpeedBoostTimer > 0) this.padSpeedBoostTimer -= dt;
    if (this.shieldInvulnerableTimer > 0) this.shieldInvulnerableTimer -= dt;

    if (this.slowTimer > 0) this.slowTimer -= dt;
    if (this.freezeJoystickTimer > 0) this.freezeJoystickTimer -= dt;
    if (this.reverseControlTimer > 0) this.reverseControlTimer -= dt;

    let vecX = inputVector.x;
    let vecY = inputVector.y;

    if (this.freezeJoystickTimer > 0) {
      vecX = 0;
      vecY = 0;
    } else if (this.reverseControlTimer > 0) {
      vecX = -vecX;
      vecY = -vecY;
    }

    let currentSpeed = this.speed;

    if (this.slowTimer > 0) {
      currentSpeed *= 0.5; // 50% slow from Aseel's Wand
    } else if (this.dashDuration > 0) {
      currentSpeed *= this.dashMultiplier;
    } else if (this.speedBoostTimer > 0) {
      currentSpeed *= 1.5;
    } else if (this.padSpeedBoostTimer > 0) {
      currentSpeed *= 1.7;
    }

    if (vecX !== 0 || vecY !== 0) {
      this.angle = Math.atan2(vecY, vecX);
      this.vx = vecX * currentSpeed;
      this.vy = vecY * currentSpeed;
    } else {
      this.vx *= 0.8;
      this.vy *= 0.8;
    }

    let nextX = this.x + this.vx * dt;
    let nextY = this.y + this.vy * dt;

    // Obstacle Collisions
    for (const obs of obstacles) {
      const col = obs.checkCollision(nextX, nextY, this.radius);
      if (col.collided) {
        nextX += col.normalX * col.overlap;
        nextY += col.normalY * col.overlap;
      }
    }

    // Door Collisions
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
    if (this.dashDuration > 0 || this.speedBoostTimer > 0 || this.padSpeedBoostTimer > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
      ctx.fillStyle = this.dashDuration > 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(0, 255, 136, 0.35)';
      ctx.fill();

      // Emit trail particles
      if (Math.random() < 0.7) {
        particles.push(new Particle(
          this.x + (Math.random() - 0.5) * 14,
          this.y + (Math.random() - 0.5) * 14,
          -this.vx * 0.35,
          -this.vy * 0.35,
          this.dashDuration > 0 ? '#00f0ff' : '#00ff88',
          6,
          0.38
        ));
      }
    }

    // Shield Glowing Aura Ring
    if (this.hasShield) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 22;
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
      ctx.fill();
      ctx.restore();
    }

    ctx.rotate(this.angle);

    if (isPlayerImgLoaded) {
      const pSize = this.radius * 2.6;
      ctx.drawImage(playerImg, -pSize / 2, -pSize / 2, pSize, pSize);
    } else {
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
    }

    ctx.restore();
  }

  // Draw Night Mode Flashlight Conical Beam
  drawFlashlightBeam(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const beamAngle = Math.PI / 3.2; // ~56 degrees cone
    const beamLength = 340;

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
    this.isBoss = false;
    this.bossHp = 100;
    this.maxBossHp = 100;
    this.freezeTimer = 0;
    this.slipTimer = 0; // Banana Slip 2.0s duration
    this.teleportCooldown = 35.0; // Teleport Jump every 35s

    // Tool Cooldown & Rage Scaling System
    this.toolType = 'slipper';
    this.itemCooldown = 5.0;
    this.itemCooldownMax = 10.0;
    this.canUseItem = false;
    this.attackCount = 0;

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

  setAsBoss(hp = 100) {
    this.isBoss = true;
    this.radius = 95; // Giant Kenan (+250% scale!)
    this.bossHp = hp;
    this.maxBossHp = hp;
    this.baseSpeed = 220;
    this.turnRate = 0.09;
    this.itemCooldown = 5.0;
    this.itemCooldownMax = 10.0;
    this.canUseItem = false;
    this.attackCount = 0;
  }

  triggerItemAttack(playerX, playerY, projectiles) {
    if (!this.canUseItem) return;
    this.itemCooldown = this.itemCooldownMax;
    this.canUseItem = false;
    this.attackCount += 1;

    // Permanent 12% Speed Scaling
    this.baseSpeed *= 1.12;
    this.radius = Math.min(this.radius + 1.5, 115);

    if (projectiles) {
      projectiles.push(new MonsterProjectile(this.x, this.y, playerX, playerY, 'slipper'));
    }

    if (window.audioManager) {
      window.audioManager.playVoice('voice_warak');
    }
    if (window.soundEffectsManager) {
      window.soundEffectsManager.playDashSound();
    }
  }

  freeze(duration = 1.5) {
    this.freezeTimer = duration;
  }

  slipOnBanana() {
    this.slipTimer = 2.0; // Spin & slip for 2.0s
    window.soundEffectsManager.playBananaSlipSound();
  }

  update(dt, playerX, playerY, arenaWidth, arenaHeight, obstacles, doors, particles) {
    // Update Item Cooldown
    if (this.itemCooldown > 0) {
      this.itemCooldown -= dt;
      if (this.itemCooldown <= 0) {
        this.canUseItem = true;
      }
    }
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
    const targetDx = playerX - this.x;
    const targetDy = playerY - this.y;
    const targetAngle = Math.atan2(targetDy, targetDx);

    // Smooth Turn Angle Interpolation towards Player
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

    // Door Bashing
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
    for (let i = 0; i < 15; i++) {
      particles.push(new Particle(
        this.x, this.y,
        (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200,
        '#ff0044', 8, 0.4
      ));
    }

    const angleToPlayer = Math.atan2(py - this.y, px - this.x);
    this.x = Math.min(Math.max(px - Math.cos(angleToPlayer) * 140, this.radius), arenaWidth - this.radius);
    this.y = Math.min(Math.max(py - Math.sin(angleToPlayer) * 140, this.radius), arenaHeight - this.radius);

    window.soundEffectsManager.playTeleportSound();
  }

  draw(ctx, particles, isNightMode = false) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Aura ring
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

    const scale = (this.isRage ? 1.15 : 1.0);
    ctx.scale(scale, scale);

    if (this.isRage || this.isBoss) {
      ctx.shadowColor = '#ff0044';
      ctx.shadowBlur = 28;

      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 68, 0.45)';
      ctx.fill();

      if (Math.random() < 0.6) {
        particles.push(new Particle(
          this.x + (Math.random() - 0.5) * (this.radius * 0.8),
          this.y + (Math.random() - 0.5) * (this.radius * 0.8),
          (Math.random() - 0.5) * 50,
          -50 - Math.random() * 30,
          '#ff0044',
          6,
          0.45
        ));
      }
    }

    ctx.rotate(this.angle);

    const imgSize = this.radius * 2.7;
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

    this.drawCooldownIndicator(ctx);
    this.drawSpeechBubble(ctx);
  }

  drawCooldownIndicator(ctx) {
    if (!this.isBoss && this.attackCount === 0 && this.itemCooldown <= 0) return;

    ctx.save();
    const icon = '👡';
    const barWidth = 70;
    const barHeight = 7;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.radius - 24;

    // Badge Box
    ctx.fillStyle = 'rgba(15, 12, 32, 0.88)';
    ctx.strokeStyle = this.canUseItem ? '#ff0044' : '#ffcc00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(barX - 16, barY - 5, barWidth + 32, barHeight + 10, 6);
    ctx.fill();
    ctx.stroke();

    // Progress Bar
    const progress = this.canUseItem ? 1.0 : Math.max(0, 1.0 - (this.itemCooldown / 10.0));
    ctx.fillStyle = this.canUseItem ? '#ff0044' : '#ffcc00';
    ctx.beginPath();
    ctx.roundRect(barX + 4, barY, (barWidth - 4) * progress, barHeight, 3);
    ctx.fill();

    // Icon & Text
    ctx.font = 'bold 11px Cairo, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, barX - 6, barY + 3);

    if (this.canUseItem) {
      ctx.fillStyle = '#ff0044';
      ctx.fillText('🔥', barX + barWidth + 8, barY + 3);
    } else {
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(`${Math.ceil(this.itemCooldown)}s`, barX + barWidth + 8, barY + 3);
    }

    ctx.restore();
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
    this.radius = 35;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 210;
  }

  update(dt, arenaWidth, arenaHeight, obstacles) {
    this.angle += (Math.random() - 0.5) * 2 * dt;
    let nextX = this.x + Math.cos(this.angle) * this.speed * dt;
    let nextY = this.y + Math.sin(this.angle) * this.speed * dt;

    if (nextX < this.radius || nextX > arenaWidth - this.radius) this.angle = Math.PI - this.angle;
    if (nextY < this.radius || nextY > arenaHeight - this.radius) this.angle = -this.angle;

    this.x = Math.min(Math.max(nextX, this.radius), arenaWidth - this.radius);
    this.y = Math.min(Math.max(nextY, this.radius), arenaHeight - this.radius);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = 0.55; // Translucent ghost decoy

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
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 12;

    ctx.font = '24px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
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

    const padImg = ASSET_IMAGES['speed_pad'];
    if (padImg && padImg.complete && padImg.naturalWidth > 0) {
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 15;
      ctx.drawImage(padImg, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
    } else {
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 15;

      ctx.fillStyle = 'rgba(0, 255, 136, 0.25)';
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2, 10);
      ctx.fill();
      ctx.stroke();

      const offset = Math.sin(this.animTimer) * 4;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', 0, offset);
    }

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
    this.bashTimer = 1.5;
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
    if (this.isBroken) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const doorImg = ASSET_IMAGES['door'];
    if (doorImg && doorImg.complete && doorImg.naturalWidth > 0) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.drawImage(doorImg, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;

      ctx.fillStyle = '#8b5a2b';
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(this.width / 3, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }

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
    this.type = type;
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
    let imgKey = this.type;

    if (this.type === 'shield') {
      color = '#00f0ff';
      icon = '🛡️';
    } else if (this.type === 'freeze' || this.type === 'freeze_bomb') {
      color = '#00f0ff';
      icon = '❄️';
      imgKey = 'freeze_bomb';
    } else if (this.type === 'speed' || this.type === 'boost') {
      color = '#00ff88';
      icon = '⚡';
      imgKey = 'boost';
    } else if (this.type === 'banana') {
      color = '#ffcc00';
      icon = '🍌';
    }

    ctx.shadowColor = color;
    ctx.shadowBlur = 18;

    const pImg = ASSET_IMAGES[imgKey];
    if (pImg && pImg.complete && pImg.naturalWidth > 0) {
      const pSize = this.radius * 2.5;
      ctx.drawImage(pImg, -pSize / 2, -pSize / 2, pSize, pSize);
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.font = '18px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, 0, 0);
    }

    ctx.restore();
  }
}

/**
 * Story Mode Stages Data (20 Stages across 4 Chapters)
 * Chapter 1 (1-5): Kenan 👹
 * Chapter 2 (6-10): Aseel 🪄
 * Chapter 3 (11-15): Elias 🎮
 * Chapter 4 (16-20): Qamar 👑
 */
const STORY_STAGES = [
  // ─── الفصل 1: غضب كنان (المراحل 1 - 5) ───
  {
    id: 1,
    chapter: 1,
    chapterName: "الفصل 1: غضب كنان",
    monsterType: "kenan",
    monsterName: "كنان",
    name: "المرحلة 1: الصالة",
    themeColor: "#ff9900",
    objectiveText: "🎯 المهمة: اجمع المفتاح (🔑) واهرب إلى بوابة الخروج (🚪)!",
    itemsNeeded: 1,
    itemType: "key",
    icon: "🔑",
    itemLabel: "مفتاح البوابة",
    desc: "أول مرحلة في المنزل، اجمع المفتاح واهرب عبر بوابة الخروج!"
  },
  {
    id: 2,
    chapter: 1,
    chapterName: "الفصل 1: غضب كنان",
    monsterType: "kenan",
    monsterName: "كنان",
    name: "المرحلة 2: المطبخ",
    themeColor: "#ffaa00",
    slipperyFloor: true,
    objectiveText: "🎯 المهمة: اجمع 2 علب عصير (🧃) واهرب إلى بوابة الخروج (🚪)!",
    itemsNeeded: 2,
    itemType: "juice",
    icon: "🧃",
    itemLabel: "علب عصير",
    desc: "الأرضية مبللة وتزلق! اجمع علب العصير لتفتح بوابة الخروج."
  },
  {
    id: 3,
    chapter: 1,
    chapterName: "الفصل 1: غضب كنان",
    monsterType: "kenan",
    monsterName: "كنان",
    name: "المرحلة 3: غرفة النوم",
    themeColor: "#9900ff",
    isNightMode: true,
    objectiveText: "🎯 المهمة: شغل 3 مفاتيح إضاءة (🔘) واهرب عبر البوابة (🚪)!",
    itemsNeeded: 3,
    itemType: "switch",
    icon: "🔘",
    itemLabel: "مفاتيح الإضاءة",
    desc: "الغرفة مظلمة بالكامل! استخدم الكشاف لتشغيل مفاتيح الإضاءة واهرب."
  },
  {
    id: 4,
    chapter: 1,
    chapterName: "الفصل 1: غضب كنان",
    monsterType: "kenan",
    monsterName: "كنان",
    name: "المرحلة 4: الممر",
    themeColor: "#00ccff",
    hasCorridorDoors: true,
    objectiveText: "🎯 المهمة: اجمع بطاقة المرور (💳) واهرب عبر بوابة الممر (🚪)!",
    itemsNeeded: 1,
    itemType: "keycard",
    icon: "💳",
    itemLabel: "بطاقة المرور",
    desc: "استخدم الأبواب التفاعلية لإعاقة كنان واهرب عبر بوابة الممر."
  },
  {
    id: 5,
    chapter: 1,
    chapterName: "الفصل 1: غضب كنان",
    monsterType: "kenan",
    monsterName: "كنان",
    name: "المرحلة 5: قتال بوس كنان",
    themeColor: "#ff0044",
    isBossFight: true,
    hasSlippers: true,
    bossHp: 50,
    objectiveText: "⚔️ بوس الفصل 1: اجمع الزنوبات وارميها (👡) على كنان العملاق وهزمه!",
    itemsNeeded: 0,
    itemType: "slipper",
    icon: "👡",
    itemLabel: "الزنوبة الطائرة",
    desc: "المواجهة الحاسمة مع كنان العملاق! ارمِ الزنوبات عليه وهزمه لتفتح الفصل الثاني!"
  },

  // ─── الفصل 2: سحر أسيل (المراحل 6 - 10) ───
  {
    id: 6,
    chapter: 2,
    chapterName: "الفصل 2: سحر أسيل",
    monsterType: "aseel",
    monsterName: "أسيل",
    name: "المرحلة 6: حديقة أسيل",
    themeColor: "#aa00ff",
    hasSlippers: true,
    objectiveText: "🎯 المهمة: اجمع 3 بلورات سحرية (🔮) واحذر عصا أسيل 🪄 ثم اهرب!",
    itemsNeeded: 3,
    itemType: "crystal",
    icon: "🔮",
    itemLabel: "البلورات السحرية",
    desc: "احذر من عصا أسيل السحرية التي تبطئ حركتك! اجمع البلورات واهرب."
  },
  {
    id: 7,
    chapter: 2,
    chapterName: "الفصل 2: سحر أسيل",
    monsterType: "aseel",
    monsterName: "أسيل",
    name: "المرحلة 7: القبو السري",
    themeColor: "#885522",
    pushableCrates: true,
    hasSlippers: true,
    objectiveText: "🎯 المهمة: ادفع الصناديق (📦)، اجمع المولد (🔋) واهرب عبر البوابة!",
    itemsNeeded: 1,
    itemType: "generator",
    icon: "🔋",
    itemLabel: "بطارية المولد",
    desc: "ادفع الصناديق الخشبية وابتعد عن سحر أسيل واهرب عبر Portal القبو."
  },
  {
    id: 8,
    chapter: 2,
    chapterName: "الفصل 2: سحر أسيل",
    monsterType: "aseel",
    monsterName: "أسيل",
    name: "المرحلة 8: السطح الممطر",
    themeColor: "#5588ff",
    weatherRain: true,
    hasSlippers: true,
    objectiveText: "🎯 المهمة: اجمع سلكين (🔌) واهرب عبر مصعد السطح (🚪)!",
    itemsNeeded: 2,
    itemType: "wire",
    icon: "🔌",
    itemLabel: "أسلاك الكهرباء",
    desc: "أجواء ممطرة وضبابية على السطح! اجمع الأسلاك واهرب عبر المصعد."
  },
  {
    id: 9,
    chapter: 2,
    chapterName: "الفصل 2: سحر أسيل",
    monsterType: "aseel",
    monsterName: "أسيل",
    name: "المرحلة 9: عالم السحر",
    themeColor: "#cc00ff",
    hasClones: true,
    hasSlippers: true,
    objectiveText: "🎯 المهمة: اجمع 3 قطع حلوى سحرية (🍬) واهرب عبر بوابة السحر!",
    itemsNeeded: 3,
    itemType: "candy",
    icon: "🍬",
    itemLabel: "الحلوى السحرية",
    desc: "عالم مليء بالأوهام والنسخ! اجمع الحلوى السحرية واهرب فوراً."
  },
  {
    id: 10,
    chapter: 2,
    chapterName: "الفصل 2: سحر أسيل",
    monsterType: "aseel",
    monsterName: "أسيل",
    name: "المرحلة 10: قتال بوس أسيل",
    themeColor: "#aa00ff",
    isBossFight: true,
    hasSlippers: true,
    bossHp: 50,
    objectiveText: "⚔️ بوس الفصل 2: ارمِ الزنوبات (👡) على الساحرة أسيل وهزمها!",
    itemsNeeded: 0,
    itemType: "slipper",
    icon: "👡",
    itemLabel: "الزنوبة الطائرة",
    desc: "قتال البوس ضد أسيل! استغل الزنوبات لمنع سحر التبطيء وهزيمتها لفتح الفصل الثالث!"
  },

  // ─── الفصل 3: تحدي إلياس (المراحل 11 - 15) ───
  {
    id: 11,
    chapter: 3,
    chapterName: "الفصل 3: تحدي إلياس",
    monsterType: "elias",
    monsterName: "إلياس",
    name: "المرحلة 11: غرفة الألعاب",
    themeColor: "#00f0ff",
    hasSlippers: true,
    objectiveText: "🎯 المهمة: اجمع 3 أجهزة كنترولر (🎮) واحذر تجميد إلياس ثم اهرب!",
    itemsNeeded: 3,
    itemType: "wand",
    icon: "🎮",
    itemLabel: "أجهزة الكنترولر",
    desc: "احذر من كنترولر إلياس الذي يجمد حركة الجويستيك! اجمع الأجهزة واهرب."
  },
  {
    id: 12,
    chapter: 3,
    chapterName: "الفصل 3: تحدي إلياس",
    monsterType: "elias",
    monsterName: "إلياس",
    name: "المرحلة 12: المختبر الرقمي",
    themeColor: "#00aaff",
    hasSpeedPads: true,
    hasSlippers: true,
    objectiveText: "🎯 المهمة: اجمع 2 بطاقات رقمية (💳) واستغل سجادات السرعة للهروب!",
    itemsNeeded: 2,
    itemType: "keycard",
    icon: "💳",
    itemLabel: "البطاقات الرقمية",
    desc: "استغل سجادات السرعة لتجاوز تجميد إلياس واجمع البطاقات لتفتح البوابة."
  },
  {
    id: 13,
    chapter: 3,
    chapterName: "الفصل 3: تحدي إلياس",
    monsterType: "elias",
    monsterName: "إلياس",
    name: "المرحلة 13: ممر التكنولوجيا",
    themeColor: "#0088cc",
    hasCorridorDoors: true,
    hasSlippers: true,
    objectiveText: "🎯 المهمة: شغل 3 مفاتيح طاقة (🔘) واستخدم الأبواب لإعاقة إلياس!",
    itemsNeeded: 3,
    itemType: "switch",
    icon: "🔘",
    itemLabel: "مفاتيح الطاقة",
    desc: "استخدم الأبواب التفاعلية لإغلاق الطرق أمام إلياس واجمع المفاتيح."
  },
  {
    id: 14,
    chapter: 3,
    chapterName: "الفصل 3: تحدي إلياس",
    monsterType: "elias",
    monsterName: "إلياس",
    name: "المرحلة 14: غرفة السيرفرات",
    themeColor: "#0055aa",
    isNightMode: true,
    hasSlippers: true,
    objectiveText: "🎯 المهمة: اجمع 3 مولدات سيرفر (🔋) في الظلام واهرب عبر المصعد!",
    itemsNeeded: 3,
    itemType: "generator",
    icon: "🔋",
    itemLabel: "مولدات السيرفر",
    desc: "غرفة السيرفرات مظلمة! استخدم الكشاف واجمع المولدات قبل أن يصيدك إلياس."
  },
  {
    id: 15,
    chapter: 3,
    chapterName: "الفصل 3: تحدي إلياس",
    monsterType: "elias",
    monsterName: "إلياس",
    name: "المرحلة 15: قتال بوس إلياس",
    themeColor: "#00f0ff",
    isBossFight: true,
    hasSlippers: true,
    bossHp: 60,
    objectiveText: "⚔️ بوس الفصل 3: ارمِ الزنوبات (👡) على إلياس العملاق ودمّر التحكم!",
    itemsNeeded: 0,
    itemType: "slipper",
    icon: "👡",
    itemLabel: "الزنوبة الطائرة",
    desc: "معركة البوس الرقمية ضد إلياس! ارمِ الزنوبات بسرعة واكسر تجميده لفتح الفصل الرابع!"
  },

  // ─── الفصل 4: مملكة قمر (المراحل 16 - 20) ───
  {
    id: 16,
    chapter: 4,
    chapterName: "الفصل 4: مملكة قمر",
    monsterType: "qamar",
    monsterName: "قمر",
    name: "المرحلة 16: القصر الملكي",
    themeColor: "#ff66cc",
    hasSlippers: true,
    objectiveText: "🎯 المهمة: اجمع 3 تيجان أثرية (👑) واحذر عكس اتجاهات قمر ثم اهرب!",
    itemsNeeded: 3,
    itemType: "key",
    icon: "👑",
    itemLabel: "التيجان الأثرية",
    desc: "احذر من تاج قمر الذي يعكس اتجاهات الحركة! اجمع التيجان واهرب عبر القصر."
  },
  {
    id: 17,
    chapter: 4,
    chapterName: "الفصل 4: مملكة قمر",
    monsterType: "qamar",
    monsterName: "قمر",
    name: "المرحلة 17: قاعة البلورات",
    themeColor: "#ff33aa",
    pushableCrates: true,
    hasSlippers: true,
    objectiveText: "🎯 المهمة: ادفع الصناديق (📦) واجمع 3 بلورات نادرة (🔮) واهرب!",
    itemsNeeded: 3,
    itemType: "crystal",
    icon: "🔮",
    itemLabel: "البلورات النادرة",
    desc: "ادفع الصناديق وراقب اتجاهات حركتك بذكاء لتفادي فخاخ الملكة قمر."
  },
  {
    id: 18,
    chapter: 4,
    chapterName: "الفصل 4: مملكة قمر",
    monsterType: "qamar",
    monsterName: "قمر",
    name: "المرحلة 18: الحديقة الملكية",
    themeColor: "#ff0088",
    hasSpeedPads: true,
    hasSlippers: true,
    objectiveText: "🎯 المهمة: قف على 3 رشاشات ماء (💦) واستغل سجادات السرعة للهروب!",
    itemsNeeded: 3,
    itemType: "sprinkler",
    icon: "💦",
    itemLabel: "رشاشات الحديقة",
    desc: "استغل سجادات السرعة للانطلاق بسرعة وتجنب التأثر بعكس الاتجاهات."
  },
  {
    id: 19,
    chapter: 4,
    chapterName: "الفصل 4: مملكة قمر",
    monsterType: "qamar",
    monsterName: "قمر",
    name: "المرحلة 19: الممر الذهبي",
    themeColor: "#ff0055",
    permanentRage: true,
    hasSlippers: true,
    objectiveText: "🎯 المهمة: اجمع المفتاح الذهبي (🔑) بوضع الغضب واهرب عبر البوابة!",
    itemsNeeded: 1,
    itemType: "key",
    icon: "🔑",
    itemLabel: "المفتاح الذهبي",
    desc: "قمر في وضع الغضب الأقصى! اجمع المفتاح واهرب فوراً نحو البوابة."
  },
  {
    id: 20,
    chapter: 4,
    chapterName: "الفصل 4: مملكة قمر",
    monsterType: "qamar",
    monsterName: "قمر",
    name: "المرحلة 20: قتال البوس الأخير",
    themeColor: "#ff0000",
    isBossFight: true,
    hasSlippers: true,
    bossHp: 70,
    objectiveText: "👑 المواجهة الحاسمة: ارمِ الزنوبات (👡) على الملكة قمر واختم القصة 100%!",
    itemsNeeded: 0,
    itemType: "slipper",
    icon: "👡",
    itemLabel: "الزنوبة الطائرة",
    desc: "معركة القمة الأخيرة في اللعبة! اهزم الملكة قمر لتصل إلى المرحلة الكبرى 21! 🏆"
  },
  {
    id: 21,
    chapter: 4,
    chapterName: "المرحلة النهائية: المواجهة الكبرى 🏆",
    monsterType: "all_bosses",
    monsterName: "الوحوش الأربعة معاً",
    name: "المرحلة 21: المواجهة الكبرى",
    themeColor: "#ff0044",
    isGrandFinal: true,
    hasSlippers: true,
    surviveTimeLimit: 60.0,
    objectiveText: "🏆 المرحلة 21: اصمد لمدة 60 ثانية ضد الوحوش الأربعة معاً واختم القصة!",
    itemsNeeded: 0,
    itemType: "none",
    icon: "🏆",
    itemLabel: "المواجهة الكبرى",
    desc: "المرحلة النهائية الكبرى! اصمد لمدة 60 ثانية ضد كنان، أسيل، إلياس، وقمر معاً لتختم اللعبة بالكامل! 🏆"
  }
];

/**
 * Dynamic Fleeing Story Collectible Item 🏃
 */
class StoryItem {
  constructor(x, y, type, icon) {
    this.x = x;
    this.y = y;
    this.radius = 24;
    this.type = type;
    this.icon = icon || '⭐';
    this.isCollected = false;
    this.animTimer = Math.random() * Math.PI * 2;
  }

  update(dt, playerX, playerY, arenaWidth, arenaHeight) {
    this.animTimer += dt * 3.5;

    // Flee away from Player when approached (< 220px)
    if (playerX !== undefined && playerY !== undefined && !this.isCollected) {
      const dist = Math.hypot(this.x - playerX, this.y - playerY);
      if (dist < 220 && dist > 10) {
        const fleeAngle = Math.atan2(this.y - playerY, this.x - playerX) + (Math.random() - 0.5) * 0.4;
        const fleeSpeed = 165;
        this.x += Math.cos(fleeAngle) * fleeSpeed * dt;
        this.y += Math.sin(fleeAngle) * fleeSpeed * dt;

        // Keep inside arena boundaries
        this.x = Math.min(Math.max(this.x, this.radius + 60), arenaWidth - this.radius - 60);
        this.y = Math.min(Math.max(this.y, this.radius + 60), arenaHeight - this.radius - 60);
      }
    }
  }

  draw(ctx) {
    if (this.isCollected) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const floatOffset = Math.sin(this.animTimer) * 6;
    ctx.translate(0, floatOffset);

    const itemImg = ASSET_IMAGES[this.type];
    if (itemImg && itemImg.complete && itemImg.naturalWidth > 0) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;
      const iSize = this.radius * 2.2;
      ctx.drawImage(itemImg, -iSize / 2, -iSize / 2, iSize, iSize);
    } else {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;

      ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1b1638';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.font = '20px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.icon, 0, 1);
    }

    ctx.restore();
  }
}

/**
 * Exit Gate Portal 🚪 (Unlocks after collecting all stage items)
 */
class ExitGate {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 38;
    this.isOpen = false;
    this.animTimer = 0;
  }

  update(dt, playerX, playerY, arenaWidth, arenaHeight) {
    this.animTimer += dt * 4;

    // Optional gentle fleeing/moving when open and player gets very near
    if (this.isOpen && playerX !== undefined && playerY !== undefined) {
      const dist = Math.hypot(this.x - playerX, this.y - playerY);
      if (dist < 160 && dist > 20) {
        const moveAngle = Math.atan2(this.y - playerY, this.x - playerX) + (Math.random() - 0.5) * 0.3;
        const moveSpeed = 120;
        this.x += Math.cos(moveAngle) * moveSpeed * dt;
        this.y += Math.sin(moveAngle) * moveSpeed * dt;

        this.x = Math.min(Math.max(this.x, this.radius + 80), arenaWidth - this.radius - 80);
        this.y = Math.min(Math.max(this.y, this.radius + 80), arenaHeight - this.radius - 80);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isOpen) {
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 30;

      // Pulsing Green Beacon
      const pulse = 1 + Math.sin(this.animTimer) * 0.15;
      ctx.scale(pulse, pulse);

      ctx.fillStyle = 'rgba(0, 255, 136, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f2b1d';
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const doorImg = ASSET_IMAGES['door'];
      if (doorImg && doorImg.complete && doorImg.naturalWidth > 0) {
        ctx.drawImage(doorImg, -this.radius * 0.7, -this.radius * 0.7, this.radius * 1.4, this.radius * 1.4);
      } else {
        ctx.font = '28px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚪', 0, 0);
      }
    } else {
      ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(50, 50, 70, 0.4)';
      ctx.strokeStyle = '#555577';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '20px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', 0, 0);
    }

    ctx.restore();
  }
}

/**
 * Collectible Slipper Entity 👡 (Ground Pickups)
 */
class CollectibleSlipper {
  constructor(x, y, isMoving = true) {
    this.x = x;
    this.y = y;
    this.radius = 22;
    this.isCollected = false;
    this.animTimer = Math.random() * Math.PI * 2;
    this.isMoving = isMoving;

    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 60; // Gentle moving slipper
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt, arenaWidth = 9000, arenaHeight = 6400) {
    this.animTimer += dt * 3.5;

    if (this.isMoving && !this.isCollected) {
      let nextX = this.x + this.vx * dt;
      let nextY = this.y + this.vy * dt;

      // Bounce off map boundaries
      if (nextX < this.radius + 60 || nextX > arenaWidth - this.radius - 60) {
        this.vx = -this.vx;
        nextX = Math.min(Math.max(nextX, this.radius + 60), arenaWidth - this.radius - 60);
      }
      if (nextY < this.radius + 60 || nextY > arenaHeight - this.radius - 60) {
        this.vy = -this.vy;
        nextY = Math.min(Math.max(nextY, this.radius + 60), arenaHeight - this.radius - 60);
      }

      this.x = nextX;
      this.y = nextY;
    }
  }

  draw(ctx) {
    if (this.isCollected) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const floatOffset = Math.sin(this.animTimer) * 5;
    ctx.translate(0, floatOffset);

    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 16;

    ctx.fillStyle = 'rgba(255, 204, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
    ctx.fill();

    const slpImg = ASSET_IMAGES['slipper'];
    if (slpImg && slpImg.complete && slpImg.naturalWidth > 0) {
      const sSize = this.radius * 2.4;
      ctx.drawImage(slpImg, -sSize / 2, -sSize / 2, sSize, sSize);
    } else {
      ctx.font = '24px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👡', 0, 0);
    }

    ctx.restore();
  }
}

/**
 * Pushable Wooden Crate for Stage 6 Basement
 */
class PushableCrate {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 28;
    this.width = 56;
    this.height = 56;
  }

  push(dx, dy, obstacles, arenaWidth, arenaHeight) {
    const pushSpeed = 160;
    let nextX = this.x + dx * pushSpeed;
    let nextY = this.y + dy * pushSpeed;

    nextX = Math.min(Math.max(nextX, this.radius), arenaWidth - this.radius);
    nextY = Math.min(Math.max(nextY, this.radius), arenaHeight - this.radius);

    this.x = nextX;
    this.y = nextY;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const crateImg = ASSET_IMAGES['crate'];
    if (crateImg && crateImg.complete && crateImg.naturalWidth > 0) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 12;
      ctx.drawImage(crateImg, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;

      ctx.fillStyle = '#a06028';
      ctx.strokeStyle = '#5a3410';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#6d4019';
      ctx.beginPath();
      ctx.moveTo(-this.width / 2 + 6, -this.height / 2 + 6);
      ctx.lineTo(this.width / 2 - 6, this.height / 2 - 6);
      ctx.moveTo(this.width / 2 - 6, -this.height / 2 + 6);
      ctx.lineTo(-this.width / 2 + 6, this.height / 2 - 6);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * Slipper Projectile for Stage 10 Boss Fight
 */
class SlipperProjectile {
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    this.radius = 18;
    this.speed = 650;
    this.lifespan = 2.5;

    const angle = Math.atan2(targetY - y, targetX - x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.angle = angle;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += dt * 15; // Spinning flying slipper!
    this.lifespan -= dt;
  }

  draw(ctx) {
    if (this.lifespan <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const slpImg = ASSET_IMAGES['slipper'];
    if (slpImg && slpImg.complete && slpImg.naturalWidth > 0) {
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 15;
      const sSize = this.radius * 2.8;
      ctx.drawImage(slpImg, -sSize / 2, -sSize / 2, sSize, sSize);
    } else {
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 15;

      ctx.font = '28px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👡', 0, 0);
    }

    ctx.restore();
  }
}

/**
 * Monster Projectile for Boss Item Attacks (Slipper, Wand, Controller, Tiara)
 */
class MonsterProjectile {
  constructor(x, y, targetX, targetY, toolType = 'slipper') {
    this.x = x;
    this.y = y;
    this.toolType = toolType; // 'slipper', 'wand', 'controller', 'tiara'
    this.radius = 20;
    this.speed = 550;
    this.lifespan = 3.2;

    const angle = Math.atan2(targetY - y, targetX - x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.angle = angle;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += dt * 14;
    this.lifespan -= dt;
  }

  draw(ctx) {
    if (this.lifespan <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    let color = '#ffcc00';
    let icon = '👡';
    let imgKey = 'slipper';

    if (this.toolType === 'wand') {
      color = '#aa00ff';
      icon = '🪄';
      imgKey = 'wand';
    } else if (this.toolType === 'controller') {
      color = '#00f0ff';
      icon = '🎮';
      imgKey = 'controller';
    } else if (this.toolType === 'tiara') {
      color = '#ff66cc';
      icon = '👑';
      imgKey = 'tiara';
    }

    ctx.shadowColor = color;
    ctx.shadowBlur = 18;

    const toolImg = ASSET_IMAGES[imgKey];
    if (toolImg && toolImg.complete && toolImg.naturalWidth > 0) {
      const tSize = this.radius * 2.6;
      ctx.drawImage(toolImg, -tSize / 2, -tSize / 2, tSize, tSize);
    } else {
      ctx.font = '26px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, 0, 0);
    }

    ctx.restore();
  }
}

/**
 * Generic Chase Monster Entity for Chase Mode & Story Mode (Aseel, Elias, Qamar)
 */
class ChaseMonster {
  constructor(type, x, y, difficulty = 'normal') {
    this.type = type; // 'aseel', 'elias', 'qamar'
    this.x = x;
    this.y = y;
    this.radius = 38;
    this.angle = 0;
    this.difficulty = difficulty;
    this.isBoss = false;

    // Cooldown & Rage Scaling System
    this.itemCooldown = 5.0;
    this.itemCooldownMax = 10.0;
    this.canUseItem = false;
    this.attackCount = 0;

    this.configureMonster();

    this.memeTimer = Math.random() * 2.0;
    this.memeInterval = 4.0;
    this.currentQuote = "";
    this.speechDisplayTimer = 0;
    this.proximityTriggerCooldown = 0;
    this.freezeTimer = 0;
  }

  setAsBoss(hp = 50) {
    this.isBoss = true;
    this.radius = 70;
    this.bossHp = hp;
    this.maxBossHp = hp;
    this.itemCooldown = 5.0;
    this.itemCooldownMax = 10.0;
    this.canUseItem = false;
    this.attackCount = 0;
  }

  freeze(duration = 3.0) {
    this.freezeTimer = duration;
  }

  triggerQuote(specificIndex = null) {
    if (!this.voiceQuoteMap || this.voiceQuoteMap.length === 0) return;
    const chosen = specificIndex !== null
      ? this.voiceQuoteMap[specificIndex % this.voiceQuoteMap.length]
      : this.voiceQuoteMap[Math.floor(Math.random() * this.voiceQuoteMap.length)];
    this.currentQuote = chosen.text;
    this.speechDisplayTimer = 3.5;
    if (window.audioManager) {
      window.audioManager.playVoice(chosen.voice);
    }
  }

  triggerItemAttack(playerX, playerY, projectiles) {
    if (!this.canUseItem) return;
    this.itemCooldown = this.itemCooldownMax;
    this.canUseItem = false;
    this.attackCount += 1;

    // Permanent 12% Speed Scaling
    this.baseSpeed *= 1.12;
    this.radius = Math.min(this.radius + 1.2, 95);

    if (projectiles) {
      projectiles.push(new MonsterProjectile(this.x, this.y, playerX, playerY, this.toolType || 'wand'));
    }

    this.triggerQuote();
    if (window.soundEffectsManager) {
      window.soundEffectsManager.playDashSound();
    }
  }

  configureMonster() {
    if (this.type === 'aseel') {
      this.name = 'أسيل';
      this.baseSpeed = 265;
      this.turnRate = 0.14;
      this.themeColor = '#aa00ff';
      this.img = ASSET_IMAGES['aseel'];
      this.voiceQuoteMap = [
        { voice: 'aseel_1', text: 'وين رايح؟ أنا وراك' },
        { voice: 'aseel_2', text: 'العصا السحرية جاياك!' },
        { voice: 'aseel_3', text: 'رح أبطئ حركتك!' }
      ];
      this.quotes = this.voiceQuoteMap.map(q => q.text);
      this.toolType = 'wand';
    } else if (this.type === 'elias') {
      this.name = 'إلياس';
      this.baseSpeed = 270;
      this.turnRate = 0.16;
      this.themeColor = '#00f0ff';
      this.img = ASSET_IMAGES['elias'];
      this.voiceQuoteMap = [
        { voice: 'elias_1', text: 'الهروب لا يليق بمقامي' },
        { voice: 'elias_2', text: 'جمّدت تحكمك!' },
        { voice: 'elias_3', text: 'ما رح تقدر تتحرك!' }
      ];
      this.quotes = this.voiceQuoteMap.map(q => q.text);
      this.toolType = 'controller';
    } else if (this.type === 'qamar') {
      this.name = 'قمر';
      this.baseSpeed = 260;
      this.turnRate = 0.13;
      this.themeColor = '#ff66cc';
      this.img = ASSET_IMAGES['qamar'];
      this.voiceQuoteMap = [
        { voice: 'qamar_1', text: 'بتجري مثل الدجاجة' },
        { voice: 'qamar_2', text: 'تاج الأميرة يعكس اتجاهك!' },
        { voice: 'qamar_3', text: 'احذر التاج!' }
      ];
      this.quotes = this.voiceQuoteMap.map(q => q.text);
      this.toolType = 'tiara';
    } else {
      this.name = 'وحش';
      this.baseSpeed = 250;
      this.turnRate = 0.12;
      this.themeColor = '#ff3366';
      this.img = null;
      this.voiceQuoteMap = [];
      this.quotes = ["جايك!"];
      this.toolType = null;
    }

    if (this.difficulty === 'easy') this.baseSpeed *= 0.82;
    if (this.difficulty === 'hard') this.baseSpeed *= 1.22;
  }

  update(dt, playerX, playerY, arenaWidth, arenaHeight, obstacles, doors, particles) {
    if (this.speechDisplayTimer > 0) {
      this.speechDisplayTimer -= dt;
    }
    if (this.proximityTriggerCooldown > 0) {
      this.proximityTriggerCooldown -= dt;
    }

    // Update Item Cooldown
    if (this.itemCooldown > 0) {
      this.itemCooldown -= dt;
      if (this.itemCooldown <= 0) {
        this.canUseItem = true;
      }
    }

    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      return;
    }

    // Proximity Subtitle Speech Trigger when approaching player
    const distToPlayer = Math.hypot(playerX - this.x, playerY - this.y);
    if (distToPlayer < 650 && this.proximityTriggerCooldown <= 0 && this.speechDisplayTimer <= 0) {
      this.proximityTriggerCooldown = 7.0;
      this.triggerQuote();
    }

    this.memeTimer += dt;
    if (this.memeTimer >= this.memeInterval) {
      this.memeTimer = 0;
      this.memeInterval = 5.0 + Math.random() * 3.0;
      if (this.speechDisplayTimer <= 0) {
        this.triggerQuote();
      }
    }

    const currentSpeed = this.baseSpeed;
    const targetDx = playerX - this.x;
    const targetDy = playerY - this.y;
    const targetAngle = Math.atan2(targetDy, targetDx);

    let diffAngle = targetAngle - this.angle;
    while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
    while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;

    this.angle += diffAngle * Math.min(1.0, this.turnRate * 60 * dt);

    let nextX = this.x + Math.cos(this.angle) * currentSpeed * dt;
    let nextY = this.y + Math.sin(this.angle) * currentSpeed * dt;

    for (const obs of obstacles) {
      const col = obs.checkCollision(nextX, nextY, this.radius);
      if (col.collided) {
        nextX += col.normalX * col.overlap;
        nextY += col.normalY * col.overlap;
      }
    }

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

  draw(ctx, particles, isNightMode = false) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Rage/Boss Glowing Aura if attack count > 0 or isBoss
    if (this.isBoss || this.attackCount > 0) {
      const glowColor = this.themeColor || '#aa00ff';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = Math.min(15 + this.attackCount * 4, 35);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8 + Math.min(this.attackCount, 8), 0, Math.PI * 2);
      ctx.fillStyle = glowColor + '33';
      ctx.fill();
    }

    // Freeze visual indicator (icy blue aura only when frozen)
    if (this.freezeTimer > 0) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 200, 255, 0.35)';
      ctx.fill();
    }

    ctx.rotate(this.angle);

    const imgSize = this.radius * 2.7;
    const img = this.img || ASSET_IMAGES[this.type];
    if (img && (img.naturalWidth > 0 || img.complete)) {
      ctx.drawImage(img, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
    } else {
      ctx.fillStyle = this.themeColor;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.name, 0, 0);
    }

    ctx.restore();

    this.drawCooldownIndicator(ctx);

    if (this.speechDisplayTimer > 0 && this.currentQuote) {
      this.drawSpeechBubble(ctx);
    }
  }

  drawCooldownIndicator(ctx) {
    if (!this.isBoss && this.attackCount === 0 && this.itemCooldown <= 0) return;

    ctx.save();
    const toolIcons = {
      slipper: '👡',
      wand: '🪄',
      controller: '🎮',
      tiara: '👑'
    };
    const icon = toolIcons[this.toolType || 'wand'] || '⚡';

    const barWidth = 60;
    const barHeight = 6;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.radius - 24;

    // Badge Box
    ctx.fillStyle = 'rgba(15, 12, 32, 0.88)';
    ctx.strokeStyle = this.canUseItem ? '#ff0044' : (this.themeColor || '#00f0ff');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(barX - 16, barY - 5, barWidth + 32, barHeight + 10, 6);
    ctx.fill();
    ctx.stroke();

    // Progress Bar
    const progress = this.canUseItem ? 1.0 : Math.max(0, 1.0 - (this.itemCooldown / 10.0));
    ctx.fillStyle = this.canUseItem ? '#ff0044' : (this.themeColor || '#00f0ff');
    ctx.beginPath();
    ctx.roundRect(barX + 4, barY, (barWidth - 4) * progress, barHeight, 3);
    ctx.fill();

    // Icon & Text
    ctx.font = 'bold 11px Cairo, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, barX - 6, barY + 3);

    if (this.canUseItem) {
      ctx.fillStyle = '#ff0044';
      ctx.fillText('🔥', barX + barWidth + 8, barY + 3);
    } else {
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(`${Math.ceil(this.itemCooldown)}s`, barX + barWidth + 8, barY + 3);
    }

    ctx.restore();
  }

  drawSpeechBubble(ctx) {
    const text = `💬 ${this.name}: "${this.currentQuote}"`;
    ctx.save();
    ctx.font = 'bold 15px Cairo, Tajawal, sans-serif';

    const padding = 14;
    const textWidth = ctx.measureText(text).width;
    const boxWidth = Math.max(textWidth + padding * 2, 140);
    const boxHeight = 36;
    const boxX = this.x - boxWidth / 2;
    const boxY = this.y - this.radius - 55;

    // Outer dark bubble with glowing accent border
    ctx.shadowColor = this.themeColor || 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(15, 12, 32, 0.95)';
    ctx.strokeStyle = this.themeColor || '#00f0ff';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Triangle arrow pointer
    ctx.fillStyle = 'rgba(15, 12, 32, 0.95)';
    ctx.beginPath();
    ctx.moveTo(this.x - 7, boxY + boxHeight);
    ctx.lineTo(this.x, boxY + boxHeight + 8);
    ctx.lineTo(this.x + 7, boxY + boxHeight);
    ctx.fill();

    // Text with crisp color
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.x, boxY + boxHeight / 2);
    ctx.restore();
  }
}

/**
 * Monster Tool Item (Wand, Controller, Tiara) dropped during Chase Mode
 */
class MonsterToolItem {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'wand', 'controller', 'tiara'
    this.radius = 24;
    this.isCollected = false;
    this.animTimer = Math.random() * Math.PI * 2;
    this.lifespan = 18.0;
  }

  update(dt) {
    this.animTimer += dt * 3.5;
    this.lifespan -= dt;
  }

  draw(ctx) {
    if (this.isCollected || this.lifespan <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const floatOffset = Math.sin(this.animTimer) * 5;
    ctx.translate(0, floatOffset);

    let color = '#aa00ff';
    let icon = '🪄';

    if (this.type === 'controller') {
      color = '#00f0ff';
      icon = '🎮';
    } else if (this.type === 'tiara') {
      color = '#ff66cc';
      icon = '👑';
    }

    ctx.shadowColor = color;
    ctx.shadowBlur = 18;

    ctx.fillStyle = color + '44';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
    ctx.fill();

    const toolImg = ASSET_IMAGES[this.type];
    if (toolImg && toolImg.complete && toolImg.naturalWidth > 0) {
      const tSize = this.radius * 2.5;
      ctx.drawImage(toolImg, -tSize / 2, -tSize / 2, tSize, tSize);
    } else {
      ctx.font = '24px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, 0, 0);
    }

    ctx.restore();
  }
}

window.Entities = {
  Particle,
  Player,
  KenanMonster,
  KenanClone,
  ChaseMonster,
  MonsterToolItem,
  BananaTrap,
  SpeedBoostPad,
  InteractiveDoor,
  Obstacle,
  PowerUp,
  StoryItem,
  ExitGate,
  CollectibleSlipper,
  PushableCrate,
  SlipperProjectile,
  MonsterProjectile,
  STORY_STAGES,
  STAGE_BG_IMAGES,
  ASSET_IMAGES,
  LOSS_QUOTES
};
