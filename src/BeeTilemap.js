import { BeeEntity } from './BeeEntity.js';

export class BeeTilemap {
    constructor() {
        this.tileSize = 32;
        this.cols = 0;
        this.rows = 0;
        this.tileset = null;       // L'immagine del foglio di blocchi (PNG)
        this.tilesetColumns = 0;  // Quanti blocchi ci sono per riga nel PNG
        this.layers = [];
    }

    /**
     * Carica i dati dal JSON e la texture del tileset
     * @param {Object} mapData - Oggetto JSON della mappa
     * @param {HTMLImageElement} tilesetImage - Immagine del tileset caricata da BeeAssetManager
     */
    loadJSON(jsonMap, tilesetImage) {
        if (!jsonMap) {
            console.error("❌ ERRORE: jsonMap passato a BeeTilemap è undefined!");
            return;
        }
        this.tileset = tilesetImage;
        this.tileSize = jsonMap.tilewidth || 32;
        this.cols = jsonMap.width;
        this.rows = jsonMap.height;

        if (jsonMap.layers && jsonMap.layers[0]) {
            this.data = jsonMap.layers[0].data;
        }
    }

    /**
     * Disegna la mappa gestendo la Camera e il Culling visivo
     */
    render(ctx, camera) {
        if (!this.tileset || this.layers.length === 0) return;

        // --- CULLING VISIVO: Calcola solo i tile visibili nella viewport ---
        const startCol = Math.max(0, Math.floor(camera.x / this.tileSize));
        const endCol = Math.min(this.cols, Math.ceil((camera.x + camera.width) / this.tileSize));

        const startRow = Math.max(0, Math.floor(camera.y / this.tileSize));
        const endRow = Math.min(this.rows, Math.ceil((camera.y + camera.height) / this.tileSize));

        // Ciclo su ogni livello (layer) della mappa
        for (let l = 0; l < this.layers.length; l++) {
            const layer = this.layers[l];
            const data = layer.data;

            for (let row = startRow; row < endRow; row++) {
                for (let col = startCol; col < endCol; col++) {
                    const tileIndex = data[row * this.cols + col];

                    // Se il tileIndex è 0, è spazio vuoto: salta!
                    if (tileIndex === 0) continue;

                    // Calcolo delle coordinate (X, Y) dentro l'immagine PNG del Tileset
                    // Arrotondiamo Math.floor per evitare sbavature o righe tremolanti sui bordi!
                    const id = tileIndex - 1; // Se gli ID nel JSON partono da 1
                    const sx = (id % this.tilesetColumns) * this.tileSize;
                    const sy = Math.floor(id / this.tilesetColumns) * this.tileSize;

                    // Posizione reale di rendering sul Canvas isolata dalla Camera
                    const dx = Math.floor(col * this.tileSize - camera.x);
                    const dy = Math.floor(row * this.tileSize - camera.y);
                    // Questo metodo risponde semplicemente con TRUE o FALSE: "C'è un blocco solido qui?"
                    isSolidAt(x, y); {
                        const col = Math.floor(x / this.tileSize);
                        const row = Math.floor(y / this.tileSize);

                        // Se siamo fuori dai bordi della mappa, non c'è blocco
                        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
                            return false;
                        }

                        // Prende l'ID del blocco dal JSON
                        const tileIndex = this.layers[0].data[row * this.cols + col];

                        // Se l'ID è diverso da 0, significa che c'è un blocco di terra/solido!
                        return tileIndex !== 0;
                    }
                    // Disegno preciso del pezzo di blocco
                    ctx.drawImage(
                        this.tileset,
                        sx, sy, this.tileSize, this.tileSize, // Coordinate sul PNG
                        dx, dy, this.tileSize, this.tileSize  // Coordinate sul Canvas
                    );
                }
            }
        }
    }
}
