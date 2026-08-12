/**
 * Virtual Joystick & Multi-input Controller for Touch (Phone/iPad) & Keyboard (Laptop/Desktop)
 */
class JoystickController {
  constructor() {
    this.zone = document.getElementById('joystick-zone');
    this.base = document.getElementById('joystick-base');
    this.stick = document.getElementById('joystick-stick');

    this.activeTouchId = null;
    this.baseX = 0;
    this.baseY = 0;
    this.maxRadius = 50;

    this.inputVector = { x: 0, y: 0 };
    this.keyboardKeys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    this.initTouchListeners();
    this.initKeyboardListeners();
    this.updateControlsHintVisibility();
  }

  updateControlsHintVisibility() {
    const hint = document.getElementById('desktop-controls-hint');
    if (hint) {
      if (this.isTouchDevice) {
        hint.classList.add('hidden');
      } else {
        hint.classList.remove('hidden');
      }
    }
  }

  initTouchListeners() {
    if (!this.zone) return;

    const onTouchStart = (e) => {
      const target = e.target;
      // Allow touches on UI buttons and menus to proceed without preventDefault
      if (
        target.closest('button, .diff-btn, .btn-primary, .btn-secondary, .hud-btn, .skill-btn, .glass-panel, .screen-overlay') ||
        (window.game && window.game.state !== 'PLAYING')
      ) {
        return;
      }

      e.preventDefault();
      this.isTouchDevice = true;
      this.updateControlsHintVisibility();

      if (this.activeTouchId !== null) return;

      const touch = e.changedTouches[0];
      this.activeTouchId = touch.identifier;
      this.baseX = touch.clientX;
      this.baseY = touch.clientY;

      this.base.style.left = `${this.baseX}px`;
      this.base.style.top = `${this.baseY}px`;
      this.base.classList.add('visible');
      this.updateStickPosition(this.baseX, this.baseY);
    };

    const onTouchMove = (e) => {
      if (this.activeTouchId === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.activeTouchId) {
          e.preventDefault();
          this.updateStickPosition(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const onTouchEnd = (e) => {
      if (this.activeTouchId === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.activeTouchId) {
          this.reset();
          break;
        }
      }
    };

    this.zone.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    window.addEventListener('touchcancel', onTouchEnd, { passive: false });
  }

  updateStickPosition(clientX, clientY) {
    let dx = clientX - this.baseX;
    let dy = clientY - this.baseY;
    const distance = Math.hypot(dx, dy);

    if (distance > this.maxRadius) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * this.maxRadius;
      dy = Math.sin(angle) * this.maxRadius;
    }

    this.stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    this.inputVector.x = dx / this.maxRadius;
    this.inputVector.y = dy / this.maxRadius;
  }

  initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keyboardKeys.up = true; break;
        case 'KeyS': case 'ArrowDown': this.keyboardKeys.down = true; break;
        case 'KeyA': case 'ArrowLeft': this.keyboardKeys.left = true; break;
        case 'KeyD': case 'ArrowRight': this.keyboardKeys.right = true; break;
        case 'Space':
          if (window.game && window.game.player) {
            window.game.player.triggerDash();
          }
          break;
        case 'KeyE': case 'ShiftLeft': case 'ShiftRight':
          if (window.game) {
            window.game.dropBananaTrap();
          }
          break;
        case 'KeyP': case 'Escape':
          if (window.game) {
            if (window.game.state === 'PLAYING') window.game.pauseGame();
            else if (window.game.state === 'PAUSED') window.game.resumeGame();
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keyboardKeys.up = false; break;
        case 'KeyS': case 'ArrowDown': this.keyboardKeys.down = false; break;
        case 'KeyA': case 'ArrowLeft': this.keyboardKeys.left = false; break;
        case 'KeyD': case 'ArrowRight': this.keyboardKeys.right = false; break;
      }
    });
  }

  getVector() {
    let vx = this.inputVector.x;
    let vy = this.inputVector.y;

    let kx = 0;
    let ky = 0;
    if (this.keyboardKeys.left) kx -= 1;
    if (this.keyboardKeys.right) kx += 1;
    if (this.keyboardKeys.up) ky -= 1;
    if (this.keyboardKeys.down) ky += 1;

    if (kx !== 0 || ky !== 0) {
      const len = Math.hypot(kx, ky);
      vx = kx / len;
      vy = ky / len;
    }

    return { x: vx, y: vy };
  }

  reset() {
    this.activeTouchId = null;
    this.inputVector = { x: 0, y: 0 };
    if (this.base) this.base.classList.remove('visible');
    if (this.stick) this.stick.style.transform = `translate(-50%, -50%)`;
  }
}

window.joystickController = new JoystickController();
