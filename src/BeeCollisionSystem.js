/**
 * BeeCollisionSystem: gruppi di entità e regole di collisione risolte in un'unica passata.
 * Evita loop manuali tipo giocatore.resolvePlatformCollision(piattaforma) per ogni blocco.
 */
export class BeeCollisionSystem {
    constructor(engine) {
        this.engine = engine;
        /** @type {Map<string, object[]>} */
        this.groups = new Map();
        /** @type {{ type: string }[]} */
        this.rules = [];
    }

    clear() {
        this.groups.clear();
        this.rules = [];
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

    _activeInGroup(name) {
        const list = this.groups.get(name);
        if (!list || list.length === 0) return [];
        const out = [];
        for (let i = 0; i < list.length; i++) {
            const e = list[i];
            if (e && e.active !== false && !e.destroyed) {
                out.push(e);
            }
        }
        return out;
    }

    /**
     * Risoluzione solida (platformer): ogni mover usa resolvePlatformCollision contro i solidi.
     */
    solid(moversGroup, solidsGroup) {
        this.rules.push({ type: 'solid', movers: moversGroup, solids: solidsGroup });
        return this;
    }

    /**
     * Overlap AABB tra due gruppi; il callback riceve (entitàA, entitàB, engine).
     */
    overlap(groupA, groupB, callback) {
        this.rules.push({ type: 'overlap', a: groupA, b: groupB, callback });
        return this;
    }

    run() {
        for (let r = 0; r < this.rules.length; r++) {
            const rule = this.rules[r];
            if (rule.type === 'solid') {
                this._resolveSolid(rule.movers, rule.solids);
            } else if (rule.type === 'overlap') {
                this._resolveOverlap(rule.a, rule.b, rule.callback);
            }
        }
    }

    _resolveSolid(moversGroup, solidsGroup) {
        const movers = this._activeInGroup(moversGroup);
        const solids = this._activeInGroup(solidsGroup);
        if (movers.length === 0 || solids.length === 0) return;

        for (let i = 0; i < movers.length; i++) {
            const mover = movers[i];
            if (typeof mover.resolvePlatformCollision !== 'function') continue;
            for (let j = 0; j < solids.length; j++) {
                mover.resolvePlatformCollision(solids[j]);
            }
        }
    }

    _resolveOverlap(groupA, groupB, callback) {
        const listA = this._activeInGroup(groupA);
        const listB = this._activeInGroup(groupB);
        if (listA.length === 0 || listB.length === 0) return;

        const engine = this.engine;
        for (let i = 0; i < listA.length; i++) {
            const a = listA[i];
            for (let j = 0; j < listB.length; j++) {
                const b = listB[j];
                if (a === b) continue;
                const hit = a.collidesWith
                    ? a.collidesWith(b)
                    : engine.checkCollision(a, b);
                if (hit) callback(a, b, engine);
            }
        }
    }
}
