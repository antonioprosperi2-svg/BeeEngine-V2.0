export class BeeAnimatedSprite {
    constructor(spriteSheet, options = {}) {
        this.spriteSheet = spriteSheet;

        this.animations = {};

        this.currentAnimation = null;
        this.currentFrameIndex = 0;
        this.accumulator = 0;

        this.playing = options.autoplay ?? true;

        if (options.animations) {
            for (const animationName in options.animations) {
                this.addAnimation(animationName, options.animations[animationName]);
            }
        } else {
            this.addAnimation("default", {
                frames: this.createFrameArray(0, spriteSheet.frameCount - 1),
                fps: options.fps ?? 10,
                loop: options.loop ?? true
            });
        }

        const firstAnimation = options.animation ?? Object.keys(this.animations)[0];
        this.play(firstAnimation, true);
    }

    createFrameArray(from, to) {
        const frames = [];

        if (from <= to) {
            for (let i = from; i <= to; i++) {
                frames.push(i);
            }
        } else {
            for (let i = from; i >= to; i--) {
                frames.push(i);
            }
        }

        return frames;
    }

    addAnimation(name, options = {}) {
        this.animations[name] = {
            frames: options.frames ?? [0],
            fps: options.fps ?? 10,
            loop: options.loop ?? true
        };
    }

    play(animationName = this.currentAnimation, reset = false) {
        if (!this.animations[animationName]) {
            throw new Error(`BeeAnimatedSprite: animazione "${animationName}" non trovata.`);
        }

        if (this.currentAnimation !== animationName || reset) {
            this.currentAnimation = animationName;
            this.currentFrameIndex = 0;
            this.accumulator = 0;
        }

        this.playing = true;
    }

    pause() {
        this.playing = false;
    }

    stop() {
        this.playing = false;
        this.currentFrameIndex = 0;
        this.accumulator = 0;
    }

    update(dt) {
        if (!this.playing) return;

        const animation = this.animations[this.currentAnimation];

        if (!animation) return;
        if (animation.frames.length <= 1) return;
        if (animation.fps <= 0) return;

        const frameDuration = 1 / animation.fps;

        this.accumulator += dt;

        while (this.accumulator >= frameDuration) {
            this.accumulator -= frameDuration;
            this.currentFrameIndex++;

            if (this.currentFrameIndex >= animation.frames.length) {
                if (animation.loop) {
                    this.currentFrameIndex = 0;
                } else {
                    this.currentFrameIndex = animation.frames.length - 1;
                    this.playing = false;
                    break;
                }
            }
        }
    }

    draw(ctx, x, y, options = {}) {
        const animation = this.animations[this.currentAnimation];

        if (!animation) return;

        const frame = animation.frames[this.currentFrameIndex];

        this.spriteSheet.drawFrame(ctx, frame, x, y, options);
    }

    getCurrentFrame() {
        const animation = this.animations[this.currentAnimation];

        if (!animation) return 0;

        return animation.frames[this.currentFrameIndex];
    }
}