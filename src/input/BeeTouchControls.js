export class BeeTouchControls {
    constructor(canvas, input) {
        this.canvas = canvas;
        this.input = input;

        this.btnSize = 50;
        this.margin = 20;

        this.buttons = {
            left: { key: 'ArrowLeft', x: 0, y: 0 },
            right: { key: 'ArrowRight', x: 0, y: 0 },
            up: { key: 'ArrowUp', x: 0, y: 0 },
            down: { key: 'ArrowDown', x: 0, y: 0 },
            action: { key: ' ', x: 0, y: 0 }
        };

        this.activeTouches = {};

        this.updatePositions();

        this.onResize = () => this.updatePositions();
        window.addEventListener('resize', this.onResize);

        canvas.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.handleTouch(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
    }

    updatePositions() {
        const rect = this.canvas.getBoundingClientRect();

        const w = this.canvas.width || rect.width;
        const h = this.canvas.height || rect.height;
        const r = this.btnSize / 2;

        this.buttons.left.x = this.margin + r;
        this.buttons.left.y = h - this.margin - r - this.btnSize;

        this.buttons.right.x = this.margin + r + this.btnSize * 2;
        this.buttons.right.y = h - this.margin - r - this.btnSize;

        this.buttons.up.x = this.margin + r + this.btnSize;
        this.buttons.up.y = h - this.margin - r - this.btnSize * 2;

        this.buttons.down.x = this.margin + r + this.btnSize;
        this.buttons.down.y = h - this.margin - r;

        this.buttons.action.x = w - this.margin - r;
        this.buttons.action.y = h - this.margin - r;
    }

    getCanvasCoords(touch) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasWidth = this.canvas.width || rect.width;
        const canvasHeight = this.canvas.height || rect.height;

        return {
            x: (touch.clientX - rect.left) * (canvasWidth / rect.width),
            y: (touch.clientY - rect.top) * (canvasHeight / rect.height)
        };
    }

    getButtonAt(x, y) {
        for (const name in this.buttons) {
            const b = this.buttons[name];
            const dx = x - b.x;
            const dy = y - b.y;
            if (dx * dx + dy * dy <= (this.btnSize / 2) * (this.btnSize / 2)) {
                return name;
            }
        }
        return null;
    }

    handleTouch(e) {
        if (e.cancelable) e.preventDefault();
        const stillActive = {};

        for (let touch of e.touches) {
            const { x, y } = this.getCanvasCoords(touch);
            const btnName = this.getButtonAt(x, y);
            if (btnName) stillActive[touch.identifier] = btnName;
        }

        for (let id in this.activeTouches) {
            if (!stillActive[id]) this.input.setKey(this.buttons[this.activeTouches[id]].key, false);
        }
        for (let id in stillActive) {
            this.input.setKey(this.buttons[stillActive[id]].key, true);
        }

        this.activeTouches = stillActive;
    }

    handleTouchEnd(e) {
        if (e.cancelable) e.preventDefault();
        const stillActive = {};

        for (let touch of e.touches) {
            const { x, y } = this.getCanvasCoords(touch);
            const btnName = this.getButtonAt(x, y);
            if (btnName) stillActive[touch.identifier] = btnName;
        }

        for (let id in this.activeTouches) {
            if (!stillActive[id]) this.input.setKey(this.buttons[this.activeTouches[id]].key, false);
        }

        this.activeTouches = stillActive;
    }

    draw(ctx) {
        ctx.save();

        for (const name in this.buttons) {
            const b = this.buttons[name];
            const isActive = Object.values(this.activeTouches).includes(name);

            ctx.globalAlpha = isActive ? 0.8 : 0.5;
            ctx.fillStyle = isActive ? '#ffffff' : '#666666';
            ctx.beginPath();
            ctx.arc(b.x, b.y, this.btnSize / 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            ctx.globalAlpha = 1.0;
            ctx.fillStyle = isActive ? '#000000' : '#ffffff';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const symbols = { left: '◀', right: '▶', up: '▲', down: '▼', action: '●' };
            ctx.fillText(symbols[name] || '●', b.x, b.y);
        }

        ctx.restore();
    }

    destroy() {
        window.removeEventListener('resize', this.onResize);
    }
}