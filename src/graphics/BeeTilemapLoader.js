import { BeeRectCollider } from '../physics/BeeRectCollider.js';

/**
 * BeeEngine 2D Game Engine - Tilemap Loader Definitivo (v3.2)
 * Caricamento asset senza 404, Frustum Culling e Greedy Meshing 2D.
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
     * Pre-carica gli asset dal JSON senza tentativi a vuoto in console
     */
    async preloadAssets(mapJson, basePath = 'assets/') {
        if (!mapJson || !mapJson.tilesets) return;

        const loadPromises = [];
        const loadedImages = new Set();

        const processImagePath = (rawPath) => {
            if (!rawPath) return;
            const imageName = rawPath.split('/').pop().split('\\').pop();
            const cleanPath = `${basePath}${imageName}`.replace(/\/+/g, '/');

            if (!loadedImages.has(imageName)) {
                loadedImages.add(imageName);

                if (this.engine.assets && typeof this.engine.assets.loadImage === 'function') {
                    loadPromises.push(
                        this.engine.assets.loadImage(imageName, cleanPath).catch(() => {
                            console.warn(`⚠️ Impossibile caricare asset: ${cleanPath}`);
                        })
                    );
                }
            }
        };

        mapJson.tilesets.forEach(tileset => {
            if (tileset.image) {
                processImagePath(tileset.image);
            }
            if (tileset.tiles && Array.isArray(tileset.tiles)) {
                tileset.tiles.forEach(tile => {
                    if (tile.image) processImagePath(tile.image);
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
                const tileWidth = tileset.tileheight ? tileset.tilewidth : (mapJson.tilewidth || this.gridCellSize);
                const tileHeight = tileset.tileheight || mapJson.tileheight || this.gridCellSize;
                const margin = tileset.margin || 0;
                const spacing = tileset.spacing || 0;
                const columns = tileset.columns || 1;

                if (tileset.image) {
                    const imagePath = tileset.image;
                    const imageName = imagePath.split('/').pop().split('\\').pop();
                    const tileCount = tileset.tilecount || 1;

                    for (let id = 0; id < tileCount; id++) {
                        const globalId = firstGid + id;
                        const col = id % columns;
                        const row = Math.floor(id / columns);
                        const sx = margin + col * (tileWidth + spacing);
                        const sy = margin + row * (tileHeight + spacing);

                        this.tileLookup.set(globalId, {
                            imagePath: imagePath,
                            imageName: imageName,
                            isSpriteSheet: true,
                            sx: sx,
                            sy: sy,
                            width: tileWidth,
                            height: tileHeight
                        });
                    }
                }

                if (tileset.tiles && Array.isArray(tileset.tiles)) {
                    tileset.tiles.forEach(tile => {
                        const globalId = firstGid + tile.id;
                        if (tile.image) {
                            const imagePath = tile.image;
                            const imageName = imagePath.split('/').pop().split('\\').pop();
                            this.tileLookup.set(globalId, {
                                imagePath: imagePath,
                                imageName: imageName,
                                isSpriteSheet: false,
                                width: tile.imagewidth || tileWidth,
                                height: tile.imageheight || tileHeight
                            });
                        }
                    });
                }
            });
        }

        this.layers = (mapJson.layers || []).filter(layer => layer.type === 'tilelayer');

        this.#generateOptimizedSolids();
        this.isLoaded = true;
    }

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

    getColliders() {
        return this.solidColliders;
    }

    #getTexture(tileInfo) {
        return this.engine.assets.getImage(tileInfo.imageName) ||
            this.engine.assets.getImage(tileInfo.imagePath) ||
            this.engine.assets.getImage(encodeURIComponent(tileInfo.imagePath));
    }

    render(ctx) {
        if (!this.isLoaded) return;
        const camera = this.engine.camera;

        if (!camera) {
            this.#renderAll(ctx);
            return;
        }

        const cameraWidth = camera.w ?? camera.width ?? 0;
        const cameraHeight = camera.h ?? camera.height ?? 0;

        const startX = Math.max(0, Math.floor(camera.x / this.gridCellSize));
        const endX = Math.min(this.mapWidth - 1, Math.ceil((camera.x + cameraWidth) / this.gridCellSize));

        const startY = Math.max(0, Math.floor(camera.y / this.gridCellSize));
        const endY = Math.min(this.mapHeight - 1, Math.ceil((camera.y + cameraHeight) / this.gridCellSize));

        this.layers.forEach(layer => {
            if (!layer.visible) return;

            const data = layer.data;

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
                    const texture = this.#getTexture(tileInfo);

                    if (texture) {
                        if (tileInfo.isSpriteSheet) {
                            ctx.drawImage(
                                texture,
                                tileInfo.sx,
                                tileInfo.sy,
                                tileInfo.width,
                                tileInfo.height,
                                gridX,
                                gridY + offsetY,
                                tileInfo.width,
                                tileInfo.height
                            );
                        } else {
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
            }
        });
    }

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
                const offsetY = this.gridCellSize - tileInfo.height;
                const texture = this.#getTexture(tileInfo);

                if (texture) {
                    if (tileInfo.isSpriteSheet) {
                        ctx.drawImage(
                            texture,
                            tileInfo.sx,
                            tileInfo.sy,
                            tileInfo.width,
                            tileInfo.height,
                            gridX,
                            gridY + offsetY,
                            tileInfo.width,
                            tileInfo.height
                        );
                    } else {
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
}