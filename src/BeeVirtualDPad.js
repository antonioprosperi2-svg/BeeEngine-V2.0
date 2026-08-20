// BeeVirtualDPad.js

export class BeeVirtualDPad {
  /**
   * @param {Object} config
   * @param {number} config.x - Centro X del D-Pad
   * @param {number} config.y - Centro Y del D-Pad
   * @param {number} [config.size=120] - Dimensione totale del D-Pad
   * @param {boolean} [config.eightWay=false] - Se true, abilita le 8 direzioni (diagonali). Se false, solo 4 direzioni.
   */
  constructor({ x, y, size = 120, eightWay = false }) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = size / 2;
    this.eightWay = eightWay;

    // Stato dei pulsanti direzionali
    this.state = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    this.isPressed = false;
    this.touchId = null;
  }

  /**
   * Aggiorna lo stato delle frecce in base ai tocchi correnti
   * @param {Array} touches - Lista dei tocchi attivi presi dal Canvas/DOM
   */
  update(touches) {
    // Reset dello stato ad ogni frame
    this.state.up = false;
    this.state.down = false;
    this.state.left = false;
    this.state.right = false;
    this.isPressed = false;

    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      const dx = touch.clientX - this.x;
      const dy = touch.clientY - this.y;
      const distance = Math.hypot(dx, dy);

      // Verifica se il tocco rientra nella zona attiva (escludendo un vicinissimo "punto morto" centrale)
      const deadzone = this.radius * 0.2;
      if (distance <= this.radius && distance > deadzone) {
        this.isPressed = true;
        this.touchId = touch.identifier;

        if (this.eightWay) {
          // Modalità 8 direzioni (consente diagonali basandosi sulle componenti X e Y)
          const threshold = Math.sin(Math.PI / 8); // ~0.38 per dividere gli angoli a 45 gradi
          const normX = dx / distance;
          const normY = dy / distance;

          if (normY < -threshold) this.state.up = true;
          if (normY > threshold) this.state.down = true;
          if (normX < -threshold) this.state.left = true;
          if (normX > threshold) this.state.right = true;
        } else {
          // Modalità 4 direzioni nette (usa i quadranti a 90 gradi)
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) this.state.right = true;
            else this.state.left = true;
          } else {
            if (dy > 0) this.state.down = true;
            else this.state.up = true;
          }
        }
        break;
      }
    }

    if (!this.isPressed) {
      this.touchId = null;
    }
  }

  /**
   * Disegna la croce direzionale sul Canvas
   * @param {CanvasRenderingContext2D} ctx 
   */
  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const padSize = this.radius;
    const armWidth = padSize * 0.35;

    // Sfondo base della croce D-Pad
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Disegno braccio orizzontale e verticale
    ctx.beginPath();
    // Braccio orizzontale
    ctx.rect(-padSize, -armWidth / 2, padSize * 2, armWidth);
    // Braccio verticale
    ctx.rect(-armWidth / 2, -padSize, armWidth, padSize * 2);
    ctx.fill();
    ctx.stroke();

    // Evidenzia i bracci attivi in base a this.state
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