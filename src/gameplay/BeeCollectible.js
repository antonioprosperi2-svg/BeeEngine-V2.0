import { BeeEntity } from '../core/BeeEntity.js';

/**
 * BeeCollectible: Generic falling item / bonus entity.
 * Resets position to top of screen when collected or falling past the screen bottom.
 */
export class BeeCollectible extends BeeEntity {
    /**
     * @param {number} [canvasWidth=800] 
     * @param {number} [canvasHeight=600] 
     * @param {string|null} [textureKey=null] 
     * @param {number} [width=20] 
     * @param {number} [height=20] 
     */
    constructor(canvasWidth = 800, canvasHeight = 600, textureKey = null, width = 20, height = 20) {
        super(0, 0, width, height);
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.textureKey = textureKey;
        this.speed = 150;
        this.reset();
    }

    reset() {
        this.worldX = Math.random() * Math.max(1, this.canvasWidth - this.width);
        this.worldY = -this.height;
        this.speed = 100 + Math.random() * 150;
    }

    update(dt, input, engine) {
        this.y += this.speed * dt;

        if (this.worldY > this.canvasHeight) {
            this.reset();
        }

        super.update(dt, input, engine);
    }

    draw(ctx, engine) {
        const texture = (engine && this.textureKey && typeof engine.getAsset === 'function')
            ? engine.getAsset(this.textureKey)
            : null;

        const wx = this.worldX;
        const wy = this.worldY;
        if (texture) {
            ctx.drawImage(texture, wx, wy, this.width, this.height);
        } else {
            ctx.save();
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.arc(wx + this.width / 2, wy + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }
}