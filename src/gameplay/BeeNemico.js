import { BeeEntity } from '../core/BeeEntity.js';

/**
 * Classe BeeNemico: Rappresenta i personaggi ostili nel gioco.
 * Supporta sia immagini grafiche (tramite textureKey) che il disegno vettoriale di fallback.
 */
export class BeeNemico extends BeeEntity {
    constructor(x, y, width = 32, height = 32, textureKey = null) {
        super(x, y, width, height);
        this.velocita = 50;
        this.textureKey = textureKey;
    }

    update(dt) {
        this.x += this.velocita * dt;

        // Limiti di pattuglia
        if (this.x > 700) {
            this.velocita = -Math.abs(this.velocita);
        }
        if (this.x < 0) {
            this.velocita = Math.abs(this.velocita);
        }
    }

    draw(ctx, engine) {
        const texture = (engine && this.textureKey) ? engine.getAsset(this.textureKey) : null;
        if (texture) {
            ctx.drawImage(texture, this.x, this.y, this.width, this.height);
        } else {
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'yellow';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();

            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            ctx.fillText(`X:${Math.round(this.x)} Y:${Math.round(this.y)}`, this.x - 20, this.y - 10);
        }
    }
}