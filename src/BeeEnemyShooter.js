import { BeeNemico } from './BeeNemico.js';
import { BeeBullet } from './BeeBullet.js';

/**
 * Classe BeeEnemyShooter: Nemico avanzato in grado di muoversi in 4 direzioni (su, giù, destra, sinistra)
 * e sparare proiettili direzionali. Supporta sia sprite/immagini che la grafica vettoriale di riserva.
 */
export class BeeEnemyShooter extends BeeNemico {
    constructor(x, y, width = 40, height = 40, textureKey = null) {
        super(x, y, width, height, textureKey);
        this.vx = 80;  // Velocità orizzontale
        this.vy = 60;  // Velocità verticale
        this.shootInterval = 1.5; // Spara ogni 1.5 secondi
        this.shootTimer = this.shootInterval;
        this.bulletSpeed = 250;
    }

    update(dt, input, engine) {
        // Movimento nelle 4 direzioni (X e Y)
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Limiti del campo di gioco (Rimbalzo sui bordi)
        const canvasW = engine ? engine.canvas.width : 800;
        const canvasH = engine ? engine.canvas.height : 600;

        if (this.x <= 0 || this.x + this.width >= canvasW) {
            this.vx = -this.vx;
        }
        if (this.y <= 0 || this.y + this.height >= canvasH - 120) {
            this.vy = -this.vy;
        }

        // Timer di sparo
        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
            this.shootTimer = this.shootInterval;
            this.shoot(engine);
        }
    }

    shoot(engine) {
        // Calcola la direzione del proiettile in base al movimento attuale (o verso il basso se fermo)
        let bulletVx = 0;
        let bulletVy = this.bulletSpeed;

        if (Math.abs(this.vx) > Math.abs(this.vy)) {
            bulletVx = this.vx > 0 ? this.bulletSpeed : -this.bulletSpeed;
            bulletVy = 0;
        } else {
            bulletVy = this.vy > 0 ? this.bulletSpeed : -this.bulletSpeed;
            bulletVx = 0;
        }

        const bulletX = this.x + this.width / 2 - 4;
        const bulletY = this.y + this.height / 2 - 4;

        const bullet = new BeeBullet(bulletX, bulletY, bulletVx, bulletVy, 10, 10);
        
        if (engine && typeof engine.addEntity === 'function') {
            engine.addEntity(bullet);
        }
    }

    draw(ctx, engine) {
        // 1. Se lo sviluppatore ha impostato una texture (immagine), la disegna
        const texture = (engine && this.textureKey) ? engine.getAsset(this.textureKey) : null;
        if (texture) {
            ctx.drawImage(texture, this.x, this.y, this.width, this.height);
            return;
        }

        // 2. Grafica Vettoriale di Fallback (Se non c'è l'immagine)
        ctx.fillStyle = '#ff2244';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Indicatore del cannone vettoriale che punta nella direzione del movimento
        ctx.fillStyle = '#ffff00';
        if (Math.abs(this.vx) > Math.abs(this.vy)) {
            const cannonX = this.vx > 0 ? this.x + this.width : this.x - 6;
            ctx.fillRect(cannonX, this.y + this.height / 2 - 3, 6, 6);
        } else {
            const cannonY = this.vy > 0 ? this.y + this.height : this.y - 6;
            ctx.fillRect(this.x + this.width / 2 - 3, cannonY, 6, 6);
        }
    }
}
