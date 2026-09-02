import { BeeEntity } from '../core/BeeEntity.js';

/**
 * BeePlayer: Base playable character entity for 2D platformer and arcade games.
 * Supports score, lives, movement modes (platformer vs free 360 flight), and custom animations.
 */
export class BeePlayer extends BeeEntity {
    /**
     * @param {number} [x=100] 
     * @param {number} [y=100] 
     * @param {number} [width=40] 
     * @param {number} [height=40] 
     * @param {string|null} [textureKey=null] 
     */
    constructor(x = 100, y = 100, width = 40, height = 40, textureKey = null) {
        super(x, y, width, height);
        this.speed = 220;

        this.baseJumpForce = -420;
        this.jumpForce = this.baseJumpForce;
        this.gravity = 500;
        this.textureKey = textureKey;

        this.score = 0;
        this.lives = 3;
        this.mode = 'platformer'; // 'platformer' or 'free'
        this._jumpBoostRemaining = 0;
    }

    jump() {
        if (this.isGrounded || this.mode === 'free') {
            this.vy = this.jumpForce;
            this.isGrounded = false;
        }
    }

    /**
     * Increases jump power permanently.
     * @param {number} amount 
     */
    boostJump(amount) {
        this.jumpForce = this.baseJumpForce - amount;
    }

    /**
     * Legacy alias for boostJump
     */
    potenziaSalto(amount) {
        this.boostJump(amount);
    }

    /**
     * Temporarily boosts jump power for a duration in milliseconds (simulation time).
     * @param {number} amount 
     * @param {number} durationMs 
     */
    boostJumpTemporary(amount, durationMs) {
        this.boostJump(amount);
        this._jumpBoostRemaining = Math.max(0, durationMs) / 1000;
    }

    /**
     * Legacy alias for boostJumpTemporary
     */
    potenziaSaltoTemporaneo(amount, durationMs) {
        this.boostJumpTemporary(amount, durationMs);
    }

    addScore(points) {
        this.score += points;
    }

    takeDamage(amount = 1) {
        this.lives = Math.max(0, this.lives - amount);
        return this.lives <= 0;
    }

    update(dt, input, engine) {
        if (!input) return;

        if (this._jumpBoostRemaining > 0) {
            this._jumpBoostRemaining -= dt;
            if (this._jumpBoostRemaining <= 0) {
                this._jumpBoostRemaining = 0;
                this.jumpForce = this.baseJumpForce;
            }
        }

        this.vx = 0;
        if (input.isPressed("ArrowRight") || input.isPressed("KeyD")) this.vx = this.speed;
        if (input.isPressed("ArrowLeft") || input.isPressed("KeyA")) this.vx = -this.speed;

        if (this.mode === 'platformer') {
            if (input.wasPressed("Space") || input.wasPressed("ArrowUp") || input.wasPressed("KeyW")) {
                this.jump();
            }
        } else {
            if (input.isPressed("ArrowDown") || input.isPressed("KeyS")) this.vy = this.speed;
            else if (input.isPressed("ArrowUp") || input.isPressed("KeyW")) this.vy = -this.speed;
            else this.vy = 0;
        }

        super.update(dt, input, engine);
    }

    draw(ctx, engine) {
        if (this.sprite) {
            if (this.vx < 0) this.sprite.flipX = true;
            if (this.vx > 0) this.sprite.flipX = false;

            this.sprite.draw(ctx, this.worldX, this.worldY, { width: this.width, height: this.height });
            return;
        }

        const texture = (engine && this.textureKey) ? engine.getAsset(this.textureKey) : null;
        if (texture) {
            ctx.drawImage(texture, this.worldX, this.worldY, this.width, this.height);
            return;
        }

        ctx.save();
        ctx.fillStyle = "#4A90E2";
        ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.worldX, this.worldY, this.width, this.height);
        ctx.restore();
    }
}
