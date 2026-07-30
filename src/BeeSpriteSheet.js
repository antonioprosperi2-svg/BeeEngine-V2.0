export class BeeSpriteSheet {
    constructor(image, frameWidth, frameHeight, options = {}) {
        this.image = image;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;

        this.framesPerRow = options.framesPerRow ?? Math.floor(image.width / frameWidth);
        this.frameCount = options.frameCount ?? this.calculateFrameCount();

        if (!this.framesPerRow || this.framesPerRow <= 0) {
            throw new Error("BeeSpriteSheet: framesPerRow non valido.");
        }
    }

    calculateFrameCount() {
        const cols = Math.floor(this.image.width / this.frameWidth);
        const rows = Math.floor(this.image.height / this.frameHeight);
        return cols * rows;
    }

    getFrameRect(index) {
        const frameIndex = Math.floor(index) % this.frameCount;

        const column = frameIndex % this.framesPerRow;
        const row = Math.floor(frameIndex / this.framesPerRow);

        return {
            sx: column * this.frameWidth,
            sy: row * this.frameHeight,
            sw: this.frameWidth,
            sh: this.frameHeight
        };
    }

    drawFrame(ctx, index, x, y, options = {}) {
        const {
            width = this.frameWidth,
            height = this.frameHeight,
            flipX = false,
            flipY = false
        } = options;

        const frame = this.getFrameRect(index);

        ctx.save();

        if (flipX || flipY) {
            ctx.translate(
                x + (flipX ? width : 0),
                y + (flipY ? height : 0)
            );

            ctx.scale(
                flipX ? -1 : 1,
                flipY ? -1 : 1
            );

            ctx.drawImage(
                this.image,
                frame.sx,
                frame.sy,
                frame.sw,
                frame.sh,
                0,
                0,
                width,
                height
            );
        } else {
            ctx.drawImage(
                this.image,
                frame.sx,
                frame.sy,
                frame.sw,
                frame.sh,
                x,
                y,
                width,
                height
            );
        }

        ctx.restore();
    }
}