/**
 * Classe BeeMenuScene: Gestisce la schermata del Menu Principale di gioco.
 */
export class BeeMenuScene {
    constructor() {
        this.engine = null;
    }

    enter() {
        console.log("🐝 BeeEngine: Entrato nel Menu Principale!");
    }

    exit() {
        console.log("🐝 BeeEngine: Avvio della partita!");
    }

    update(dt, input) {
        if (!input) return;
        // Quando premi ENTER, SPAZIO o Tocchi lo schermo, passa alla scena di gioco 'game'
        if (input.wasPressed("Enter") || input.wasPressed("Space") || (input.mouse && input.mouse.wasPressed)) {
            if (this.engine && this.engine.scenes) {
                this.engine.scenes.change('game');
            }
        }
    }

    draw(ctx) {
        // Fondo Scuro Arcade
        ctx.fillStyle = "#0d0f1a";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Griglia Sfondata Sfumata
        ctx.strokeStyle = "rgba(255, 215, 0, 0.08)";
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < ctx.canvas.width; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ctx.canvas.height); ctx.stroke();
        }
        for (let y = 0; y < ctx.canvas.height; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ctx.canvas.width, y); ctx.stroke();
        }

        // Titolo Principale
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 52px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;

        ctx.fillText("🐝 BEE ENGINE 2D", ctx.canvas.width / 2, ctx.canvas.height / 3);

        ctx.shadowColor = "transparent";

        // Sotto Titolo
        ctx.fillStyle = "#4DEEEA";
        ctx.font = "bold 20px Arial";
        ctx.fillText("PLATFORM & ACTION ENGINE", ctx.canvas.width / 2, ctx.canvas.height / 3 + 50);

        // Istruzioni Lampeggianti
        const time = Date.now() / 500;
        ctx.fillStyle = Math.sin(time) > 0 ? "#FFFFFF" : "#FFD700";
        ctx.font = "bold 22px Arial";
        ctx.fillText("PREMI INVIO, SPAZIO O TOCCA PER GIOCARE", ctx.canvas.width / 2, ctx.canvas.height / 1.6);

        // Controlli
        ctx.fillStyle = "#888888";
        ctx.font = "14px Arial";
        ctx.fillText("Controlli: FRECCE / WASD per Muoverti e Saltare | SPAZIO per Saltare", ctx.canvas.width / 2, ctx.canvas.height / 1.35);

        // Footer
        ctx.fillStyle = "#555555";
        ctx.font = "12px monospace";
        ctx.textAlign = "right";
        ctx.fillText("Powered by BeeEngine v2.0", ctx.canvas.width - 20, ctx.canvas.height - 20);
    }
}
