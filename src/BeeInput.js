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

        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.key]) this.pressed[e.key] = true;
            this.keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            const pos = this.getMousePosition(e);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
        });

        canvas.addEventListener('mousedown', (e) => {
            const pos = this.getMousePosition(e);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
            this.mouse.pressed = true;
            this.mouse.wasPressed = true;
        });

        canvas.addEventListener('mouseup', () => {
            this.mouse.pressed = false;
        });
    }

    getMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();

        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
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
/** 🌟 * Classe BeeInput: Gestisce gli input globali dell'utente (tastiera e mouse).
 * Registra e memorizza lo stato dei tasti premuti o dei click del mouse per 
 * renderli disponibili in tempo reale a tutte le altre classi del gioco.
 */
