import { BeeEnemy } from './BeeEnemy.js';
import { BeeBullet } from '../physics/BeeBullet.js';

/**
 * BeeEnemyShooter: Advanced enemy capable of multi-directional movement and shooting projectiles.
 */
export class BeeEnemyShooter extends BeeEnemy {
    constructor(x = 0, y = 0, width = 40, height = 40, textureKey = null) {
        super(x, y, width, height, textureKey);
        this.vx = 80;
        this.vy = 60;
        this.shootInterval = 1.5;
        this.shootTimer = this.shootInterval;
        this.bulletSpeed = 250;
    }

    update(dt, input, engine) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (engine && engine.canvas) {
            const canvasW = engine.canvas.width;
            const canvasH = engine.canvas.height;

            if (this.x <= 0 || this.x + this.width >= canvasW) {
                this.vx = -this.vx;
            }
            if (this.y <= 0 || this.y + this.height >= canvasH) {
                this.vy = -this.vy;
            }
        }

        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
            this.shootTimer = this.shootInterval;
            this.shoot(engine);
        }
    }

    shoot(engine) {
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
        const texture = (engine && this.textureKey) ? engine.getAsset(this.textureKey) : null;
        if (texture) {
            ctx.drawImage(texture, this.x, this.y, this.width, this.height);
            return;
        }

        ctx.save();
        ctx.fillStyle = '#ff2244';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = '#ffff00';
        if (Math.abs(this.vx) > Math.abs(this.vy)) {
            const cannonX = this.vx > 0 ? this.x + this.width : this.x - 6;
            ctx.fillRect(cannonX, this.y + this.height / 2 - 3, 6, 6);
        } else {
            const cannonY = this.vy > 0 ? this.y + this.height : this.y - 6;
            ctx.fillRect(this.x + this.width / 2 - 3, cannonY, 6, 6);
        }
        ctx.restore();
    }
}
