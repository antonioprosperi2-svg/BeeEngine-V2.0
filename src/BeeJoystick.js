export class BeeJoystick {
    constructor(canvas, input) {
        this.canvas = canvas;
        this.input = input;

        // Configurazione Joystick Virtuale
        this.baseX = 100;
        this.baseY = 0;
        this.stickX = 100;
        this.stickY = 0;
        this.radius = 45;
        this.active = false;
        this.touchId = null;

        // Tasto Sparo a Destra
        this.actionBtn = { x: 0, y: 0, radius: 35, active: false, touchId: null };

        this.bindEvents();
    }

    bindEvents() {
        const c = this.canvas;
        c.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        c.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        c.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        c.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
    }

    // Calcolo preciso della posizione del dito scalata sul Canvas
    getCanvasCoords(touch) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    handleTouchStart(e) {
        if (e.cancelable) e.preventDefault();

        for (let touch of e.changedTouches) {
            const { x, y } = this.getCanvasCoords(touch);

            // 1. Zona Joystick: Metà sinistra dello schermo
            if (x < this.canvas.width / 2 && !this.active) {
                this.active = true;
                this.touchId = touch.identifier;
                this.baseX = x;
                this.baseY = y;
                this.stickX = x;
                this.stickY = y;
                continue;
            }

            // 2. Zona Pulsante Sparo: Controllo collisione circolare
            const dx = x - this.actionBtn.x;
            const dy = y - this.actionBtn.y;
            if (Math.hypot(dx, dy) < this.actionBtn.radius + 20) {
                this.actionBtn.active = true;
                this.actionBtn.touchId = touch.identifier;
                if (this.input && this.input.setKey) {
                    this.input.setKey(' ', true);
                }
            }
        }
    }

    handleTouchMove(e) {
        if (e.cancelable) e.preventDefault();

        for (let touch of e.changedTouches) {
            // Gestione movimento Joystick
            if (touch.identifier === this.touchId && this.active) {
                const { x, y } = this.getCanvasCoords(touch);
                const dx = x - this.baseX;
                const dy = y - this.baseY;
                const dist = Math.hypot(dx, dy);

                // Calcolo posizione pomello visivo
                if (dist <= this.radius) {
                    this.stickX = x;
                    this.stickY = y;
                } else {
                    const angle = Math.atan2(dy, dx);
                    this.stickX = this.baseX + Math.cos(angle) * this.radius;
                    this.stickY = this.baseY + Math.sin(angle) * this.radius;
                }

                // Invia i comandi virtuali a BeeInput (soglia 10px per sensibilità migliore)
                if (this.input && this.input.setKey) {
                    this.input.setKey('ArrowLeft', dx < -10);
                    this.input.setKey('ArrowRight', dx > 10);
                    this.input.setKey('ArrowUp', dy < -10);
                    this.input.setKey('ArrowDown', dy > 10);
                }
            }
        }
    }

    handleTouchEnd(e) {
        if (e.cancelable) e.preventDefault();

        for (let touch of e.changedTouches) {
            // Rilascio Joystick
            if (touch.identifier === this.touchId) {
                this.active = false;
                this.touchId = null;
                if (this.input && this.input.setKey) {
                    this.input.setKey('ArrowLeft', false);
                    this.input.setKey('ArrowRight', false);
                    this.input.setKey('ArrowUp', false);
                    this.input.setKey('ArrowDown', false);
                }
            }

            // Rilascio Tasto Sparo
            if (touch.identifier === this.actionBtn.touchId) {
                this.actionBtn.active = false;
                this.actionBtn.touchId = null;
                if (this.input && this.input.setKey) {
                    this.input.setKey(' ', false);
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // Aggiorna posizione fissa tasto sparo in basso a destra
        this.actionBtn.x = this.canvas.width - 70;
        this.actionBtn.y = this.canvas.height - 70;

        // 1. Disegna Joystick
        if (this.active) {
            // Cerchio Esterno
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.baseX, this.baseY, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            // Pomello Mobile
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(this.stickX, this.stickY, 18, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Guida visiva a riposo
            ctx.globalAlpha = 0.2;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(80, this.canvas.height - 70, 35, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 2. Disegna Pulsante SPARO
        ctx.globalAlpha = this.actionBtn.active ? 0.9 : 0.5;
        ctx.fillStyle = this.actionBtn.active ? '#ffffff' : '#ff4444';
        ctx.beginPath();
        ctx.arc(this.actionBtn.x, this.actionBtn.y, this.actionBtn.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Testo del Pulsante
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = this.actionBtn.active ? '#000000' : '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SPARA', this.actionBtn.x, this.actionBtn.y);

        ctx.restore();
    }
}