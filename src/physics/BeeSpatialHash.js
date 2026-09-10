/**
 * BeeSpatialHash — indice uniforme a celle.
 * Risponde “chi è vicino a questo AABB?” senza coppie n².
 * Quadtree è meglio con oggetti enormi vs granelli; qui i gameplay
 * (proiettili, nemici, body) sono di taglia simile: l'hash vince.
 */

export const BEE_SPATIAL_HASH_DEFAULTS = Object.freeze({
    cellSize: 64
});

function cellCoord(value, cellSize) {
    return Math.floor(value / cellSize);
}

function packCell(cx, cy) {
    return ((cx + 32768) << 16) | ((cy + 32768) & 0xffff);
}

function aabbOf(item) {
    if (!item) return null;
    if (item.aabb && typeof item.aabb.x === 'number') return item.aabb;
    if (typeof item.getWorldAABB === 'function') return item.getWorldAABB();
    const x = typeof item.worldX === 'number' ? item.worldX : Number(item.x) || 0;
    const y = typeof item.worldY === 'number' ? item.worldY : Number(item.y) || 0;
    return {
        x,
        y,
        width: item.width ?? 0,
        height: item.height ?? 0
    };
}

export class BeeSpatialHash {
    /**
     * @param {Partial<typeof BEE_SPATIAL_HASH_DEFAULTS>} [options]
     */
    constructor(options = {}) {
        const cfg = { ...BEE_SPATIAL_HASH_DEFAULTS, ...options };
        this.cellSize = Math.max(8, Number(cfg.cellSize) || 64);
        this.#buckets = new Map();
        this.#ids = new WeakMap();
        this.#nextId = 1;
        this.#seen = new Set();
        this.#pairSeen = new Set();
        this.#queryBuf = [];
        this.itemCount = 0;
        this.insertCount = 0;
    }

    #buckets;
    #ids;
    #nextId;
    #seen;
    #pairSeen;
    #queryBuf;

    get cellCount() {
        let n = 0;
        for (const bucket of this.#buckets.values()) {
            if (bucket.length > 0) n += 1;
        }
        return n;
    }

    configure(options = {}) {
        if (options.cellSize != null) {
            this.cellSize = Math.max(8, Number(options.cellSize) || 64);
        }
        return this;
    }

    clear() {
        for (const bucket of this.#buckets.values()) {
            bucket.length = 0;
        }
        this.itemCount = 0;
        this.insertCount = 0;
        return this;
    }

    #id(item) {
        if (item && typeof item.id === 'number') return item.id;
        let id = this.#ids.get(item);
        if (id === undefined) {
            id = this.#nextId++;
            this.#ids.set(item, id);
        }
        return id;
    }

    #bucket(cx, cy) {
        const key = packCell(cx, cy);
        let bucket = this.#buckets.get(key);
        if (!bucket) {
            bucket = [];
            this.#buckets.set(key, bucket);
        }
        return bucket;
    }

    insert(item, box = null) {
        if (!item) return this;
        const aabb = box || aabbOf(item);
        if (!aabb || !(aabb.width > 0) || !(aabb.height > 0)) return this;

        const size = this.cellSize;
        const minX = cellCoord(aabb.x, size);
        const minY = cellCoord(aabb.y, size);
        const maxX = cellCoord(aabb.x + aabb.width, size);
        const maxY = cellCoord(aabb.y + aabb.height, size);

        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                this.#bucket(cx, cy).push(item);
            }
        }
        this.itemCount += 1;
        this.insertCount += 1;
        return this;
    }

    query(aabb, out = this.#queryBuf) {
        out.length = 0;
        if (!aabb) return out;

        const seen = this.#seen;
        seen.clear();
        const size = this.cellSize;
        const minX = cellCoord(aabb.x, size);
        const minY = cellCoord(aabb.y, size);
        const maxX = cellCoord(aabb.x + (aabb.width || 0), size);
        const maxY = cellCoord(aabb.y + (aabb.height || 0), size);

        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                const bucket = this.#buckets.get(packCell(cx, cy));
                if (!bucket) continue;
                for (let i = 0; i < bucket.length; i++) {
                    const item = bucket[i];
                    const id = this.#id(item);
                    if (seen.has(id)) continue;
                    seen.add(id);
                    out.push(item);
                }
            }
        }
        return out;
    }

    queryPoint(x, y, out = this.#queryBuf) {
        return this.query({ x, y, width: 0, height: 0 }, out);
    }

    queryRadius(x, y, radius, out = this.#queryBuf) {
        const r = Math.max(0, Number(radius) || 0);
        this.query({ x: x - r, y: y - r, width: r * 2, height: r * 2 }, out);
        let write = 0;
        for (let i = 0; i < out.length; i++) {
            const item = out[i];
            const box = aabbOf(item);
            if (!box) continue;
            const cx = box.x + box.width * 0.5;
            const cy = box.y + box.height * 0.5;
            const dx = cx - x;
            const dy = cy - y;
            const reach = r + Math.max(box.width, box.height) * 0.5;
            if (dx * dx + dy * dy <= reach * reach) {
                out[write] = item;
                write += 1;
            }
        }
        out.length = write;
        return out;
    }

    /**
     * Ogni coppia unica una volta, anche se gli oggetti condividono più celle.
     */
    forEachPair(callback) {
        if (typeof callback !== 'function') return 0;
        const seen = this.#pairSeen;
        seen.clear();
        let pairs = 0;

        for (const bucket of this.#buckets.values()) {
            const n = bucket.length;
            if (n < 2) continue;
            for (let i = 0; i < n; i++) {
                const a = bucket[i];
                const idA = this.#id(a);
                for (let j = i + 1; j < n; j++) {
                    const b = bucket[j];
                    if (a === b) continue;
                    const idB = this.#id(b);
                    const lo = idA < idB ? idA : idB;
                    const hi = idA < idB ? idB : idA;
                    const key = lo * 4194304 + hi;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    callback(a, b);
                    pairs += 1;
                }
            }
        }
        return pairs;
    }
}

export { aabbOf as spatialAabbOf };
