import { BeeEntity } from './BeeEntity.js';

/**
 * Classe BeePlatform: Rappresenta una piattaforma solida su cui i personaggi possono camminare e atterrare.
 */
export class BeePlatform extends BeeEntity {
    constructor(x, y, width = 100, height = 20, color = '#ffd700', textureKey = null) {
        super(x, y, width, height);
        this.color = color;
        this.textureKey = textureKey;
    }

    draw(ctx, engine) {
        const texture = (engine && this.textureKey) ? engine.getAsset(this.textureKey) : null;
        if (texture) {
            ctx.drawImage(texture, this.x, this.y, this.width, this.height);
        } else {
            // Disegno di default per la piattaforma (stile arcade lucido)
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            // Bordo e rilievo superiore
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(this.x, this.y, this.width, 3);

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
}
