import { BeeRectCollider } from './BeeRectCollider.js';

/**
 * BeeEngine 2D Game Engine - Tilemap Loader Definitivo (v3.0 - Super Ottimizzato)
 * Gestisce Image Collections da Tiled, pre-carica gli asset senza duplicati,
 * applica un Frustum Culling matematico e fonde i collisori in 2D (X e Y).
 */
export class BeeTilemapLoader {
    /**
     * @param {Object} engine Istanza del motore BeeEngine
     */
    constructor(engine) {
        this.engine = engine;
        this.tileLookup = new Map();
        this.layers = [];
        this.mapWidth = 0;
        this.mapHeight = 0;
        this.gridCellSize = 128;
        this.isLoaded = false;
        this.solidColliders = [];
    }

    /**
     * Pre-carica automaticamente tutte le immagini presenti nel JSON di Tiled
     * dentro BeeAssetManager ed evita di scaricare duplicati.
     */
    async preloadAssets(mapJson, basePath = 'assets/images/') {
        if (!mapJson.tilesets) return;

        const loadPromises = [];
        const loadedImages = new Set();

        mapJson.tilesets.forEach(tileset => {
            if (tileset.tiles) {
                tileset.tiles.forEach(tile => {
                    const imageName = tile.image.replace(/^.*[\\/]/, '');

                    if (!loadedImages.has(imageName)) {
                        loadedImages.add(imageName);
                        const fullPath = `${basePath}${imageName}`;

                        if (this.engine.assets && typeof this.engine.assets.loadImage === 'function') {
                            loadPromises.push(this.engine.assets.loadImage(imageName, fullPath));
                        }
                    }
                });
            }
        });

        await Promise.all(loadPromises);
    }

    /**
     * Carica e analizza la struttura del file JSON di Tiled
     */
    load(mapJson) {
        this.mapWidth = mapJson.width;
        this.mapHeight = mapJson.height;
        this.gridCellSize = mapJson.tilewidth || 128;
        this.tileLookup.clear();
        this.solidColliders = [];

        if (mapJson.tilesets && mapJson.tilesets.length > 0) {
            mapJson.tilesets.forEach(tileset => {
                const firstGid = tileset.firstgid || 1;
                if (tileset.tiles) {
                    tileset.tiles.forEach(tile => {
                        const globalId = tile.id + firstGid;
                        const imagePath = tile.image.replace(/^.*[\\/]/, '');

                        this.tileLookup.set(globalId, {
                            imagePath: imagePath,
                            width: tile.imagewidth,
                            height: tile.imageheight
                        });
                    });
                }
            });
        }

        this.layers = mapJson.layers.filter(layer => layer.type === 'tilelayer');

        // Genera le collisioni con il nuovo algoritmo 2D
        this.#generateOptimizedSolids();

        this.isLoaded = true;
    }

    /**
     * ALGORITMO GREEDY MESHING 2D DEFINITIVO
     * Fonde le tile solide adiacenti sia in orizzontale (X) che in verticale (Y)
     * basandosi rigorosamente sulla griglia logica per evitare bug fisici.
     */
    #generateOptimizedSolids() {
        this.solidColliders = [];
        this.layers.forEach(layer => this.#processSolidLayer(layer));
    }

