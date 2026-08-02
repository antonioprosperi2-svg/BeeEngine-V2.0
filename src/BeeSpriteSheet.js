// src/BeeSpriteSheet.js
export class BeeSpriteSheet {
    constructor(image, frameWidth, frameHeight, options = {}) {
        this.image = image;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;

        // Se l'utente specifica colonna e riga, calcoliamo l'offset in automatico!
        if (options.col !== undefined && options.row !== undefined) {
            this.offsetX = options.col * frameWidth;
            this.offsetY = options.row * frameHeight;
        } else {
            // Altrimenti usiamo gli offset in pixel passati a mano (o 0 di default)
            this.offsetX = options.offsetX || 0;
            this.offsetY = options.offsetY || 0;
        }

        this.framesPerRow = options.framesPerRow || 1;
        this.frameCount = options.frameCount || 1;
    }

    drawFrame(ctx, frameIndex, destX, destY, destW, destH) {
        const col = frameIndex % this.framesPerRow;
        const row = Math.floor(frameIndex / this.framesPerRow);

        // Aggiungi l'offset qui per prendere l'ape dal foglio grande!
        const sourceX = this.offsetX + (col * this.frameWidth);
        const sourceY = this.offsetY + (row * this.frameHeight);

        ctx.drawImage(
            this.image,
            sourceX, sourceY, this.frameWidth, this.frameHeight, // Ritaglio dal Mega-Sheet
            destX, destY, destW, destH                          // Posizione sul Canvas
        );
    }
}