import { BeeRectCollider } from '../physics/BeeRectCollider.js';

/**
 * Parametri cinematici di default. Niente magic number sparsi nel solver:
 * ogni entità può sovrascriverli in costruzione o a runtime.
 */
export const BEE_ENTITY_DEFAULTS = Object.freeze({
    width: 32,
    height: 32,
    gravity: 0,
    friction: 0,
    airFriction: 0,
    landingTolerance: 10,
    velocityLookahead: 0.1,
    maxFallSpeed: Infinity
});

function readWorldX(node) {
    if (!node) return 0;
    return typeof node.worldX === 'number' ? node.worldX : Number(node.x) || 0;
}

function readWorldY(node) {
    if (!node) return 0;
    return typeof node.worldY === 'number' ? node.worldY : Number(node.y) || 0;
}

/**
 * BeeEntity — nodo di scene graph.
 *
 * Responsabilità unica: dati di trasformata, gerarchia, ciclo di vita e
 * cinematica (velocità → posizione locale). Non disegna. Il rendering sta
 * sulle sottoclassi e la traversata sul motore. Le collisioni leggono l'AABB
 * mondo; il solver scrive di nuovo in coordinate locali.
 *
 * `x` / `y` sono SEMPRE locali al parent. `worldX` / `worldY` sono cache
 * lazy: si ricalcolano solo alla lettura, dopo che la catena è dirty.
 */
export class BeeEntity {
    static worldXOf(node) {
        return readWorldX(node);
    }

    static worldYOf(node) {
        return readWorldY(node);
    }

    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [width]
     * @param {number} [height]
     * @param {Partial<typeof BEE_ENTITY_DEFAULTS>} [physics]
     */
    constructor(
        x = 0,
        y = 0,
        width = BEE_ENTITY_DEFAULTS.width,
        height = BEE_ENTITY_DEFAULTS.height,
        physics = null
    ) {
        const cfg = physics ? { ...BEE_ENTITY_DEFAULTS, ...physics } : BEE_ENTITY_DEFAULTS;

        this.#localX = x;
        this.#localY = y;
        this.width = width;
        this.height = height;

        this.vx = 0;
        this.vy = 0;
        this.gravity = cfg.gravity;
        this.friction = cfg.friction;
        this.airFriction = cfg.airFriction;
        this.landingTolerance = cfg.landingTolerance;
        this.velocityLookahead = cfg.velocityLookahead;
        this.maxFallSpeed = cfg.maxFallSpeed;
        this.isGrounded = false;

        this.active = true;
        this.visible = true;
        this.destroyed = false;
        this.collider = null;
    }

    #localX = 0;
    #localY = 0;
    #parent = null;
    #children = [];
    #worldDirty = true;
    #worldX = 0;
    #worldY = 0;

    get x() {
        return this.#localX;
    }

