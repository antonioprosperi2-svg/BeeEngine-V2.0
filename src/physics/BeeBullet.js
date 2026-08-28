import { BeeEntity } from '../core/BeeEntity.js';

/**
 * BeeBullet: Represents a moving 2D projectile with velocity, lifespan, and optional texture key.
 */
export class BeeBullet extends BeeEntity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} [vx=0] 
     * @param {number} [vy=300] 
     * @param {number} [width=8] 
     * @param {number} [height=8] 
     * @param {string|null} [textureKey=null] 
     * @param {number} [lifespan=5] Lifespan in seconds before auto-destroy
     */
    constructor(x = 0, y = 0, vx = 0, vy = 300, width = 8, height = 8, textureKey = null, lifespan = 5) {
        super(x, y, width, height);
        this.vx = vx;
        this.vy = vy;
        this.textureKey = textureKey;
        this.lifespan = lifespan;
        this.age = 0;
    }

    update(dt, input, engine) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.age += dt;

        if (this.lifespan > 0 && this.age >= this.lifespan) {
            this.destroy();
            return;
        }

        if (engine && engine.canvas) {
            const margin = 200;
            if (this.x < -margin || this.x > engine.canvas.width + margin ||
                this.y < -margin || this.y > engine.canvas.height + margin) {
                this.destroy();
            }
        }

        super.update(dt, input, engine);
    }

    draw(ctx, engine) {
        const texture = (engine && this.textureKey) ? engine.getAsset(this.textureKey) : null;
        if (texture) {
            ctx.drawImage(texture, this.x, this.y, this.width, this.height);
        } else {
            ctx.save();
            ctx.fillStyle = "#FFD700";
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        }
    }
}
