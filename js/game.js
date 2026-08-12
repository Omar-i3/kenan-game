/**
 * Main Game Controller Engine for Monster Kenan 2D (Expansion & PWA Edition)
 */
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.minimapCanvas = document.getElementById('minimapCanvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
    this.difficulty = 'normal';

    this.score = 0.0;
    this.highScores = {
      easy: parseFloat(localStorage.getItem('kenan_highscore_easy') || '0.0'),
      normal: parseFloat(localStorage.getItem('kenan_highscore_normal') || '0.0'),
      hard: parseFloat(localStorage.getItem('kenan_highscore_hard') || '0.0')
    };

    // Camera State
    this.camera = { x: 0, y: 0 };

    // Entities
    this.player = null;
    this.kenan = null;
    this.clones = [];
    this.obstacles = [];
    this.doors = [];
    this.speedPads = [];
    this.bananaTraps = [];
    this.powerUps = [];
    this.particles = [];

    // Timers & State Flags
    this.powerUpSpawnTimer = 0;
    this.nextPowerUpDelay = 10;
    this.rageTriggered = false;
    this.clonesTriggered = false;
    this.isNightMode = false;
    this.lightningTimer = 0;
    this.activePowerUp = null;

    this.lastTime = 0;

    this.initCanvas();
    this.initUI();
    this.updateHighScoreDisplay();

    requestAnimationFrame((ts) => this.loop(ts));
  }

  initCanvas() {
    const resize = () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;

      this.minimapCanvas.width = 120;
      this.minimapCanvas.height = 90;

      // Arena size expanded by 70%
      this.arenaWidth = Math.round(this.width * 1.7);
      this.arenaHeight = Math.round(this.height * 1.7);
    };
    window.addEventListener('resize', resize);
    resize();
  }

  initUI() {
    // Attempt Auto Screen Orientation Lock to Landscape
    const lockLandscape = () => {
      try {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (e) {}
    };
    window.addEventListener('touchstart', lockLandscape, { once: true });
    lockLandscape();

    // Check Orientation for Mobile Prompt Overlay
    const checkOrientation = () => {
      const overlay = document.getElementById('orientation-overlay');
      if (overlay) {
        if (window.innerHeight > window.innerWidth && window.innerWidth < 768) {
          overlay.classList.remove('hidden');
        } else {
          overlay.classList.add('hidden');
        }
      }
    };
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation();

    // Button event binder (pointerdown + click for instant touch response)
    const bindBtn = (id, handler) => {
      const el = document.getElementById(id);
      if (!el) return;
      let fired = false;
      const fn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (fired) return;
        fired = true;
        setTimeout(() => { fired = false; }, 250);
        handler(e);
      };
      el.addEventListener('pointerdown', fn);
      el.addEventListener('click', fn);
    };

    // Difficulty Buttons
    const diffBtns = document.querySelectorAll('.diff-btn');
    diffBtns.forEach(btn => {
      const handler = (e) => {
        e.stopPropagation();
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.difficulty = btn.dataset.diff;
        this.updateHighScoreDisplay();
        window.hapticsManager.triggerTac();
      };
      btn.addEventListener('pointerdown', handler);
      btn.addEventListener('click', handler);
    });

    bindBtn('start-btn', () => {
      lockLandscape();
      this.startGame();
      window.hapticsManager.triggerTac();
    });

    bindBtn('pause-btn', () => {
      this.pauseGame();
      window.hapticsManager.triggerTac();
    });

    bindBtn('resume-btn', () => {
      this.resumeGame();
      window.hapticsManager.triggerTac();
    });

    bindBtn('pause-main-menu-btn', () => {
      this.returnToMenu();
      window.hapticsManager.triggerTac();
    });

    bindBtn('restart-btn', () => {
      this.startGame();
      window.hapticsManager.triggerTac();
    });

    bindBtn('main-menu-btn', () => {
      this.returnToMenu();
      window.hapticsManager.triggerTac();
    });

    bindBtn('dash-btn', () => {
      if (this.player) this.player.triggerDash();
    });

    bindBtn('banana-btn', () => {
      this.dropBananaTrap();
    });

    const audioBtn = document.getElementById('audio-toggle-btn');
    if (audioBtn) {
      const handler = (e) => {
        e.stopPropagation();
        const isMuted = window.audioManager.toggleMute();
        audioBtn.innerText = isMuted ? '🔇 الصوت: مكتوم' : '🔊 الصوت: مفعّل';
        window.hapticsManager.triggerTac();
      };
      audioBtn.addEventListener('pointerdown', handler);
      audioBtn.addEventListener('click', handler);
    }
  }

  dropBananaTrap() {
    if (this.state !== 'PLAYING' || !this.player) return;
    if (this.player.bananaTraps > 0) {
      this.player.bananaTraps--;
      document.getElementById('banana-count').innerText = this.player.bananaTraps;
      this.bananaTraps.push(new window.Entities.BananaTrap(this.player.x, this.player.y));
      window.hapticsManager.triggerTac();
    }
  }

  updateHighScoreDisplay() {
    const hs = this.highScores[this.difficulty] || 0.0;
    document.getElementById('start-high-score-val').innerText = hs.toFixed(1);
  }

  setupArena() {
    this.score = 0.0;
    this.rageTriggered = false;
    this.clonesTriggered = false;
    this.isNightMode = false;
    this.clones = [];
    this.powerUps = [];
    this.bananaTraps = [];
    this.particles = [];
    this.activePowerUp = null;

    this.powerUpSpawnTimer = 0;
    this.nextPowerUpDelay = 10 + Math.random() * 5;

    document.getElementById('rage-banner').classList.add('hidden');
    document.getElementById('powerup-indicator').classList.add('hidden');
    const jumpscare = document.getElementById('jumpscare-overlay');
    if (jumpscare) jumpscare.classList.add('hidden');

    // Spawn Player
    this.player = new window.Entities.Player(this.arenaWidth / 2, this.arenaHeight / 2);
    document.getElementById('banana-count').innerText = this.player.bananaTraps;

    // Spawn Kenan (Enlarged!)
    this.kenan = new window.Entities.KenanMonster(100, 100, this.difficulty);

    // Hard Mode Micro Jitter
    const container = document.getElementById('game-container');
    if (this.difficulty === 'hard') container.classList.add('hard-jitter');
    else container.classList.remove('hard-jitter');

    // Expanded Map Obstacles
    this.obstacles = [
      new window.Entities.Obstacle(this.arenaWidth * 0.25, this.arenaHeight * 0.25, 45, 'طاولة ضخمة 1'),
      new window.Entities.Obstacle(this.arenaWidth * 0.75, this.arenaHeight * 0.25, 45, 'طاولة ضخمة 2'),
      new window.Entities.Obstacle(this.arenaWidth * 0.50, this.arenaHeight * 0.50, 55, 'عمود ممر رئيسي'),
      new window.Entities.Obstacle(this.arenaWidth * 0.25, this.arenaHeight * 0.75, 40, 'حاجز خشب 1'),
      new window.Entities.Obstacle(this.arenaWidth * 0.75, this.arenaHeight * 0.75, 40, 'حاجز خشب 2')
    ];

    // Interactive Corridor Doors
    this.doors = [
      new window.Entities.InteractiveDoor(this.arenaWidth * 0.38, this.arenaHeight * 0.35, 90, 24, 'باب الممر الشمالي'),
      new window.Entities.InteractiveDoor(this.arenaWidth * 0.62, this.arenaHeight * 0.65, 90, 24, 'باب الممر الجنوبي')
    ];

    // Speed Boost Pads
    this.speedPads = [
      new window.Entities.SpeedBoostPad(this.arenaWidth * 0.20, this.arenaHeight * 0.50),
      new window.Entities.SpeedBoostPad(this.arenaWidth * 0.80, this.arenaHeight * 0.50),
      new window.Entities.SpeedBoostPad(this.arenaWidth * 0.50, this.arenaHeight * 0.20),
      new window.Entities.SpeedBoostPad(this.arenaWidth * 0.50, this.arenaHeight * 0.80)
    ];
  }

  startGame() {
    this.setupArena();
    this.state = 'PLAYING';

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('hud-layer').classList.remove('hidden');

    window.audioManager.startChase();
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    document.getElementById('pause-screen').classList.remove('hidden');
    window.audioManager.stopChase();
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    document.getElementById('pause-screen').classList.add('hidden');
    window.audioManager.startChase();
  }

  returnToMenu() {
    this.state = 'MENU';
    window.audioManager.stopChase();
    document.getElementById('hud-layer').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    this.updateHighScoreDisplay();
  }

  getFunnyTitleBadge(score) {
    if (score < 10.0) return '🎣 لقب: "صيد سهل"';
    if (score < 25.0) return '🏃💨 لقب: "عداء الفزعة"';
    if (score < 40.0) return '⚽ لقب: "مراوغ المحترفين"';
    return '👑⚡ لقب: "أسطورة الهروب"';
  }

  gameOver() {
    this.state = 'GAMEOVER';
    window.audioManager.playImpact();
    window.hapticsManager.triggerImpact();

    const container = document.getElementById('game-container');
    container.classList.add('shake-screen');
    setTimeout(() => container.classList.remove('shake-screen'), 600);

    // Reveal Fullscreen Kenan Jumpscare
    const jumpscare = document.getElementById('jumpscare-overlay');
    if (jumpscare) jumpscare.classList.remove('hidden');

    // Save High Score
    const currentHs = this.highScores[this.difficulty] || 0.0;
    let isNewRecord = false;
    if (this.score > currentHs) {
      this.highScores[this.difficulty] = this.score;
      localStorage.setItem(`kenan_highscore_${this.difficulty}`, this.score.toFixed(1));
      isNewRecord = true;
    }

    const quotes = window.Entities.LOSS_QUOTES;
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('loss-quote').innerText = `"${randomQuote}"`;

    // Funny Title Badge
    document.getElementById('loss-title-badge').innerText = this.getFunnyTitleBadge(this.score);

    const badge = document.getElementById('new-record-badge');
    if (isNewRecord) badge.classList.remove('hidden');
    else badge.classList.add('hidden');

    document.getElementById('final-score').innerText = `${this.score.toFixed(1)}s`;
    document.getElementById('high-score').innerText = `${this.highScores[this.difficulty].toFixed(1)}s`;

    // Transition from Jumpscare to Game Over Screen after 1.2 seconds
    setTimeout(() => {
      if (jumpscare) jumpscare.classList.add('hidden');
      document.getElementById('hud-layer').classList.add('hidden');
      document.getElementById('game-over-screen').classList.remove('hidden');
    }, 1200);
  }

  spawnPowerUp() {
    const padding = 100;
    const x = padding + Math.random() * (this.arenaWidth - padding * 2);
    const y = padding + Math.random() * (this.arenaHeight - padding * 2);
    const r = Math.random();
    let type = 'speed';
    if (r < 0.35) type = 'freeze';
    else if (r < 0.70) type = 'banana';

    this.powerUps.push(new window.Entities.PowerUp(x, y, type));
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    this.score += dt;
    document.getElementById('hud-timer').innerText = `${this.score.toFixed(1)}s`;

    // Timeline Event 30s: Rage Mode
    if (this.score >= 30.0 && !this.rageTriggered) {
      this.rageTriggered = true;
      this.kenan.setRageMode(true);
      document.getElementById('rage-banner').classList.remove('hidden');
      window.hapticsManager.triggerTac();
    }

    if (this.rageTriggered) {
      this.lightningTimer += dt;
      if (this.lightningTimer >= 5.0) {
        this.lightningTimer = 0;
        const lightning = document.getElementById('lightning-overlay');
        lightning.classList.add('flash');
        setTimeout(() => lightning.classList.remove('flash'), 120);
      }
    }

    // Timeline Event 40s: Night Mode
    if (this.score >= 40.0 && !this.isNightMode) {
      this.isNightMode = true;
      window.hapticsManager.triggerTac();
    }

    // Timeline Event 45s: Kenan Clones
    if (this.score >= 45.0 && !this.clonesTriggered) {
      this.clonesTriggered = true;
      this.clones.push(new window.Entities.KenanClone(this.arenaWidth * 0.3, this.arenaHeight * 0.3));
      this.clones.push(new window.Entities.KenanClone(this.arenaWidth * 0.7, this.arenaHeight * 0.7));
      window.hapticsManager.triggerTac();
    }

    // Power-Up Spawner
    this.powerUpSpawnTimer += dt;
    if (this.powerUpSpawnTimer >= this.nextPowerUpDelay) {
      this.powerUpSpawnTimer = 0;
      this.nextPowerUpDelay = 10 + Math.random() * 5;
      if (this.powerUps.length < 3) this.spawnPowerUp();
    }

    // Inputs & Updates
    const inputVector = window.joystickController.getVector();
    this.player.update(dt, inputVector, this.arenaWidth, this.arenaHeight, this.obstacles, this.doors);
    this.kenan.update(dt, this.player.x, this.player.y, this.arenaWidth, this.arenaHeight, this.obstacles, this.doors, this.particles);

    this.clones.forEach(c => c.update(dt, this.arenaWidth, this.arenaHeight, this.obstacles));
    this.powerUps.forEach(pu => pu.update(dt));
    this.speedPads.forEach(sp => sp.update(dt));
    this.powerUps = this.powerUps.filter(pu => pu.lifespan > 0);

    this.particles.forEach(p => p.update(dt));
    this.particles = this.particles.filter(p => p.life > 0);

    // Smooth Camera Follow
    const targetCamX = this.player.x - this.width / 2;
    const targetCamY = this.player.y - this.height / 2;
    this.camera.x += (targetCamX - this.camera.x) * 0.1;
    this.camera.y += (targetCamY - this.camera.y) * 0.1;
    this.camera.x = Math.min(Math.max(this.camera.x, 0), this.arenaWidth - this.width);
    this.camera.y = Math.min(Math.max(this.camera.y, 0), this.arenaHeight - this.height);

    // Dash Cooldown Gauge
    const dashCooldownEl = document.getElementById('dash-cooldown');
    if (this.player.dashCooldown > 0) {
      dashCooldownEl.classList.remove('hidden');
      dashCooldownEl.innerText = `${Math.ceil(this.player.dashCooldown)}s`;
    } else {
      dashCooldownEl.classList.add('hidden');
    }

    // Active PowerUp Indicator Bar
    if (this.activePowerUp) {
      this.activePowerUp.timer -= dt;
      const fillBar = document.getElementById('powerup-bar-fill');
      fillBar.style.width = `${Math.max(0, (this.activePowerUp.timer / this.activePowerUp.duration) * 100)}%`;
      if (this.activePowerUp.timer <= 0) {
        this.activePowerUp = null;
        document.getElementById('powerup-indicator').classList.add('hidden');
      }
    }

    // Proximity Effects & Screams
    const distToKenan = Math.hypot(this.player.x - this.kenan.x, this.player.y - this.kenan.y);
    const maxDiag = Math.hypot(this.arenaWidth, this.arenaHeight);
    const now = performance.now();

    window.audioManager.updateProximity(distToKenan, maxDiag * 0.5, this.rageTriggered);
    window.hapticsManager.updateProximity(distToKenan, maxDiag * 0.5, now);

    if (distToKenan < 130) {
      window.soundEffectsManager.playPanicVoice();
    }

    // Collisions: Player vs Kenan Real
    if (distToKenan < (this.player.radius + this.kenan.radius - 8)) {
      this.gameOver();
      return;
    }

    // Collisions: Kenan vs Banana Traps
    this.bananaTraps.forEach((trap, idx) => {
      const dist = Math.hypot(this.kenan.x - trap.x, this.kenan.y - trap.y);
      if (dist < (this.kenan.radius + trap.radius)) {
        this.kenan.slipOnBanana();
        this.bananaTraps.splice(idx, 1);
      }
    });

    // Collisions: Player vs Speed Boost Pads
    this.speedPads.forEach(pad => {
      const dist = Math.hypot(this.player.x - pad.x, this.player.y - pad.y);
      if (dist < (this.player.radius + pad.radius)) {
        this.player.padSpeedBoostTimer = 2.0;
        window.hapticsManager.triggerTac();
      }
    });

    // Collisions: Player vs PowerUps
    this.powerUps.forEach((pu, idx) => {
      const dist = Math.hypot(this.player.x - pu.x, this.player.y - pu.y);
      if (dist < (this.player.radius + pu.radius)) {
        window.hapticsManager.triggerTac();
        if (pu.type === 'speed') {
          this.player.speedBoostTimer = 3.0;
          this.activePowerUp = { type: 'speed', timer: 3.0, duration: 3.0 };
          document.getElementById('powerup-icon').innerText = '⚡';
        } else if (pu.type === 'freeze') {
          this.kenan.freeze(1.5);
          this.activePowerUp = { type: 'freeze', timer: 1.5, duration: 1.5 };
          document.getElementById('powerup-icon').innerText = '❄️';
        } else if (pu.type === 'banana') {
          this.player.bananaTraps++;
          document.getElementById('banana-count').innerText = this.player.bananaTraps;
        }
        document.getElementById('powerup-indicator').classList.remove('hidden');
        this.powerUps.splice(idx, 1);
      }
    });

    // Collisions: Player vs Clones
    this.clones.forEach(clone => {
      const dist = Math.hypot(this.player.x - clone.x, this.player.y - clone.y);
      if (dist < (this.player.radius + clone.radius)) {
        window.hapticsManager.triggerTac();
        for (let i = 0; i < 4; i++) {
          this.particles.push(new window.Entities.Particle(
            clone.x, clone.y, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100,
            '#aa00ff', 6, 0.3
          ));
        }
      }
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    this.drawArenaGrid();
    this.speedPads.forEach(sp => sp.draw(this.ctx));
    this.doors.forEach(d => d.draw(this.ctx));
    this.obstacles.forEach(obs => obs.draw(this.ctx));
    this.bananaTraps.forEach(bt => bt.draw(this.ctx));
    this.powerUps.forEach(pu => pu.draw(this.ctx));
    this.particles.forEach(p => p.draw(this.ctx));
    this.clones.forEach(clone => clone.draw(this.ctx));

    if (this.kenan) this.kenan.draw(this.ctx, this.particles, this.isNightMode);

    if (this.player) {
      if (this.isNightMode) this.player.drawFlashlightBeam(this.ctx);
      this.player.draw(this.ctx, this.particles, this.isNightMode);
    }

    if (this.isNightMode) {
      this.drawNightDarknessOverlay();
    }

    this.ctx.restore();

    this.renderMinimap();
  }

  drawNightDarknessOverlay() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(5, 3, 14, 0.88)';
    this.ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);
    this.ctx.restore();
  }

  drawArenaGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    const gridSize = 70;
    for (let x = 0; x < this.arenaWidth; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.arenaHeight);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.arenaHeight; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width ? this.arenaWidth : 2000);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  renderMinimap() {
    if (this.state !== 'PLAYING') return;

    const mctx = this.minimapCtx;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;

    mctx.clearRect(0, 0, mw, mh);

    const scaleX = mw / this.arenaWidth;
    const scaleY = mh / this.arenaHeight;

    mctx.fillStyle = '#0f0c20';
    mctx.fillRect(0, 0, mw, mh);

    mctx.fillStyle = '#4a3e7a';
    this.obstacles.forEach(obs => {
      mctx.beginPath();
      mctx.arc(obs.x * scaleX, obs.y * scaleY, Math.max(2, obs.radius * scaleX), 0, Math.PI * 2);
      mctx.fill();
    });

    if (this.player) {
      mctx.fillStyle = '#00ff88';
      mctx.beginPath();
      mctx.arc(this.player.x * scaleX, this.player.y * scaleY, 3.5, 0, Math.PI * 2);
      mctx.fill();
    }

    if (this.kenan) {
      mctx.fillStyle = '#ff0044';
      mctx.beginPath();
      mctx.arc(this.kenan.x * scaleX, this.kenan.y * scaleY, 4.5, 0, Math.PI * 2);
      mctx.fill();
    }

    mctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    mctx.lineWidth = 1;
    mctx.strokeRect(this.camera.x * scaleX, this.camera.y * scaleY, this.width * scaleX, this.height * scaleY);
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((ts) => this.loop(ts));
  }
}

window.addEventListener('load', () => {
  window.game = new Game();
});
