/**
 * Universal Multi-Input Controller (Touch Joystick + Mouse Click & Drag + Full Keyboard WASD/Arrows)
 */
class JoystickController {
  constructor() {
    this.zone = document.getElementById('joystick-zone');
    this.base = document.getElementById('joystick-base');
    this.stick = document.getElementById('joystick-stick');

    this.activeTouchId = null;
    this.isPointerActive = false;
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
    const handleStart = (clientX, clientY, target, id = 'mouse') => {
      if (
        target.closest('button, .diff-btn, .btn-primary, .btn-secondary, .hud-btn, .skill-btn, .glass-panel, .screen-overlay') ||
        (window.game && window.game.state !== 'PLAYING')
      ) {
        return false;
      }

      this.activeTouchId = id;
      this.isPointerActive = true;
      this.baseX = clientX;
      this.baseY = clientY;

      if (this.base) {
        this.base.style.left = `${this.baseX}px`;
        this.base.style.top = `${this.baseY}px`;
        this.base.classList.add('visible');
      }
      this.updateStickPosition(clientX, clientY);
      return true;
    };

    const handleMove = (clientX, clientY) => {
      if (!this.isPointerActive && this.activeTouchId === null) return;
      this.updateStickPosition(clientX, clientY);
    };

    // Touch Listeners
    window.addEventListener('touchstart', (e) => {
      if (e.changedTouches && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        handleStart(touch.clientX, touch.clientY, e.target, touch.identifier);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.activeTouchId) {
          handleMove(touch.clientX, touch.clientY);
          break;
        }
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (this.activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.activeTouchId) {
          this.reset();
          break;
        }
      }
    }, { passive: true });

    window.addEventListener('touchcancel', () => this.reset(), { passive: true });

    // Mouse Listeners
    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left mouse button
      handleStart(e.clientX, e.clientY, e.target, 'mouse');
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      if (this.activeTouchId === 'mouse') {
        handleMove(e.clientX, e.clientY);
      }
    }, { passive: true });

    window.addEventListener('mouseup', () => {
      if (this.activeTouchId === 'mouse') {
        this.reset();
      }
    }, { passive: true });
  }

  updateStickPosition(clientX, clientY) {
    let dx = clientX - this.baseX;
    let dy = clientY - this.baseY;
    const distance = Math.hypot(dx, dy);

    if (distance > 0.1) {
      if (distance > this.maxRadius) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * this.maxRadius;
        dy = Math.sin(angle) * this.maxRadius;
      }

      if (this.stick) {
        this.stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }

      this.inputVector.x = dx / this.maxRadius;
      this.inputVector.y = dy / this.maxRadius;
    }
  }

  initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

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
    this.activeTouchId = null;
    this.isPointerActive = false;
    this.inputVector = { x: 0, y: 0 };
    if (this.base) this.base.classList.remove('visible');
    if (this.stick) this.stick.style.transform = `translate(-50%, -50%)`;
  }
}

window.joystickController = new JoystickController();
