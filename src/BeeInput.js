export class BeeInput {
    constructor(canvas) {
        this.canvas = canvas;

        this.keys = {};
        this.pressed = {};

        this.mouse = {
            x: 0,
            y: 0,
            pressed: false,
            wasPressed: false
        };

        // NUOVO: Registro dei tocchi per dispositivi mobile (Multitouch)
        this.touches = [];

        // 1. GESTIONE TASTIERA
        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) this.pressed[e.code] = true;
            this.keys[e.code] = true;

            if (!this.keys[e.key]) this.pressed[e.key] = true;
            this.keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keys[e.key] = false;
        });

        // 2. GESTIONE MOUSE
        canvas.addEventListener('mousemove', (e) => {
            const pos = this.getCanvasPosition(e.clientX, e.clientY);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
        });

        canvas.addEventListener('mousedown', (e) => {
            const pos = this.getCanvasPosition(e.clientX, e.clientY);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
            this.mouse.pressed = true;
            this.mouse.wasPressed = true;
        });

        canvas.addEventListener('mouseup', () => {
            this.mouse.pressed = false;
        });

        // 3. GESTIONE TOUCH (MOBILE)
        const updateTouches = (e) => {
            // Evita lo zoom o lo scroll della pagina mentre si gioca
            if (e.cancelable) e.preventDefault();

            this.touches = Array.from(e.touches).map(touch => {
                const pos = this.getCanvasPosition(touch.clientX, touch.clientY);
                return {
                    id: touch.identifier,
                    x: pos.x,
                    y: pos.y
                };
            });

            // Mantiene la compatibilità con il mouse usando il primo dito
            if (this.touches.length > 0) {
                this.mouse.x = this.touches[0].x;
                this.mouse.y = this.touches[0].y;
            }
        };

        canvas.addEventListener('touchstart', (e) => {
            updateTouches(e);
            this.mouse.pressed = true;
            this.mouse.wasPressed = true;
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            updateTouches(e);
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            updateTouches(e);
            if (this.touches.length === 0) {
                this.mouse.pressed = false;
            }
        }, { passive: false });

        canvas.addEventListener('touchcancel', (e) => {
            updateTouches(e);
            if (this.touches.length === 0) {
                this.mouse.pressed = false;
            }
        }, { passive: false });
    }

    // Trasforma le coordinate del client in coordinate canvas
    getCanvasPosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (this.canvas.width / rect.width),
            y: (clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    isPressed(key) {
        return !!this.keys[key];
    }

    wasPressed(key) {
        return !!this.pressed[key];
    }

    setKey(key, value) {
        if (value && !this.keys[key]) this.pressed[key] = true;
        this.keys[key] = value;
    }

    endFrame() {
        this.pressed = {};
        this.mouse.wasPressed = false;
    }
}