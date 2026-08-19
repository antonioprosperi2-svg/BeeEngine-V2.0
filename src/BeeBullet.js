import { BeeEntity } from './BeeEntity.js';

/**
 * Classe BeeBullet: Rappresenta un proiettile in movimento 2D (su, giù, destra, sinistra).
 * Supporta sia il disegno vettoriale che l'uso di texture/immagini.
 */
export class BeeBullet extends BeeEntity {
    constructor(x, y, vx = 0, vy = 300, width = 8, height = 8, textureKey = null) {
        super(x, y, width, height);
        this.vx = vx;
        this.vy = vy;
        this.textureKey = textureKey;
        this.destroyed = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Se il proiettile esce dallo schermo, viene distrutto per liberare memoria
        if (this.x < -100 || this.x > 2000 || this.y < -100 || this.y > 2000) {
            this.destroyed = true;
        }
    }

    draw(ctx, engine) {
        const texture = (engine && this.textureKey) ? engine.getAsset(this.textureKey) : null;
        if (texture) {
            ctx.drawImage(texture, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = "#FFD700"; // Giallo brillante
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}
