import { BeeEngine } from './BeeEngine.js';

// 1. Inizializzazione motore
const gioco = new BeeEngine("testCanvas", 800, 600);
gioco.enableAutoResize(800, 600, 100);
window.gioco = gioco;

const canvas = gioco.canvas || document.getElementById('testCanvas');

// 2. Classe Joystick Virtuale Corretta
class VirtualJoystick {
    constructor(canvas, x, y, radius = 50) {
        this.canvas = canvas;
        this.baseX = x;
        this.baseY = y;
        this.radius = radius;
        this.knobRadius = radius * 0.4; // Raggio del pomello interno
        this.knobX = x;
        this.knobY = y;
        this.active = false;
        this.pointerId = null;
        this.vector = { x: 0, y: 0 };

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

        this.canvas.addEventListener('pointerdown', (e) => {
            const pos = getPos(e);
            const dx = pos.x - this.baseX;
            const dy = pos.y - this.baseY;

            // Attiva se si clicca/tocca dentro l'area della base
            if (dx * dx + dy * dy <= (this.radius * 1.5) * (this.radius * 1.5)) {
                this.active = true;
                this.pointerId = e.pointerId;
                if (this.canvas.setPointerCapture) {
                    this.canvas.setPointerCapture(e.pointerId);
                }
                this.updatePosition(pos.x, pos.y);
            }
        });

        window.addEventListener('pointermove', (e) => {
            if (!this.active || e.pointerId !== this.pointerId) return;
            const pos = getPos(e);
            this.updatePosition(pos.x, pos.y);
        });

        const stop = (e) => {
            if (e.pointerId === this.pointerId) {
                this.active = false;
                if (this.canvas.releasePointerCapture) {
                    try { this.canvas.releasePointerCapture(e.pointerId); } catch (err) { }
                }
                this.pointerId = null;
                this.knobX = this.baseX;
                this.knobY = this.baseY;
                this.vector = { x: 0, y: 0 };
            }
        };

        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
    }

    updatePosition(px, py) {
        const dx = px - this.baseX;
        const dy = py - this.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) {
            this.vector = { x: 0, y: 0 };
            this.knobX = this.baseX;
            this.knobY = this.baseY;
            return;
        }

        const angle = Math.atan2(dy, dx);

        // CALCOLO DEL CLAMPING CORRETTO:
        // Il limite massimo del centro del pomello è (RaggioBase - RaggioPomello)
        // così il bordo esterno del pomello scuro tocca perfettamente il bordo della base grigia senza uscire
        const maxDistance = this.radius - this.knobRadius;
        const clampedDist = Math.min(dist, maxDistance);

        this.knobX = this.baseX + Math.cos(angle) * clampedDist;
        this.knobY = this.baseY + Math.sin(angle) * clampedDist;

        // Vettore normalizzato tra -1 e 1 in base alla corsa utile
        this.vector = {
            x: (Math.cos(angle) * clampedDist) / maxDistance,
            y: (Math.sin(angle) * clampedDist) / maxDistance
        };
    }

    draw(ctx) {
        ctx.save();

        // Base esterna (Cerchio grigio chiaro)
        ctx.fillStyle = "rgba(200, 200, 200, 0.5)";
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(80, 80, 80, 0.8)";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Pomello mobile (Cerchio grigio scuro)
        ctx.fillStyle = this.active ? "rgba(100, 100, 100, 0.9)" : "rgba(120, 120, 120, 0.7)";
        ctx.beginPath();
        ctx.arc(this.knobX, this.knobY, this.knobRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }
}

// Istanza del Joystick (posizionato a x:120, y:480 con raggio 60)
const joystick = new VirtualJoystick(canvas, 120, 480, 60);

// 3. Entità Quadrato di Test
const box = {
    x: 400,
    y: 250,
    size: 40,
    speed: 250
};

// 4. Scena di Test
const testScene = {
    update(dt, input) {
        const inSys = input || gioco?.input;

        // Tastiera PC (Frecce / WASD)
        if (inSys) {
            if (inSys.isPressed?.("ArrowLeft") || inSys.isPressed?.("KeyA") || inSys.keys?.["ArrowLeft"] || inSys.keys?.["KeyA"]) {
                box.x -= box.speed * dt;
            }
            if (inSys.isPressed?.("ArrowRight") || inSys.isPressed?.("KeyD") || inSys.keys?.["ArrowRight"] || inSys.keys?.["KeyD"]) {
                box.x += box.speed * dt;
            }
            if (inSys.isPressed?.("ArrowUp") || inSys.isPressed?.("KeyW") || inSys.keys?.["ArrowUp"] || inSys.keys?.["KeyW"]) {
                box.y -= box.speed * dt;
            }
            if (inSys.isPressed?.("ArrowDown") || inSys.isPressed?.("KeyS") || inSys.keys?.["ArrowDown"] || inSys.keys?.["KeyS"]) {
                box.y += box.speed * dt;
            }
        }

        // Joystick (PC con Mouse o Smartphone con Touch)
        if (joystick.active) {
            box.x += joystick.vector.x * box.speed * dt;
            box.y += joystick.vector.y * box.speed * dt;
        }

        // Limiti schermo del quadrato
        box.x = Math.max(0, Math.min(800 - box.size, box.x));
        box.y = Math.max(0, Math.min(600 - box.size, box.y));
    },

    draw(ctx) {
        // Sfondo bianco
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 800, 600);

        // Quadrato rosso
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(box.x, box.y, box.size, box.size);

        // Disegna il Joystick
        joystick.draw(ctx);

        // Testi
        ctx.fillStyle = "#000000";
        ctx.font = "bold 18px monospace";
        ctx.fillText("TEST JOYSTICK CORRETTO", 20, 30);
        ctx.font = "14px monospace";
        ctx.fillText(`Vettore -> X: ${joystick.vector.x.toFixed(2)} | Y: ${joystick.vector.y.toFixed(2)}`, 20, 60);
    },

    render(ctx) {
        this.draw(ctx);
    }
};

gioco.scenes.add('test', testScene);
gioco.scenes.change('test');
gioco.start();