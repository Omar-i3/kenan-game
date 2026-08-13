/**
 * Main Game Controller Engine for Monster Kenan 2D (Story Mode & Endless Edition)
 */
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.minimapCanvas = document.getElementById('minimapCanvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.state = 'MENU'; // MENU, STAGE_SELECT, PLAYING, PAUSED, GAMEOVER, VICTORY
    this.gameMode = 'ENDLESS'; // ENDLESS, STORY
    this.difficulty = 'normal';

    // Story Mode State
    this.currentStageId = 1;
    this.unlockedStage = parseInt(localStorage.getItem('kenan_unlocked_stage') || '1', 10);
    this.storyItems = [];
    this.collectibleSlippers = [];
    this.pushableCrates = [];
    this.slippers = [];
    this.exitGate = null;
    this.stageItemsCollected = 0;
    this.stageItemsTotal = 0;

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
    this.weatherRain = false;

    this.lastTime = performance.now();

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

      this.minimapCanvas.width = 110;
      this.minimapCanvas.height = 80;

      // Expanded Massive Map Arena (4500 x 3200)
      this.arenaWidth = 4500;
      this.arenaHeight = 3200;
    };
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 200));
    resize();
  }

  initUI() {
    // Lock Screen Orientation to Landscape
    const lockLandscape = () => {
      window.audioManager.unlockAudio();
      try {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (e) {}
    };
    window.addEventListener('touchstart', lockLandscape, { passive: true });
    window.addEventListener('pointerdown', lockLandscape, { passive: true });
    lockLandscape();

    // Check Orientation Prompt Overlay
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

    // Fast Button Binder (click + touchstart)
    const bindBtn = (id, handler) => {
      const el = document.getElementById(id);
      if (!el) return;
      let fired = false;
      const fn = (e) => {
        if (fired) return;
        fired = true;
        setTimeout(() => { fired = false; }, 200);
        window.audioManager.unlockAudio();
        handler(e);
      };
      el.addEventListener('click', fn);
      el.addEventListener('touchstart', (e) => {
        fn(e);
      }, { passive: true });
    };

    // Mode Toggle Buttons (Endless vs Story Mode)
    bindBtn('mode-endless-btn', () => {
      this.gameMode = 'ENDLESS';
      document.getElementById('mode-endless-btn').classList.add('active');
      document.getElementById('mode-story-btn').classList.remove('active');
      document.getElementById('endless-options-box').classList.remove('hidden');
      document.getElementById('story-options-box').classList.add('hidden');
    });

    bindBtn('mode-story-btn', () => {
      this.gameMode = 'STORY';
      document.getElementById('mode-story-btn').classList.add('active');
      document.getElementById('mode-endless-btn').classList.remove('active');
      document.getElementById('endless-options-box').classList.add('hidden');
      document.getElementById('story-options-box').classList.remove('hidden');
    });

    bindBtn('open-story-stages-btn', () => {
      this.openStageSelectScreen();
    });

    bindBtn('close-stages-btn', () => {
      document.getElementById('stage-select-screen').classList.add('hidden');
      document.getElementById('start-screen').classList.remove('hidden');
    });

    // Difficulty Buttons for Endless Mode
    const diffBtns = document.querySelectorAll('.diff-btn');
    diffBtns.forEach(btn => {
      const handler = (e) => {
        e.stopPropagation();
        window.audioManager.unlockAudio();
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
      this.startEndlessGame();
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
      document.getElementById('victory-screen').classList.add('hidden');
      document.getElementById('game-over-screen').classList.add('hidden');
      if (this.gameMode === 'STORY') {
        this.startStoryStage(this.currentStageId);
      } else {
        this.startEndlessGame();
      }
      window.hapticsManager.triggerTac();
    });

    bindBtn('main-menu-btn', () => {
      this.returnToMenu();
      window.hapticsManager.triggerTac();
    });

    bindBtn('next-stage-btn', () => {
      document.getElementById('victory-screen').classList.add('hidden');
      if (this.currentStageId < 10) {
        this.startStoryStage(this.currentStageId + 1);
      } else {
        this.openStageSelectScreen();
      }
      window.hapticsManager.triggerTac();
    });

    bindBtn('victory-menu-btn', () => {
      document.getElementById('victory-screen').classList.add('hidden');
      this.openStageSelectScreen();
      window.hapticsManager.triggerTac();
    });

    bindBtn('dash-btn', () => {
      if (this.player) this.player.triggerDash();
    });

    bindBtn('banana-btn', () => {
      this.dropBananaTrap();
    });

    bindBtn('slipper-btn', () => {
      this.throwSlipper();
    });

    // Keyboard 'F' listener for slipper throw
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF') {
        this.throwSlipper();
      }
    });

    const audioBtn = document.getElementById('audio-toggle-btn');
    if (audioBtn) {
      const handler = (e) => {
        e.stopPropagation();
        window.audioManager.unlockAudio();
        const isMuted = window.audioManager.toggleMute();
        audioBtn.innerText = isMuted ? '🔇 الصوت: مكتوم' : '🔊 الصوت: مفعّل';
        window.hapticsManager.triggerTac();
      };
      audioBtn.addEventListener('pointerdown', handler);
      audioBtn.addEventListener('click', handler);
    }
  }

  openStageSelectScreen() {
    this.state = 'STAGE_SELECT';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('hud-layer').classList.add('hidden');

    const grid = document.getElementById('stage-cards-grid');
    grid.innerHTML = '';

    const stages = window.Entities.STORY_STAGES;
    stages.forEach(stg => {
      const card = document.createElement('div');
      const isUnlocked = stg.id <= this.unlockedStage;

      card.className = `stage-card ${isUnlocked ? 'unlocked' : 'locked'} ${stg.isBossFight ? 'boss-card' : ''}`;
      
      card.innerHTML = `
        <div class="stage-num">${stg.isBossFight ? '👹 BOSS' : `المرحلة ${stg.id}`}</div>
        <div class="stage-title">${stg.name.split(':')[1] || stg.name}</div>
        <div class="stage-icon">${isUnlocked ? stg.icon : '🔒'}</div>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          this.startStoryStage(stg.id);
        });
      }

      grid.appendChild(card);
    });

    document.getElementById('stage-select-screen').classList.remove('hidden');
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

  throwSlipper() {
    if (this.state !== 'PLAYING' || !this.player || !this.kenan) return;
    
    // Check if player has slippers or is in Boss Fight
    if (!this.kenan.isBoss && this.player.slippers <= 0) return;

    if (!this.kenan.isBoss) {
      this.player.slippers--;
      this.updateSlipperHudBadge();
    }

    // Launch slipper towards Kenan
    this.slippers.push(new window.Entities.SlipperProjectile(
      this.player.x, this.player.y,
      this.kenan.x, this.kenan.y
    ));
    
    window.soundEffectsManager.playDashSound();
    window.hapticsManager.triggerTac();
  }

  updateSlipperHudBadge() {
    const slipperBtn = document.getElementById('slipper-btn');
    const badge = document.getElementById('slipper-count-badge');
    if (!slipperBtn || !badge) return;

    if (this.kenan && this.kenan.isBoss) {
      slipperBtn.classList.remove('hidden');
      badge.innerText = '∞';
    } else if (this.player && this.player.slippers > 0) {
      slipperBtn.classList.remove('hidden');
      badge.innerText = this.player.slippers;
    } else {
      slipperBtn.classList.add('hidden');
    }
  }

  updateHighScoreDisplay() {
    const hs = this.highScores[this.difficulty] || 0.0;
    document.getElementById('start-high-score-val').innerText = hs.toFixed(1);
  }

  setupBaseArena() {
    this.score = 0.0;
    this.rageTriggered = false;
    this.clonesTriggered = false;
    this.isNightMode = false;
    this.weatherRain = false;
    this.clones = [];
    this.powerUps = [];
    this.bananaTraps = [];
    this.particles = [];
    this.storyItems = [];
    this.collectibleSlippers = [];
    this.pushableCrates = [];
    this.slippers = [];
    this.activePowerUp = null;

    this.powerUpSpawnTimer = 0;
    this.nextPowerUpDelay = 10 + Math.random() * 5;

    document.getElementById('rage-banner').classList.add('hidden');
    document.getElementById('powerup-indicator').classList.add('hidden');
    document.getElementById('hud-objective-banner').classList.add('hidden');
    document.getElementById('boss-health-container').classList.add('hidden');
    document.getElementById('slipper-btn').classList.add('hidden');

    const jumpscare = document.getElementById('jumpscare-overlay');
    if (jumpscare) jumpscare.classList.add('hidden');

    // Spawn Player at Center of 4500x3200 Arena
    this.player = new window.Entities.Player(this.arenaWidth / 2, this.arenaHeight / 2);
    document.getElementById('banana-count').innerText = this.player.bananaTraps;

    // Exit Gate Portal Position (Far Corner)
    this.exitGate = new window.Entities.ExitGate(this.arenaWidth - 280, this.arenaHeight - 280);

    // Spawn Kenan Pursuer
    this.kenan = new window.Entities.KenanMonster(200, 200, this.difficulty);

    // Hard Mode Jitter
    const container = document.getElementById('game-container');
    if (this.gameMode === 'ENDLESS' && this.difficulty === 'hard') container.classList.add('hard-jitter');
    else container.classList.remove('hard-jitter');

    // Base Arena Obstacles & Speed Pads across 4500x3200 map
    this.obstacles = [
      new window.Entities.Obstacle(this.arenaWidth * 0.20, this.arenaHeight * 0.20, 65, 'طاولة 1'),
      new window.Entities.Obstacle(this.arenaWidth * 0.80, this.arenaHeight * 0.20, 65, 'طاولة 2'),
      new window.Entities.Obstacle(this.arenaWidth * 0.50, this.arenaHeight * 0.35, 75, 'عمود ممر شمالي'),
      new window.Entities.Obstacle(this.arenaWidth * 0.50, this.arenaHeight * 0.65, 75, 'عمود ممر جنوبي'),
      new window.Entities.Obstacle(this.arenaWidth * 0.20, this.arenaHeight * 0.80, 60, 'حاجز خشب 1'),
      new window.Entities.Obstacle(this.arenaWidth * 0.80, this.arenaHeight * 0.80, 60, 'حاجز خشب 2')
    ];

    this.doors = [
      new window.Entities.InteractiveDoor(this.arenaWidth * 0.35, this.arenaHeight * 0.30, 110, 30, 'باب الشمال'),
      new window.Entities.InteractiveDoor(this.arenaWidth * 0.65, this.arenaHeight * 0.70, 110, 30, 'باب الجنوب')
    ];

    this.speedPads = [
      new window.Entities.SpeedBoostPad(this.arenaWidth * 0.15, this.arenaHeight * 0.50),
      new window.Entities.SpeedBoostPad(this.arenaWidth * 0.85, this.arenaHeight * 0.50),
      new window.Entities.SpeedBoostPad(this.arenaWidth * 0.50, this.arenaHeight * 0.15),
      new window.Entities.SpeedBoostPad(this.arenaWidth * 0.50, this.arenaHeight * 0.85)
    ];
  }

  startEndlessGame() {
    this.gameMode = 'ENDLESS';
    this.setupBaseArena();
    this.state = 'PLAYING';
    this.lastTime = performance.now();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('stage-select-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('hud-layer').classList.remove('hidden');

    window.audioManager.startChase();
  }

  startStoryStage(stageId) {
    this.gameMode = 'STORY';
    this.currentStageId = stageId;
    this.setupBaseArena();

    const stageData = window.Entities.STORY_STAGES.find(s => s.id === stageId);
    if (!stageData) return;

    this.stageItemsCollected = 0;
    this.stageItemsTotal = stageData.itemsNeeded;

    // Apply Specific Stage Mechanics & Objectives
    this.isNightMode = !!stageData.isNightMode;
    this.weatherRain = !!stageData.weatherRain;

    if (stageData.permanentRage) {
      this.rageTriggered = true;
      this.kenan.setRageMode(true);
    }

    if (stageData.hasClones) {
      this.clones.push(new window.Entities.KenanClone(this.arenaWidth * 0.3, this.arenaHeight * 0.3));
      this.clones.push(new window.Entities.KenanClone(this.arenaWidth * 0.7, this.arenaHeight * 0.7));
    }

    // Stage 6 Basement Pushable Crates
    if (stageData.pushableCrates) {
      this.pushableCrates = [
        new window.Entities.PushableCrate(this.arenaWidth * 0.40, this.arenaHeight * 0.40),
        new window.Entities.PushableCrate(this.arenaWidth * 0.60, this.arenaHeight * 0.40),
        new window.Entities.PushableCrate(this.arenaWidth * 0.50, this.arenaHeight * 0.60)
      ];
    }

    // Spawn Collectible Story Items
    if (stageData.itemsNeeded > 0) {
      const positions = [
        { x: this.arenaWidth * 0.25, y: this.arenaHeight * 0.25 },
        { x: this.arenaWidth * 0.75, y: this.arenaHeight * 0.25 },
        { x: this.arenaWidth * 0.25, y: this.arenaHeight * 0.75 },
        { x: this.arenaWidth * 0.75, y: this.arenaHeight * 0.75 }
      ];

      for (let i = 0; i < stageData.itemsNeeded; i++) {
        const pos = positions[i % positions.length];
        this.storyItems.push(new window.Entities.StoryItem(
          pos.x + (Math.random() - 0.5) * 200,
          pos.y + (Math.random() - 0.5) * 200,
          stageData.itemType,
          stageData.icon
        ));
      }
    }

    // Spawn Ground Collectible Slippers (Stages 6 to 10)
    if (stageData.hasSlippers || stageId >= 6) {
      const count = stageData.isBossFight ? 5 : 2;
      for (let i = 0; i < count; i++) {
        this.collectibleSlippers.push(new window.Entities.CollectibleSlipper(
          150 + Math.random() * (this.arenaWidth - 300),
          150 + Math.random() * (this.arenaHeight - 300)
        ));
      }
    }

    // Stage 10 Giant Kenan Boss Fight!
    if (stageData.isBossFight) {
      this.kenan.setAsBoss(100);
      document.getElementById('boss-health-container').classList.remove('hidden');
      this.updateBossHpBar();
    }

    this.updateSlipperHudBadge();

    // Show HUD Objective Banner
    const objBanner = document.getElementById('hud-objective-banner');
    document.getElementById('objective-text').innerText = stageData.objectiveText;
    document.getElementById('objective-count-badge').innerText = stageData.itemsNeeded > 0 ? `0/${stageData.itemsNeeded}` : '⚔️';
    objBanner.classList.remove('hidden');

    this.state = 'PLAYING';
    this.lastTime = performance.now();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('stage-select-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('hud-layer').classList.remove('hidden');

    window.audioManager.startChase();
  }

  updateBossHpBar() {
    if (!this.kenan || !this.kenan.isBoss) return;
    const hp = Math.max(0, this.kenan.bossHp);
    const pct = (hp / this.kenan.maxBossHp) * 100;
    document.getElementById('boss-health-bar-fill').style.width = `${pct}%`;
    document.getElementById('boss-hp-text').innerText = `${hp} / ${this.kenan.maxBossHp} HP`;
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
    this.lastTime = performance.now();
    document.getElementById('pause-screen').classList.add('hidden');
    window.audioManager.startChase();
  }

  returnToMenu() {
    this.state = 'MENU';
    window.audioManager.stopChase();
    document.getElementById('hud-layer').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('stage-select-screen').classList.add('hidden');
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

    const voiceOptions = ['w7sh', 'voice_warak', 'voice_jayak', 'voice_mafer'];
    const selectedVoice = voiceOptions[Math.floor(Math.random() * voiceOptions.length)];
    window.audioManager.playVoice(selectedVoice);
    window.audioManager.stopChase();
    window.hapticsManager.triggerJumpscare();

    const jumpscare = document.getElementById('jumpscare-overlay');
    if (jumpscare) jumpscare.classList.remove('hidden');

    const container = document.getElementById('game-container');
    container.classList.add('shake-screen');
    setTimeout(() => container.classList.remove('shake-screen'), 500);

    let isNewRecord = false;
    if (this.gameMode === 'ENDLESS' && this.score > this.highScores[this.difficulty]) {
      this.highScores[this.difficulty] = this.score;
      localStorage.setItem(`kenan_highscore_${this.difficulty}`, this.score.toFixed(1));
      isNewRecord = true;
    }

    const quotes = window.Entities.LOSS_QUOTES;
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('loss-quote').innerText = `"${randomQuote}"`;

    document.getElementById('loss-title-badge').innerText = this.getFunnyTitleBadge(this.score);

    const badge = document.getElementById('new-record-badge');
    if (isNewRecord) badge.classList.remove('hidden');
    else badge.classList.add('hidden');

    document.getElementById('final-score').innerText = `${this.score.toFixed(1)}s`;
    document.getElementById('high-score').innerText = `${this.highScores[this.difficulty].toFixed(1)}s`;

    setTimeout(() => {
      if (jumpscare) jumpscare.classList.add('hidden');
      document.getElementById('hud-layer').classList.add('hidden');
      document.getElementById('game-over-screen').classList.remove('hidden');
    }, 1200);
  }

  completeStoryStage() {
    this.state = 'VICTORY';
    window.audioManager.stopChase();
    window.soundEffectsManager.playBossDeadSound();
    window.hapticsManager.triggerImpact();

    if (this.currentStageId >= this.unlockedStage && this.unlockedStage < 10) {
      this.unlockedStage = this.currentStageId + 1;
      localStorage.setItem('kenan_unlocked_stage', this.unlockedStage.toString());
    }

    const stageData = window.Entities.STORY_STAGES.find(s => s.id === this.currentStageId);
    document.getElementById('victory-stage-name').innerText = stageData ? stageData.name : `المرحلة ${this.currentStageId}`;

    const descEl = document.getElementById('victory-desc-text');
    if (this.currentStageId === 10) {
      descEl.innerText = '🎉 👑 تهانينا الحارة! هدمت كنان العملاق وختمت قصة الوحش كنان بنجاح 100%! 🏆';
      document.getElementById('next-stage-btn').innerText = '🗺️ قائمة المراحل';
    } else {
      descEl.innerText = 'أحسنت! نجحت في الهروب عبر البوابة واكتملت المرحلة بنجاح!';
      document.getElementById('next-stage-btn').innerText = '⏩ المرحلة التالية';
    }

    for (let i = 0; i < 40; i++) {
      this.particles.push(new window.Entities.Particle(
        this.player.x + (Math.random() - 0.5) * 300,
        this.player.y + (Math.random() - 0.5) * 300,
        (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300,
        ['#00f0ff', '#ffcc00', '#00ff88', '#ff3366'][Math.floor(Math.random() * 4)],
        8, 1.5
      ));
    }

    document.getElementById('hud-layer').classList.add('hidden');
    document.getElementById('victory-screen').classList.remove('hidden');
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

    // Timeline Event 30s: Rage Mode (Endless Mode)
    if (this.gameMode === 'ENDLESS' && this.score >= 30.0 && !this.rageTriggered) {
      this.rageTriggered = true;
      this.kenan.setRageMode(true);
      if (this.kenan) {
        this.kenan.currentQuote = "خلاص عصّبت!";
        this.kenan.memeTimer = -3.0;
      }
      window.audioManager.playVoice('voice_assabt');
      document.getElementById('rage-banner').classList.remove('hidden');
      window.hapticsManager.triggerTac();
    }

    if (this.rageTriggered) {
      this.lightningTimer += dt;
      if (this.lightningTimer >= 5.0) {
        this.lightningTimer = 0;
        const lightning = document.getElementById('lightning-overlay');
        if (lightning) {
          lightning.classList.add('flash');
          setTimeout(() => lightning.classList.remove('flash'), 100);
        }
      }
    }

    // Spawn PowerUps periodically
    this.powerUpSpawnTimer += dt;
    if (this.powerUpSpawnTimer >= this.nextPowerUpDelay) {
      this.powerUpSpawnTimer = 0;
      this.nextPowerUpDelay = 12 + Math.random() * 8;
      this.spawnPowerUp();
    }

    // Active PowerUp HUD Bar Countdown
    if (this.activePowerUp) {
      this.activePowerUp.timer -= dt;
      const fill = document.getElementById('powerup-bar-fill');
      if (fill) {
        const pct = Math.max(0, (this.activePowerUp.timer / this.activePowerUp.duration) * 100);
        fill.style.width = `${pct}%`;
      }
      if (this.activePowerUp.timer <= 0) {
        this.activePowerUp = null;
        document.getElementById('powerup-indicator').classList.add('hidden');
      }
    }

    // Virtual Joystick & Keyboard Movement
    let inputVector = { x: 0, y: 0 };
    if (window.joystickController) {
      inputVector = window.joystickController.getVector();
    }

    // Update Entities
    if (this.player) {
      this.player.update(dt, inputVector, this.arenaWidth, this.arenaHeight, this.obstacles, this.doors);

      // Smooth Camera Tracking (Centered on Player)
      this.camera.x = this.player.x - this.width / 2;
      this.camera.y = this.player.y - this.height / 2;

      this.camera.x = Math.min(Math.max(this.camera.x, 0), this.arenaWidth - this.width);
      this.camera.y = Math.min(Math.max(this.camera.y, 0), this.arenaHeight - this.height);
    }

    if (this.kenan) {
      this.kenan.update(dt, this.player.x, this.player.y, this.arenaWidth, this.arenaHeight, this.obstacles, this.doors, this.particles);
    }

    this.clones.forEach(c => c.update(dt, this.arenaWidth, this.arenaHeight, this.obstacles));
    this.speedPads.forEach(sp => sp.update(dt));
    this.powerUps.forEach(pu => pu.update(dt));
    this.storyItems.forEach(item => item.update(dt, this.player.x, this.player.y, this.arenaWidth, this.arenaHeight));
    this.collectibleSlippers.forEach(slp => slp.update(dt));
    this.slippers.forEach(slp => slp.update(dt));
    if (this.exitGate) this.exitGate.update(dt, this.player.x, this.player.y, this.arenaWidth, this.arenaHeight);

    // Pushable Crates Collisions & Push Logic
    this.pushableCrates.forEach(crate => {
      const dist = Math.hypot(this.player.x - crate.x, this.player.y - crate.y);
      if (dist < (this.player.radius + crate.radius)) {
        const dx = (crate.x - this.player.x) / dist;
        const dy = (crate.y - this.player.y) / dist;
        crate.push(dx * dt, dy * dt, this.obstacles, this.arenaWidth, this.arenaHeight);
      }
    });

    // Proximity Heartbeat Audio Feedback & Haptics
    const distToKenan = Math.hypot(this.player.x - this.kenan.x, this.player.y - this.kenan.y);
    const maxDiag = Math.hypot(this.arenaWidth, this.arenaHeight);
    const now = performance.now();

    window.soundEffectsManager.updateProximityHeartbeat(distToKenan, maxDiag * 0.5, now);
    window.hapticsManager.updateProximity(distToKenan, maxDiag * 0.5, now);

    if (distToKenan < 130) {
      window.soundEffectsManager.playPanicVoice();
    }

    // Collisions: Player vs Kenan Real
    if (distToKenan < (this.player.radius + this.kenan.radius - 8)) {
      this.gameOver();
      return;
    }

    // Collisions: Thrown Slippers vs Kenan
    for (let i = this.slippers.length - 1; i >= 0; i--) {
      const slp = this.slippers[i];
      const dist = Math.hypot(this.kenan.x - slp.x, this.kenan.y - slp.y);
      if (dist < (this.kenan.radius + slp.radius)) {
        this.slippers.splice(i, 1);
        
        // Spawn Hit Sparks
        for (let k = 0; k < 12; k++) {
          this.particles.push(new window.Entities.Particle(
            this.kenan.x, this.kenan.y,
            (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200,
            '#ffcc00', 7, 0.4
          ));
        }

        window.soundEffectsManager.playBossHitSound();
        window.hapticsManager.triggerImpact();

        if (this.kenan.isBoss) {
          this.kenan.bossHp -= 10;
          this.updateBossHpBar();
          this.kenan.freeze(0.8);
          if (this.kenan.bossHp <= 0) {
            this.completeStoryStage();
            return;
          }
        } else {
          // Stun & Freeze Normal Kenan for 1.5s
          this.kenan.freeze(1.5);
        }
      }
    }

    // Collisions: Player vs Ground Collectible Slippers
    this.collectibleSlippers.forEach(slp => {
      if (!slp.isCollected) {
        const dist = Math.hypot(this.player.x - slp.x, this.player.y - slp.y);
        if (dist < (this.player.radius + slp.radius)) {
          slp.isCollected = true;
          this.player.slippers++;
          this.updateSlipperHudBadge();
          window.hapticsManager.triggerTac();

          // Respawn slipper in Stage 10 Boss Fight continuously!
          if (this.currentStageId === 10) {
            setTimeout(() => {
              slp.x = 150 + Math.random() * (this.arenaWidth - 300);
              slp.y = 150 + Math.random() * (this.arenaHeight - 300);
              slp.isCollected = false;
            }, 3500);
          }
        }
      }
    });

    // Collisions: Story Item Collection
    if (this.gameMode === 'STORY' && this.stageItemsTotal > 0) {
      this.storyItems.forEach(item => {
        if (!item.isCollected) {
          const dist = Math.hypot(this.player.x - item.x, this.player.y - item.y);
          if (dist < (this.player.radius + item.radius)) {
            item.isCollected = true;
            this.stageItemsCollected++;
            
            document.getElementById('objective-count-badge').innerText = `${this.stageItemsCollected}/${this.stageItemsTotal}`;
            window.hapticsManager.triggerTac();

            // Unlock Exit Gate Portal when all items collected!
            if (this.stageItemsCollected >= this.stageItemsTotal) {
              if (this.exitGate) this.exitGate.isOpen = true;
              document.getElementById('objective-text').innerText = "🚪 البوابة انفتحت! اهرب إلى بوابة الخروج الآن!";
              document.getElementById('objective-count-badge').innerText = "🚪";
              window.soundEffectsManager.playDoorBreakSound();

              for (let k = 0; k < 25; k++) {
                this.particles.push(new window.Entities.Particle(
                  this.exitGate.x, this.exitGate.y,
                  (Math.random() - 0.5) * 180, (Math.random() - 0.5) * 180,
                  '#00ff88', 7, 0.8
                ));
              }
            }
          }
        }
      });
    }

    // Collisions: Player vs Exit Gate Portal
    if (this.gameMode === 'STORY' && this.exitGate && this.exitGate.isOpen) {
      const distToExit = Math.hypot(this.player.x - this.exitGate.x, this.player.y - this.exitGate.y);
      if (distToExit < (this.player.radius + this.exitGate.radius)) {
        this.completeStoryStage();
        return;
      }
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

    // Particles Update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }

  drawStageBackground() {
    if (this.gameMode === 'STORY') {
      const bgImg = window.Entities.STAGE_BG_IMAGES[this.currentStageId];
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        this.ctx.save();
        this.ctx.drawImage(bgImg, 0, 0, this.arenaWidth, this.arenaHeight);
        this.ctx.restore();
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Compute dynamic adaptive camera zoom scale so characters & items are BIG, bold & crisp on mobile
    const minDim = Math.min(this.width, this.height) || 400;
    this.zoomScale = Math.max(1.45, Math.min(2.2, 700 / minDim));

    this.ctx.save();

    // Camera Center Tracking on Player with Zoom Scale
    const targetX = this.player ? this.player.x : this.arenaWidth / 2;
    const targetY = this.player ? this.player.y : this.arenaHeight / 2;

    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(this.zoomScale, this.zoomScale);
    this.ctx.translate(-Math.round(targetX), -Math.round(targetY));

    // Update Camera bounding box for minimap culling
    this.camera.x = targetX - (this.width / (2 * this.zoomScale));
    this.camera.y = targetY - (this.height / (2 * this.zoomScale));

    this.drawStageBackground();
    this.drawArenaGrid();
    this.speedPads.forEach(sp => sp.draw(this.ctx));
    this.doors.forEach(d => d.draw(this.ctx));
    this.obstacles.forEach(obs => obs.draw(this.ctx));
    this.pushableCrates.forEach(cr => cr.draw(this.ctx));
    this.bananaTraps.forEach(bt => bt.draw(this.ctx));
    this.storyItems.forEach(item => item.draw(this.ctx));
    this.collectibleSlippers.forEach(slp => slp.draw(this.ctx));
    this.slippers.forEach(slp => slp.draw(this.ctx));
    if (this.gameMode === 'STORY' && this.exitGate) this.exitGate.draw(this.ctx);
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

    if (this.weatherRain) {
      this.drawRainOverlay();
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

  drawRainOverlay() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(180, 220, 255, 0.35)';
    this.ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const rx = (this.camera.x + Math.random() * (this.width / (this.zoomScale || 1)));
      const ry = (this.camera.y + Math.random() * (this.height / (this.zoomScale || 1)));
      this.ctx.beginPath();
      this.ctx.moveTo(rx, ry);
      this.ctx.lineTo(rx - 10, ry + 25);
      this.ctx.stroke();
    }
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
      this.ctx.lineTo(this.arenaWidth, y);
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

    mctx.fillStyle = '#00f0ff';
    this.storyItems.forEach(item => {
      if (item.isCollected) return;
      mctx.beginPath();
      mctx.arc(item.x * scaleX, item.y * scaleY, 2.5, 0, Math.PI * 2);
      mctx.fill();
    });

    // Exit Gate Portal on Minimap
    if (this.gameMode === 'STORY' && this.exitGate) {
      mctx.fillStyle = this.exitGate.isOpen ? '#00ff88' : '#888888';
      mctx.beginPath();
      mctx.arc(this.exitGate.x * scaleX, this.exitGate.y * scaleY, 4.5, 0, Math.PI * 2);
      mctx.fill();
    }

    if (this.player) {
      mctx.fillStyle = '#00ff88';
      mctx.beginPath();
      mctx.arc(this.player.x * scaleX, this.player.y * scaleY, 3.5, 0, Math.PI * 2);
      mctx.fill();
    }

    if (this.kenan) {
      mctx.fillStyle = '#ff0044';
      mctx.beginPath();
      mctx.arc(this.kenan.x * scaleX, this.kenan.y * scaleY, this.kenan.isBoss ? 7 : 4.5, 0, Math.PI * 2);
      mctx.fill();
    }

    const visibleW = this.width / (this.zoomScale || 1);
    const visibleH = this.height / (this.zoomScale || 1);

    mctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    mctx.lineWidth = 1;
    mctx.strokeRect(this.camera.x * scaleX, this.camera.y * scaleY, visibleW * scaleX, visibleH * scaleY);
  }

  loop(timestamp) {
    const dt = Math.min(Math.max((timestamp - this.lastTime) / 1000, 0.001), 0.1);
    this.lastTime = timestamp;

    try {
      this.update(dt);
      this.draw();
    } catch (e) {
      console.error('Loop error:', e);
    }

    requestAnimationFrame((ts) => this.loop(ts));
  }
}

window.addEventListener('load', () => {
  window.game = new Game();
});
