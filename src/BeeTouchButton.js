// BeeTouchButton.js

export class BeeTouchButton {
    /**
     * @param {Object} config
     * @param {number} config.x - Posizione X del centro del pulsante
     * @param {number} config.y - Posizione Y del centro del pulsante
     * @param {number} config.radius - Raggio del pulsante (area di tocco)
     * @param {string} [config.label=''] - Testo facoltativo sul pulsante (es. 'A', 'JUMP')
     */
    constructor({ x, y, radius = 40, label = '' }) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.label = label;

        this.isPressed = false;
        this.touchId = null; // Traccia quale dito sta premendo questo tasto specifico
    }

    /**
     * Gestisce gli eventi touch (da chiamare nel ciclo di input o listener)
     * @param {Array} touches - Array dei tocchi attivi presi dal Canvas/DOM
     */
    update(touches) {
        let currentlyTouched = false;

        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];

            // Calcola la distanza tra il centro del pulsante e il punto di tocco
            const dx = touch.clientX - this.x;
            const dy = touch.clientY - this.y;
            const distance = Math.hypot(dx, dy);

            // Se il tocco rientra nel raggio del pulsante
            if (distance <= this.radius) {
                currentlyTouched = true;
                this.touchId = touch.identifier;
                break;
            }
        }

        this.isPressed = currentlyTouched;
        if (!this.isPressed) {
            this.touchId = null;
        }
    }

    /**
     * Disegna il pulsante sul Canvas
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        ctx.save();

        // Cerchio del pulsante (cambia opacità se premuto)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isPressed ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Etichetta di testo (es. 'A' o 'B')
        if (this.label) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${this.radius * 0.8}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.label, this.x, this.y);
        }

        ctx.restore();
    }
}