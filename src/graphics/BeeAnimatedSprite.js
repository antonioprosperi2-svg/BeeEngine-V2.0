export class BeeAnimatedSprite {
    constructor(spriteSheet, config = {}) {
        this.sheet = spriteSheet;
        this.animations = config.animations || {};
        this.currentAnimName = config.animation || Object.keys(this.animations)[0];

        this.currentFrameIndex = 0;
        this.timer = 0;
        this.flipX = false;
    }

    play(name) {
        if (this.currentAnimName !== name && this.animations[name]) {
            this.currentAnimName = name;
            this.currentFrameIndex = 0;
            this.timer = 0;
        }
    }

    update(dt) {
        const anim = this.animations[this.currentAnimName];
        if (!anim || !anim.frames || anim.frames.length === 0) return;

        const fps = anim.fps || 8;
        const frameDuration = 1 / fps;

        this.timer += dt;

        if (this.timer >= frameDuration) {
            this.timer -= frameDuration;

            if (anim.loop) {
                this.currentFrameIndex = (this.currentFrameIndex + 1) % anim.frames.length;
            } else {
                this.currentFrameIndex = Math.min(this.currentFrameIndex + 1, anim.frames.length - 1);
            }
        }
    }

    draw(ctx, x, y, options = {}) {
        const anim = this.animations[this.currentAnimName];
        if (!anim) return;

        const frameToDraw = anim.frames[this.currentFrameIndex];
        const width = options.width || this.sheet.frameWidth;
        const height = options.height || this.sheet.frameHeight;

        ctx.save(); // 1. Salva lo stato normale del canvas

        if (this.flipX) {
            // 2. Sposta l'origine al bordo destro dell'immagine e specchia l'asse X
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);

            // 3. Disegna a coordinate (0, 0) perché l'origine è già stata spostata
            this.sheet.drawFrame(ctx, frameToDraw, 0, 0, width, height);
        } else {
            // Disegno normale senza specchio
            this.sheet.drawFrame(ctx, frameToDraw, x, y, width, height);
        }

        ctx.restore(); // 4. Ripristina lo stato per le altre entità
    }
}