/**
 * Multi-Input Controller System (Touch/Mouse Screen Direction Pointer + Virtual Joystick + WASD/Arrow Keys)
 */
class JoystickController {
  constructor() {
    this.zone = document.getElementById('joystick-zone');
    this.base = document.getElementById('joystick-base');
    this.stick = document.getElementById('joystick-stick');

    this.pointerActive = false;
    this.pointerX = 0;
    this.pointerY = 0;
    this.baseX = 0;
    this.baseY = 0;
    this.maxRadius = 55;

    this.inputVector = { x: 0, y: 0 };
    this.keyboardKeys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    this.initTouchAndMouseListeners();
    this.initKeyboardListeners();
  }

  initTouchAndMouseListeners() {
    this.touchId = null;

    const handleStart = (clientX, clientY, target) => {
      if (
        target.closest('button, .diff-btn, .btn-primary, .btn-secondary, .hud-btn, .skill-btn, .glass-panel, .screen-overlay') ||
        (window.game && window.game.state !== 'PLAYING')
      ) {
        return false;
      }

      this.pointerActive = true;
      this.pointerX = clientX;
      this.pointerY = clientY;

      // Show visual joystick base at touch/click point
      this.baseX = clientX;
      this.baseY = clientY;
      if (this.base) {
        this.base.style.left = `${this.baseX}px`;
        this.base.style.top = `${this.baseY}px`;
        this.base.classList.add('visible');
      }
      this.updateVectorFromPointer(clientX, clientY);
      return true;
    };

    const handleMove = (clientX, clientY) => {
      if (!this.pointerActive) return;
      this.pointerX = clientX;
      this.pointerY = clientY;
      this.updateVectorFromPointer(clientX, clientY);
    };

    const handleEnd = () => {
      this.reset();
    };

    // Multi-Touch Aware Touch Listeners
    window.addEventListener('touchstart', (e) => {
      if (!e.changedTouches) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (this.touchId === null) {
          const started = handleStart(touch.clientX, touch.clientY, touch.target);
          if (started) {
            this.touchId = touch.identifier;
            break;
          }
        }
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.touchId === null || !e.touches) return;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === this.touchId) {
          handleMove(touch.clientX, touch.clientY);
          break;
        }
      }
    }, { passive: true });

    const checkTouchEnd = (e) => {
      if (this.touchId === null || !e.changedTouches) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.touchId) {
          this.touchId = null;
          handleEnd();
          break;
        }
      }
    };

    window.addEventListener('touchend', checkTouchEnd, { passive: true });
    window.addEventListener('touchcancel', checkTouchEnd, { passive: true });

    // Mouse Listeners for Desktop / Laptop
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.touchId === null) {
        handleStart(e.clientX, e.clientY, e.target);
      }
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      if (this.pointerActive && this.touchId === null) {
        handleMove(e.clientX, e.clientY);
      }
    }, { passive: true });

    window.addEventListener('mouseup', () => {
      if (this.touchId === null) handleEnd();
    }, { passive: true });
  }

  updateVectorFromPointer(clientX, clientY) {
    let dx = clientX - this.baseX;
    let dy = clientY - this.baseY;
    let distance = Math.hypot(dx, dy);

    if (distance > 4) {
      const angle = Math.atan2(dy, dx);
      const clampedDist = Math.min(distance, this.maxRadius);
      const stickX = Math.cos(angle) * clampedDist;
      const stickY = Math.sin(angle) * clampedDist;

      if (this.stick) {
        this.stick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
      }
      this.inputVector.x = stickX / this.maxRadius;
      this.inputVector.y = stickY / this.maxRadius;
    } else {
      if (this.stick) {
        this.stick.style.transform = `translate(-50%, -50%)`;
      }
      this.inputVector.x = 0;
      this.inputVector.y = 0;
    }
  }

  initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      if (window.game && window.game.state === 'PLAYING' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
      }

      if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'ص' || key === 'arrowup') this.keyboardKeys.up = true;
      if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'س' || key === 'arrowdown') this.keyboardKeys.down = true;
      if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'ش' || key === 'arrowleft') this.keyboardKeys.left = true;
      if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'ي' || key === 'ذ' || key === 'arrowright') this.keyboardKeys.right = true;

      if (code === 'Space' || key === ' ') {
        if (window.game && window.game.player) {
          window.game.player.triggerDash();
        }
      }
      if (code === 'KeyE' || code === 'ShiftLeft' || code === 'ShiftRight' || key === 'e' || key === 'ث') {
        if (window.game) {
          window.game.dropBananaTrap();
        }
      }
      if (code === 'KeyF' || key === 'f' || key === 'ب') {
        if (window.game) {
          window.game.throwSlipper();
        }
      }
      if (code === 'KeyP' || code === 'Escape' || key === 'p' || key === 'ح') {
        if (window.game) {
          if (window.game.state === 'PLAYING') window.game.pauseGame();
          else if (window.game.state === 'PAUSED') window.game.resumeGame();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'ص' || key === 'arrowup') this.keyboardKeys.up = false;
      if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'س' || key === 'arrowdown') this.keyboardKeys.down = false;
      if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'ش' || key === 'arrowleft') this.keyboardKeys.left = false;
      if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'ي' || key === 'ذ' || key === 'arrowright') this.keyboardKeys.right = false;
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
    this.pointerActive = false;
    this.inputVector = { x: 0, y: 0 };
    if (this.base) this.base.classList.remove('visible');
    if (this.stick) this.stick.style.transform = `translate(-50%, -50%)`;
  }
}

window.joystickController = new JoystickController();
