export class BeeSprite {
    constructor(image, frameWidth, frameHeight, framesPerRow, speed = 0.1) {
        this.image = image;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.framesPerRow = framesPerRow;
        this.speed = speed;
        this.frame = 0;
    }
    /**
     * @param {number} dt tempo di simulazione (scalato). In pausa è 0.
     */
    update(dt) { this.frame += this.speed * dt; }
    draw(ctx, x, y) {
        // Calcola quale fotogramma (frame) mostrare
        const f = Math.floor(this.frame % this.framesPerRow);
        // Calcola la riga (se hai un foglio di sprite con più righe)
        const row = Math.floor(this.frame / this.framesPerRow);

        // Disegna solo il pezzettino dell'immagine (il frame attuale)
        ctx.drawImage(
            this.image,
            f * this.frameWidth, row * this.frameHeight, // Da dove prende il pezzo
            this.frameWidth, this.frameHeight,           // Quanto è grande il pezzo
            x, y,                                        // Dove metterlo sullo schermo
            this.frameWidth, this.frameHeight            // Dimensione finale
        );
    }
}
/** 🌟 * Classe BeeSprite: Gestisce i sprite animati nel gioco.
 * Permette di caricare immagini con più fotogrammi e di animarle in base a un tempo.
 * Utilizzata per creare animazioni fluide per personaggi, effetti speciali o oggetti interattivi.
 */