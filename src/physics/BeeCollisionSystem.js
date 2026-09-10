/**
 * BeeCollisionSystem: gruppi di entità e regole.
 * Broadphase: BeeSpatialHash. Narrowphase resta AABB / collidesWith.
 */

import { BeeSpatialHash, spatialAabbOf } from './BeeSpatialHash.js';

export class BeeCollisionSystem {
    constructor(engine) {
        this.engine = engine;
        /** @type {Map<string, object[]>} */
        this.groups = new Map();
        /** @type {{ type: string }[]} */
        this.rules = [];
        this.hash = new BeeSpatialHash();
        this.#activeA = [];
        this.#activeB = [];
        this.#query = [];
    }

    #activeA;
    #activeB;
    #query;

    clear() {
        this.groups.clear();
        this.rules = [];
        this.hash.clear();
        return this;
    }

    createGroup(name) {
        if (!this.groups.has(name)) {
            this.groups.set(name, []);
        }
        return this;
    }

    setGroup(name, entities) {
        this.groups.set(name, Array.isArray(entities) ? entities.slice() : []);
        return this;
    }

    add(name, entity) {
        this.createGroup(name);
        const list = this.groups.get(name);
        if (entity && !list.includes(entity)) {
            list.push(entity);
        }
        return this;
    }

    remove(name, entity) {
        const list = this.groups.get(name);
        if (!list) return this;
        const index = list.indexOf(entity);
        if (index >= 0) list.splice(index, 1);
        return this;
    }

    #fillActive(name, out) {
        out.length = 0;
        const list = this.groups.get(name);
        if (!list || list.length === 0) return out;
        for (let i = 0; i < list.length; i++) {
            const e = list[i];
            if (e && e.active !== false && !e.destroyed) {
                out.push(e);
            }
        }
        return out;
    }

    solid(moversGroup, solidsGroup) {
        this.rules.push({ type: 'solid', movers: moversGroup, solids: solidsGroup });
        return this;
    }

    overlap(groupA, groupB, callback) {
        this.rules.push({ type: 'overlap', a: groupA, b: groupB, callback });
        return this;
    }

    run() {
        for (let r = 0; r < this.rules.length; r++) {
            const rule = this.rules[r];
            if (rule.type === 'solid') {
                this.#resolveSolid(rule.movers, rule.solids);
            } else if (rule.type === 'overlap') {
                this.#resolveOverlap(rule.a, rule.b, rule.callback);
            }
        }
    }

    #resolveSolid(moversGroup, solidsGroup) {
        const movers = this.#fillActive(moversGroup, this.#activeA);
        const solids = this.#fillActive(solidsGroup, this.#activeB);
        if (movers.length === 0 || solids.length === 0) return;

        const hash = this.hash;
        hash.clear();
        for (let i = 0; i < solids.length; i++) {
            hash.insert(solids[i], spatialAabbOf(solids[i]));
        }

        for (let i = 0; i < movers.length; i++) {
            const mover = movers[i];
            if (typeof mover.resolvePlatformCollision !== 'function') continue;
            const box = spatialAabbOf(mover);
            const nearby = hash.query(box, this.#query);
            for (let j = 0; j < nearby.length; j++) {
                mover.resolvePlatformCollision(nearby[j]);
            }
        }
    }

    #resolveOverlap(groupA, groupB, callback) {
        const listA = this.#fillActive(groupA, this.#activeA);
        const listB = this.#fillActive(groupB, this.#activeB);
        if (listA.length === 0 || listB.length === 0) return;

        const hash = this.hash;
        hash.clear();
        for (let i = 0; i < listB.length; i++) {
            hash.insert(listB[i], spatialAabbOf(listB[i]));
        }

        const engine = this.engine;
        for (let i = 0; i < listA.length; i++) {
            const a = listA[i];
            const nearby = hash.query(spatialAabbOf(a), this.#query);
            for (let j = 0; j < nearby.length; j++) {
                const b = nearby[j];
                if (a === b) continue;
                const hit = a.collidesWith
                    ? a.collidesWith(b)
                    : engine.checkCollision(a, b);
                if (hit) callback(a, b, engine);
            }
        }
    }
}