    set x(value) {
        const next = Number(value) || 0;
        if (next === this.#localX) return;
        this.#localX = next;
        this.#invalidateWorld();
    }

    get y() {
        return this.#localY;
    }

    set y(value) {
        const next = Number(value) || 0;
        if (next === this.#localY) return;
        this.#localY = next;
        this.#invalidateWorld();
    }

    get parent() {
        return this.#parent;
    }

    get children() {
        return this.#children;
    }

    get worldX() {
        this.#syncWorld();
        return this.#worldX;
    }

    set worldX(value) {
        const parent = this.#parent;
        this.x = parent ? value - parent.worldX : value;
    }

    get worldY() {
        this.#syncWorld();
        return this.#worldY;
    }

    set worldY(value) {
        const parent = this.#parent;
        this.y = parent ? value - parent.worldY : value;
    }

    getWorldAABB() {
        return {
            x: this.worldX,
            y: this.worldY,
            width: this.width,
            height: this.height
        };
    }

    #invalidateWorld() {
        if (this.#worldDirty) return;
        this.#worldDirty = true;
        const kids = this.#children;
        for (let i = 0; i < kids.length; i++) {
            kids[i].#invalidateWorld();
        }
    }

    #syncWorld() {
        if (!this.#worldDirty) return;

        const parent = this.#parent;
        if (parent) {
            parent.#syncWorld();
            this.#worldX = parent.#worldX + this.#localX;
            this.#worldY = parent.#worldY + this.#localY;
        } else {
            this.#worldX = this.#localX;
            this.#worldY = this.#localY;
        }

        this.#worldDirty = false;
    }

    #hasAncestor(node) {
        let current = this.#parent;
        while (current) {
            if (current === node) return true;
            current = current.#parent;
        }
        return false;
    }

    addRectCollider(offsetX = 0, offsetY = 0, width = null, height = null) {
        this.collider = new BeeRectCollider(
            this,
            offsetX,
            offsetY,
            width != null ? width : this.width,
            height != null ? height : this.height
        );
        return this.collider;
    }

    /**
     * Aggancia `entity` come figlio. Le sue x/y restano locali a questo nodo.
     * Se aveva già un parent, viene staccata prima (niente doppi riferimenti).
     */
    addChild(entity) {
        if (!entity || entity === this || entity.destroyed) return entity;
        if (this.#hasAncestor(entity)) return entity;
        if (entity.#parent === this) return entity;

        if (entity.#parent) {
            entity.#parent.removeChild(entity);
        }

        this.#children.push(entity);
        entity.#parent = this;
        entity.#invalidateWorld();
        return entity;
    }

    removeChild(entity) {
        if (!entity) return;
        const index = this.#children.indexOf(entity);
        if (index < 0) return;

        this.#children.splice(index, 1);
        if (entity.#parent === this) {
            entity.#parent = null;
            entity.#invalidateWorld();
        }
    }

    /**
     * Stacca dal parent senza distruggere. Rompe il ciclo parent↔child.
     */
    detach() {
        if (this.#parent) {
            this.#parent.removeChild(this);
        }
        return this;
    }

    collidesWith(other) {
        if (!other || other === this) return false;

        const ax = this.worldX;
        const ay = this.worldY;
        const bx = readWorldX(other);
        const by = readWorldY(other);

        return (
            ax < bx + other.width &&
            ax + this.width > bx &&
            ay < by + other.height &&
            ay + this.height > by
        );
    }

    /**
     * Risolve un contatto solido in spazio mondo, poi riscrive la posizione
     * locale. Tolleranza di atterraggio e lookahead sulla vy sono configurabili.
     */
    resolvePlatformCollision(platform) {
        if (!this.collidesWith(platform)) return false;

        const x = this.worldX;
        const y = this.worldY;
        const px = readWorldX(platform);
        const py = readWorldY(platform);
        const pw = platform.width;
        const ph = platform.height;

        const overlapX = Math.min(x + this.width - px, px + pw - x);
        const overlapY = Math.min(y + this.height - py, py + ph - y);

        if (overlapY < overlapX) {
            const lookahead = this.vy * this.velocityLookahead;
            const landingBand = py + this.landingTolerance;
            if (this.vy >= 0 && y + this.height - lookahead <= landingBand) {
                this.worldY = py - this.height;
                this.vy = 0;
                this.isGrounded = true;
                return true;
            }
            if (this.vy < 0) {
                this.worldY = py + ph;
                this.vy = 0;
            }
        } else if (this.vx > 0) {
            this.worldX = px - this.width;
        } else if (this.vx < 0) {
            this.worldX = px + pw;
        }

        return false;
    }

    /**
     * Integra la cinematica sulla posizione LOCALE. Non risolve collisioni
     * e non tocca il canvas: è un aggiornamento di dati.
     */
    integrate(dt) {
        if (!this.active || this.destroyed || dt <= 0) return;

        if (this.gravity !== 0 && !this.isGrounded) {
            this.vy += this.gravity * dt;
            if (Number.isFinite(this.maxFallSpeed) && this.vy > this.maxFallSpeed) {
                this.vy = this.maxFallSpeed;
            }
        }

        const drag = this.isGrounded ? this.friction : this.airFriction;
        if (drag > 0) {
            this.vx *= Math.max(0, 1 - drag * dt);
        }

        if (this.vx !== 0 || this.vy !== 0) {
            this.#localX += this.vx * dt;
            this.#localY += this.vy * dt;
            this.#invalidateWorld();
        }

        this.isGrounded = false;
    }

    /**
     * Tick del grafo: cinematica di questo nodo, poi i figli attivi.
     * I figli destroyed vengono scollegati qui, senza allocare un nuovo array.
     */
    update(dt, input, engine) {
        if (this.destroyed || !this.active) return;

        this.integrate(dt);

        const kids = this.#children;
        for (let i = 0; i < kids.length; ) {
            const child = kids[i];
            if (child.destroyed) {
                this.removeChild(child);
                continue;
            }
            if (child.active && typeof child.update === 'function') {
                child.update(dt, input, engine);
            }
            if (child.destroyed) {
                this.removeChild(child);
                continue;
            }
            i++;
        }
    }

    /**
     * Hook vuoto: BeeEntity non renderizza. Le sottoclassi disegnano in
     * worldX/worldY. BeeEngine attraversa i children.
     */
    draw(_ctx, _engine) {
        // intenzionalmente vuoto — single responsibility
    }

    destroy() {
        if (this.destroyed) return;

        this.destroyed = true;
        this.active = false;
        this.visible = false;

        this.detach();

        const kids = this.#children;
        this.#children = [];
        for (let i = 0; i < kids.length; i++) {
            const child = kids[i];
            child.#parent = null;
            child.destroy();
        }

        if (this.collider && this.collider.entity === this) {
            this.collider.entity = null;
        }
    }
}
