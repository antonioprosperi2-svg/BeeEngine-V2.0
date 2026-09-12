/**
 * BeePool — prealloca, spawn, release.
 * Create/destroy a ogni sparo è il hitch GC più comune in Canvas.
 * Se il pool è pieno, riutilizza il più vecchio ancora in uso (anello).
 */

export const BEE_POOL_DEFAULTS = Object.freeze({
    initial: 0,
    max: 256,
    reclaim: true
});

export class BeePool {
    /**
     * @param {{
     *   create: (...args: any[]) => any,
     *   reset?: (item: any, ...args: any[]) => void,
     *   dispose?: (item: any) => void,
     *   initial?: number,
     *   max?: number,
     *   reclaim?: boolean
     * }} options
     */
    constructor(options = {}) {
        if (typeof options.create !== 'function') {
            throw new Error('BeePool: serve create()');
        }

        this.create = options.create;
        this.reset = typeof options.reset === 'function' ? options.reset : null;
        this.dispose = typeof options.dispose === 'function' ? options.dispose : null;
        this.max = Number.isFinite(Number(options.max)) ? Number(options.max) : BEE_POOL_DEFAULTS.max;
        this.reclaim = options.reclaim !== false;

        this.#free = [];
        this.#live = new Set();
        this.#order = [];

        const initial = Number(options.initial);
        if (initial > 0) this.prewarm(initial);
    }

    #free;
    #live;
    #order;

    get available() {
        return this.#free.length;
    }

    get inUse() {
        return this.#live.size;
    }

    get size() {
        return this.#free.length + this.#live.size;
    }

    prewarm(count) {
        const n = Number(count) || 0;
        for (let i = 0; i < n; i++) {
            if (this.size >= this.max) break;
            const item = this.create();
            this.#bind(item);
            this.#sleep(item);
            this.#free.push(item);
        }
        return this;
    }

    acquire(...args) {
        let item = this.#free.pop();

        if (!item) {
            if (this.size < this.max) {
                item = this.create(...args);
            } else if (this.reclaim && this.#order.length > 0) {
                item = this.#order.shift();
                this.#live.delete(item);
                this.#sleep(item);
            } else {
                return null;
            }
        }

        this.#bind(item);
        this.#wake(item);
        if (this.reset) {
            this.reset(item, ...args);
        } else if (item && typeof item.reset === 'function') {
            item.reset(...args);
        }
        this.#live.add(item);
        this.#order.push(item);
        return item;
    }

    release(item) {
        if (!item || !this.#live.has(item)) return this;
        this.#live.delete(item);
        const index = this.#order.indexOf(item);
        if (index >= 0) this.#order.splice(index, 1);
        this.#sleep(item);
        this.#free.push(item);
        return this;
    }

    releaseAll() {
        const live = this.#order.slice();
        for (let i = 0; i < live.length; i++) {
            this.release(live[i]);
        }
        return this;
    }

    clear() {
        const all = this.#order.concat(this.#free);
        this.#order.length = 0;
        this.#free.length = 0;
        this.#live.clear();
        for (let i = 0; i < all.length; i++) {
            const item = all[i];
            if (!item) continue;
            item.pool = null;
            if (this.dispose) {
                this.dispose(item);
            } else if (typeof item.dispose === 'function') {
                item.dispose();
            } else if (typeof item.destroy === 'function') {
                item.destroy();
            }
        }
        return this;
    }

    #bind(item) {
        if (item && typeof item === 'object') {
            item.pool = this;
        }
    }

    #wake(item) {
        if (!item || typeof item !== 'object') return;
        item.destroyed = false;
        item.active = true;
        if ('visible' in item) item.visible = true;
    }

    #sleep(item) {
        if (!item || typeof item !== 'object') return;
        item.destroyed = true;
        item.active = false;
        if ('visible' in item) item.visible = false;
        if (typeof item.detach === 'function') item.detach();
        if (typeof item.recycle === 'function') item.recycle();
    }
}
