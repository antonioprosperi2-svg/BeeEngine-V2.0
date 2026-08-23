export class BeeVirtualDPad {
  /**
   * @param {Object} config
   * @param {HTMLCanvasElement} config.canvas - Il canvas principale del gioco
   * @param {number} config.x - Centro X del D-Pad
   * @param {number} config.y - Centro Y del D-Pad
   * @param {number} [config.size=120] - Dimensione totale del D-Pad
   * @param {boolean} [config.eightWay=false] - Se true abilita 8 direzioni, altrimenti 4
   */
  constructor({ canvas, x, y, size = 120, eightWay = false }) {
    this.canvas = canvas;
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = size / 2;
    this.eightWay = eightWay;

    this.state = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    this.isPressed = false;
    this.pointerId = null;

    this.initEvents();
  }

  initEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const processPointer = (e) => {
      const pos = getPos(e);
      const dx = pos.x - this.x;
      const dy = pos.y - this.y;
      const distance = Math.hypot(dx, dy);

      const deadzone = this.radius * 0.2;

      if (distance <= this.radius && distance > deadzone) {
        this.isPressed = true;
        this.pointerId = e.pointerId;

        // Reset stati
        this.state.up = false;
        this.state.down = false;
        this.state.left = false;
        this.state.right = false;

        if (this.eightWay) {
          const threshold = Math.sin(Math.PI / 8); // ~0.38 per dividere a 45 gradi
          const normX = dx / distance;
          const normY = dy / distance;

          if (normY < -threshold) this.state.up = true;
          if (normY > threshold) this.state.down = true;
          if (normX < -threshold) this.state.left = true;
          if (normX > threshold) this.state.right = true;
        } else {
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) this.state.right = true;
            else this.state.left = true;
          } else {
            if (dy > 0) this.state.down = true;
            else this.state.up = true;
          }
        }
      } else {
        this.resetState();
      }
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      const pos = getPos(e);
      const dx = pos.x - this.x;
      const dy = pos.y - this.y;
      if (Math.hypot(dx, dy) <= this.radius) {
        if (this.canvas.setPointerCapture) {
          try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { }
        }
        processPointer(e);
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isPressed && e.pointerId === this.pointerId) {
        processPointer(e);
      }
    });

    const stop = (e) => {
      if (e.pointerId === this.pointerId) {
        if (this.canvas.releasePointerCapture) {
          try { this.canvas.releasePointerCapture(e.pointerId); } catch (err) { }
        }
        this.resetState();
      }
    };

    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  }

  resetState() {
    this.state.up = false;
    this.state.down = false;
    this.state.left = false;
    this.state.right = false;
    this.isPressed = false;
    this.pointerId = null;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const padSize = this.radius;
    const armWidth = padSize * 0.35;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.rect(-padSize, -armWidth / 2, padSize * 2, armWidth);
    ctx.rect(-armWidth / 2, -padSize, armWidth, padSize * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    if (this.state.up) {
      ctx.fillRect(-armWidth / 2, -padSize, armWidth, padSize - armWidth / 2);
    }
    if (this.state.down) {
      ctx.fillRect(-armWidth / 2, armWidth / 2, armWidth, padSize - armWidth / 2);
    }
    if (this.state.left) {
      ctx.fillRect(-padSize, -armWidth / 2, padSize - armWidth / 2, armWidth);
    }
    if (this.state.right) {
      ctx.fillRect(armWidth / 2, -armWidth / 2, padSize - armWidth / 2, armWidth);
    }

    ctx.restore();
  }
}