    #processSolidLayer(layer) {
        if (!this.#isSolidLayer(layer)) return;

        const data = layer.data;
        const visited = new Uint8Array(this.mapWidth * this.mapHeight);

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const index = y * this.mapWidth + x;
                if (!this.#shouldCreateCollider(data, visited, index)) continue;

                const { w, h } = this.#measureSolidRect(data, visited, x, y);
                this.#markVisitedTiles(visited, x, y, w, h);
                this.#addCollider(x, y, w, h);
            }
        }
    }

    #isSolidLayer(layer) {
        const layerName = (layer.name || '').toLowerCase();
        if (this.layers.length === 1) return true;

        if (
            layerName === 'solids' ||
            layerName === 'platforms' ||
            layerName === 'livello tile 1'
        ) {
            return true;
        }

        return (layer.properties || []).some(p => p.name === 'solid' && p.value === true);
    }

    #shouldCreateCollider(data, visited, index) {
        return data[index] !== 0 && this.tileLookup.has(data[index]) && !visited[index];
    }

    #measureSolidRect(data, visited, startX, startY) {
        let w = 1;

        while (
            startX + w < this.mapWidth &&
            data[startY * this.mapWidth + (startX + w)] !== 0 &&
            !visited[startY * this.mapWidth + (startX + w)]
        ) {
            w++;
        }

        let h = 1;
        while (this.#canGrowSolidRect(data, visited, startX, startY, w, h)) {
            h++;
        }

        return { w, h };
    }

    #canGrowSolidRect(data, visited, startX, startY, width, height) {
        if (startY + height >= this.mapHeight) return false;

        const rowStart = (startY + height) * this.mapWidth + startX;
        for (let k = 0; k < width; k++) {
            const index = rowStart + k;
            if (data[index] === 0 || visited[index]) {
                return false;
            }
        }

        return true;
    }

    #markVisitedTiles(visited, startX, startY, width, height) {
        for (let ny = 0; ny < height; ny++) {
            for (let nx = 0; nx < width; nx++) {
                visited[(startY + ny) * this.mapWidth + (startX + nx)] = 1;
            }
        }
    }

    #addCollider(x, y, width, height) {
        this.solidColliders.push(
            new BeeRectCollider(
                x * this.gridCellSize,
                y * this.gridCellSize,
                width * this.gridCellSize,
                height * this.gridCellSize
            )
        );
    }

    /**
     * Restituisce i collisori per BeeCollisionSystem
     */
    getColliders() {
        return this.solidColliders;
    }

    /**
     * RENDERING MATEMATICO CON FRUSTUM CULLING PREDITTIVO
     * Calcola a priori quali righe e colonne sono visibili.
     * Salta istantaneamente migliaia di tile fuori schermo senza fare cicli inutili.
     */
    render(ctx) {
        if (!this.isLoaded) return;
        const camera = this.engine.camera;

        // Se la telecamera non è definita, esegui il fallback sul disegno standard sicuro
        if (!camera) {
            this.#renderAll(ctx);
            return;
        }

        // Calcola gli indici di inizio e fine visibili sulla griglia (usa camera.w e camera.h)
        const cameraWidth = camera.w ?? camera.width ?? 0;
        const cameraHeight = camera.h ?? camera.height ?? 0;

        const startX = Math.max(0, Math.floor(camera.x / this.gridCellSize));
        const endX = Math.min(this.mapWidth - 1, Math.ceil((camera.x + cameraWidth) / this.gridCellSize));

        const startY = Math.max(0, Math.floor(camera.y / this.gridCellSize));
        const endY = Math.min(this.mapHeight - 1, Math.ceil((camera.y + cameraHeight) / this.gridCellSize));

        this.layers.forEach(layer => {
            if (!layer.visible) return;

            const data = layer.data;

            // Itera SOLO ed esclusivamente nell'area visibile dallo schermo
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    const i = y * this.mapWidth + x;
                    const tileGid = data[i];
                    if (tileGid === 0) continue;

                    const tileInfo = this.tileLookup.get(tileGid);
                    if (!tileInfo) continue;

                    const gridX = x * this.gridCellSize;
                    const gridY = y * this.gridCellSize;
                    const offsetY = this.gridCellSize - tileInfo.height;
                    const texture = this.engine.assets.getImage(tileInfo.imagePath);

                    if (texture) {
                        ctx.drawImage(
                            texture,
                            gridX,
                            gridY + offsetY,
                            tileInfo.width,
                            tileInfo.height
                        );
                    }
                }
            }
        });
    }

    /**
   * Disegna tutte le tile correggendo i nomi con spazi e allineando gli elementi grafici
   */
    #renderAll(ctx) {
        this.layers.forEach(layer => {
            if (!layer.visible) return;
            const data = layer.data;

            for (let i = 0; i < data.length; i++) {
                const tileGid = data[i];
                if (tileGid === 0) continue;

                const tileInfo = this.tileLookup.get(tileGid);
                if (!tileInfo) continue;

                const gridX = (i % this.mapWidth) * this.gridCellSize;
                const gridY = Math.floor(i / this.mapWidth) * this.gridCellSize;

                // 1. Allineamento sul fondo della cella (128 - altezza reale della tile)
                const offsetY = this.gridCellSize - tileInfo.height;

                // 2. DECODIFICA IL NOME: Trasforma gli spazi reali in nomi compatibili con l'asset manager
                // Cerca sia il nome con lo spazio (" (4).png") sia la versione web ("%20(4).png")
                let texture = this.engine.assets.getImage(tileInfo.imagePath);
                if (!texture) {
                    const encodedPath = encodeURIComponent(tileInfo.imagePath);
                    texture = this.engine.assets.getImage(encodedPath);
                }

                // 3. Disegna l'elemento centrato orizzontalmente o allineato a sinistra nella cella da 128
                if (texture) {
                    ctx.drawImage(
                        texture,
                        gridX,
                        gridY + offsetY,
                        tileInfo.width,
                        tileInfo.height
                    );
                }
            }
        });
    }
}
