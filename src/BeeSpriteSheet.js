export class BeeSpriteSheet {
    constructor(image, frameWidth, frameHeight, config = {}) {
        this.image = image;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.framesPerRow = config.framesPerRow || 1;
        this.frameCount = config.frameCount || 1;
    }

    // Ritaglia e disegna il frame (0, 1, 2, 3...) dall'immagine originale
    drawFrame(ctx, frameIndex, x, y, destWidth, destHeight) {
        if (!this.image) return;

        const col = frameIndex % this.framesPerRow;
        const row = Math.floor(frameIndex / this.framesPerRow);

        const srcX = col * this.frameWidth;
        const srcY = row * this.frameHeight;

        ctx.drawImage(
            this.image,
            srcX, srcY,
            this.frameWidth, this.frameHeight,
            x, y,
            destWidth || this.frameWidth, destHeight || this.frameHeight
        );
    }
}