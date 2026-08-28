import { BeeEntity } from '../core/BeeEntity.js';
/**
 * Classe BeeText: Gestisce sia testi singoli che l'Interfaccia di Gioco (HUD) con Punteggio e Vite.
 */
export class BeeText extends BeeEntity {
    constructor(text = "", x = 0, y = 0, font = "bold 20px Arial", color = "#ffffff", align = "left") {
        super(x, y, 0, 0);

        this.text = text;
        this.font = font;
        this.color = color;
        this.align = align;
        this.baseline = "top";
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();
        ctx.font = this.font;
        ctx.fillStyle = this.color;
        ctx.textAlign = this.align;
        ctx.textBaseline = this.baseline;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }

    /**
     * Metodo di comodo per disegnare una barra HUD completa (Punteggio + Vite) in cima al canvas
     */
    static drawHUD(ctx, score = 0, lives = 3, title = 'BEEENGINE PLATFORMER') {
        ctx.save();

        // Sfondo barra HUD superiore
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, ctx.canvas.width, 45);

        // Titolo
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`🐝 ${title}`, ctx.canvas.width / 2, 28);

        // Punteggio (Sinistra)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        const formattedScore = String(score).padStart(6, '0');
        ctx.fillText(`SCORE: ${formattedScore}`, 20, 28);

        // Vite (Destra con cuori)
        ctx.fillStyle = '#FF4444';
        ctx.font = '18px Arial';
        ctx.textAlign = 'right';
        const hearts = '❤️ '.repeat(Math.max(0, lives));
        ctx.fillText(`VITE: ${hearts || '💀'}`, ctx.canvas.width - 20, 28);

        ctx.restore();
    }
}
