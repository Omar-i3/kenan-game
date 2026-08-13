/**
 * Multi-Input Controller System (Touch Joystick + Mouse Drag + Keyboard WASD/Arrows)
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

    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    this.initTouchListeners();
    this.initPointerListeners();
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
    const onTouchStart = (e) => {
      const target = e.target;
      if (
        target.closest('button, .diff-btn, .btn-primary, .btn-secondary, .hud-btn, .skill-btn, .glass-panel, .screen-overlay') ||
        (window.game && window.game.state !== 'PLAYING')
      ) {
        return;
      }

      this.isTouchDevice = true;
      this.updateControlsHintVisibility();

      if (this.activeTouchId !== null) return;

      const touch = e.changedTouches[0];
      this.activeTouchId = touch.identifier;
      this.baseX = touch.clientX;
      this.baseY = touch.clientY;

      if (this.base) {
        this.base.style.left = `${this.baseX}px`;
        this.base.style.top = `${this.baseY}px`;
        this.base.classList.add('visible');
      }
      this.updateStickPosition(this.baseX, this.baseY);
    };

    const onTouchMove = (e) => {
      if (this.activeTouchId === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.activeTouchId) {
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

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  initPointerListeners() {
    const onPointerDown = (e) => {
      if (this.isTouchDevice && e.pointerType === 'touch') return;
      const target = e.target;
      if (
        target.closest('button, .diff-btn, .btn-primary, .btn-secondary, .hud-btn, .skill-btn, .glass-panel, .screen-overlay') ||
        (window.game && window.game.state !== 'PLAYING')
      ) {
        return;
      }

      this.isPointerActive = true;
      this.baseX = e.clientX;
      this.baseY = e.clientY;

      if (this.base) {
        this.base.style.left = `${this.baseX}px`;
        this.base.style.top = `${this.baseY}px`;
        this.base.classList.add('visible');
      }
      this.updateStickPosition(this.baseX, this.baseY);
    };

    const onPointerMove = (e) => {
      if (!this.isPointerActive) return;
      this.updateStickPosition(e.clientX, e.clientY);
    };

    const onPointerUp = () => {
      if (this.isPointerActive) {
        this.reset();
      }
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
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

    if (this.stick) {
      this.stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    this.inputVector.x = dx / this.maxRadius;
    this.inputVector.y = dy / this.maxRadius;
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
