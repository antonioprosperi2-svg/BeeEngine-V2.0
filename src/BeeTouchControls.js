export class BeeTouchControls {
    constructor(canvas, input) {
        this.canvas = canvas;
        this.input = input;
        this.btnSize = 60;
        this.margin = 20;
        this.buttons = {
            left: { key: 'ArrowLeft', x: 0, y: 0 },
            right: { key: 'ArrowRight', x: 0, y: 0 },
            up: { key: 'ArrowUp', x: 0, y: 0 },
            down: { key: 'ArrowDown', x: 0, y: 0 },
            action: { key: ' ', x: 0, y: 0 }
        };
        this.activeTouches = {};
        canvas.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.handleTouch(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    }

    getButtonAt(x, y) {
        for (const name in this.buttons) {
            const b = this.buttons[name];
            const dx = x - b.x; const dy = y - b.y;
            if (Math.sqrt(dx * dx + dy * dy) < this.btnSize / 2 + 15) return name;
        }
        return null;
    }

    getCanvasCoords(touch) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    handleTouch(e) {
        e.preventDefault();
        const stillActive = {};
        for (let touch of e.touches) {
            const { x, y } = this.getCanvasCoords(touch);
            const btnName = this.getButtonAt(x, y);
            if (btnName) stillActive[touch.identifier] = btnName;
        }
        for (let id in this.activeTouches) if (!stillActive[id]) this.input.setKey(this.buttons[this.activeTouches[id]].key, false);
        for (let id in stillActive) this.input.setKey(this.buttons[stillActive[id]].key, true);
        this.activeTouches = stillActive;
    }

    handleTouchEnd(e) {
        e.preventDefault();
        const stillActive = {};
        for (let touch of e.touches) {
            const { x, y } = this.getCanvasCoords(touch);
            const btnName = this.getButtonAt(x, y);
            if (btnName) stillActive[touch.identifier] = btnName;
        }
        for (let id in this.activeTouches) if (!stillActive[id]) this.input.setKey(this.buttons[this.activeTouches[id]].key, false);
        this.activeTouches = stillActive;
    }

    draw(ctx) {
        const w = this.canvas.width; const h = this.canvas.height;
        this.buttons.left.x = this.margin + this.btnSize / 2; this.buttons.left.y = h - this.margin - this.btnSize / 2;
        this.buttons.right.x = this.margin * 2 + this.btnSize * 1.5; this.buttons.right.y = h - this.margin - this.btnSize / 2;
        this.buttons.up.x = this.margin + this.btnSize; this.buttons.up.y = h - this.margin * 2 - this.btnSize;
        this.buttons.down.x = this.margin + this.btnSize; this.buttons.down.y = h - this.margin - this.btnSize / 2;
        this.buttons.action.x = w - this.margin - this.btnSize / 2; this.buttons.action.y = h - this.margin - this.btnSize / 2;

        ctx.save(); ctx.globalAlpha = 0.4;
        for (const name in this.buttons) {
            const b = this.buttons[name];
            const isActive = Object.values(this.activeTouches).includes(name);
            ctx.fillStyle = isActive ? '#ffffff' : '#888888';
            ctx.beginPath(); ctx.arc(b.x, b.y, this.btnSize / 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000000'; ctx.font = '20px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const symbols = { left: '◀', right: '▶', up: '▲', down: '▼', action: '●' };
            ctx.fillText(symbols[name], b.x, b.y);
        }
        ctx.restore();
    }
}
/** 🌟 Il ruolo di BeeTouchControls
 * Gestisce i controlli touch per il gioco.
 * Crea pulsanti virtuali che possono essere toccati per inviare comandi al gioco.
 * Utilizza le coordinate del canvas per determinare se un touch è su un pulsante.
 * Aggiorna lo stato dei pulsanti attivi e invia i comandi corrispondenti all'input.
 */
/**
 * Classe BeeTouchControls: Gestisce l'input tramite touchscreen.
 * Intercetta i tocchi e gli swipe sullo schermo per tradurli in comandi di gioco.
 * Permette di controllare il Player o navigare nei menu sui dispositivi mobile.
 */

