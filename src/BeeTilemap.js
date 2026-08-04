export class BeeTilemap {
    constructor() {
        this.tileSize = 128; // Dimensione tile da Tiled (128x128)
        this.cols = 0;
        this.rows = 0;
        this.layers = [];
        this.tilesetImg = null;
    }

    loadJSON(jsonMap, tilesetImg) {
        if (!jsonMap) return;
        this.tilesetImg = tilesetImg;
        this.tileSize = jsonMap.tilewidth || 128;
        this.cols = jsonMap.width;
        this.rows = jsonMap.height;
        // Salva i layer del JSON di Tiled
        this.layers = jsonMap.layers || [];
    }

    render(ctx, camera) {
        if (!this.tilesetImg || !this.layers.length) return;

        const tilesPerRow = Math.floor(this.tilesetImg.width / this.tileSize);

        // Cicla su tutti i layer della mappa Tiled
        for (const layer of this.layers) {
            if (layer.type !== 'tilelayer' || !layer.visible) continue;

            for (let index = 0; index < layer.data.length; index++) {
                const tileId = layer.data[index];
                if (tileId === 0) continue; // Tile vuoto

                // Calcolo posizione nella griglia di gioco
                const x = (index % this.cols) * this.tileSize;
                const y = Math.floor(index / this.cols) * this.tileSize;

                // Calcolo ritaglio dallo spritesheet (1-based index di Tiled)
                const gid = tileId - 1;
                const sx = (gid % tilesPerRow) * this.tileSize;
                const sy = Math.floor(gid / tilesPerRow) * this.tileSize;

                // Disegno a schermo
                ctx.drawImage(
                    this.tilesetImg,
                    sx, sy, this.tileSize, this.tileSize,
                    x, y, this.tileSize, this.tileSize
                );
            }
        }
    }
}