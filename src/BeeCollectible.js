/**
 * Classe che gestisce gli oggetti collezionabili (monete, miele, bonus) che cadono dall'alto.
 * Si riposiziona automaticamente in cima allo schermo quando viene raccolto o cade oltre il bordo.
 * 
 * @class BeeCollectible
 * @param {number} canvasWidth - Larghezza del canvas di gioco per il calcolo dei bordi X.
 * @param {number} canvasHeight - Altezza del canvas di gioco per il calcolo del reset Y.
 * @param {string} [textureKey='mieleImg'] - La chiave dell'asset grafico caricato nell'AssetManager.
 * @param {number} [width=20] - Larghezza dell'oggetto in pixel.
 * @param {number} [height=20] - Altezza dell'oggetto in pixel.
 */
export class BeeCollectible {
    constructor(canvasWidth, canvasHeight, textureKey = 'mieleImg', width = 20, height = 20) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.textureKey = textureKey;
        this.width = width;
        this.height = height;
        this.reset();
    }

    /**
     * Riposiziona l'oggetto in cima allo schermo in una coordinata X casuale
     * e gli assegna una velocità di caduta random.
     */
    reset() {
        this.x = Math.random() * (this.canvasWidth - this.width);
        this.y = -this.height;
        this.velocita = 2 + Math.random() * 3;
    }

    /**
     * Aggiorna la posizione Y dell'oggetto facendolo cadere.
     * Se supera il bordo inferiore, esegue il reset.
     * @param {number} dt - Delta time per la fluidità del movimento.
     */
    update(dt) {
        this.y += this.velocita;

        if (this.y > this.canvasHeight) {
            this.reset();
        }
    }

    /**
     * Disegna l'immagine dell'oggetto sul canvas tramite l'AssetManager.
     * In caso di mancato caricamento dell'asset, mostra un cerchio vettoriale di backup.
     * @param {CanvasRenderingContext2D} ctx - Il contesto grafico 2D del Canvas.
     * @param {BeeEngine} engine - L'istanza principale del motore per recuperare gli asset.
     */
    draw(ctx, engine) {
        const texture = (engine && typeof engine.getAsset === 'function') ? engine.getAsset(this.textureKey) : null;

        if (texture) {
            ctx.drawImage(texture, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
        }
    }
}