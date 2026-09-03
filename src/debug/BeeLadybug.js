/**
 * BeeLadybug — debug visivo e monitoraggio del motore.
 *
 * Overlay in spazio schermo (dopo la camera) + hitbox AABB in spazio mondo.
 * F2 apre/chiude. F3 slow-motion. F4 freeze del frame (pausa simulazione).
 * Non usa F12 né la tilde: sui layout italiani la tilde non è un tasto unico.
 */
export const BEE_LADYBUG_DEFAULTS = Object.freeze({
    toggleKey: 'F2',
    slowKey: 'F3',
    freezeKey: 'F4',
    slowScale: 0.25,
    colorActive: '#3dff6a',
    colorColliding: '#ff3b3b',
    colorInactive: '#8a8a8a',
    overlayX: 12,
    overlayY: 12
});

export class BeeLadybug {
    /**
     * @param {object} engine istanza BeeEngine
     * @param {Partial<typeof BEE_LADYBUG_DEFAULTS>} [options]
     */
    constructor(engine, options = {}) {
        this.engine = engine;
        this.configure(options);

        this.enabled = false;
        this.#entities = [];
        this.#colliding = new Set();
        this.#buttons = [];
        this.#onKeyDown = (event) => this.#handleKey(event);
        this.#bound = false;
    }

    #entities;
    #colliding;
    #buttons;
    #onKeyDown;
    #bound;

    configure(options = {}) {
        const cfg = { ...BEE_LADYBUG_DEFAULTS, ...options };
        this.toggleKey = cfg.toggleKey;
        this.slowKey = cfg.slowKey;
        this.freezeKey = cfg.freezeKey;
        this.slowScale = cfg.slowScale;
        this.colorActive = cfg.colorActive;
        this.colorColliding = cfg.colorColliding;
        this.colorInactive = cfg.colorInactive;
        this.overlayX = cfg.overlayX;
        this.overlayY = cfg.overlayY;
        return this;
    }

    attach() {
        if (this.#bound) return this;
        window.addEventListener('keydown', this.#onKeyDown);
        this.#bound = true;
        return this;
    }

    detach() {
        if (!this.#bound) return this;
        window.removeEventListener('keydown', this.#onKeyDown);
        this.#bound = false;
        return this;
    }

    destroy() {
        this.detach();
        this.enabled = false;
        this.#entities.length = 0;
        this.#colliding.clear();
        this.#buttons.length = 0;
    }

    show() {
        this.enabled = true;
        return this;
    }

    hide() {
        this.enabled = false;
        return this;
    }

    toggle() {
        this.enabled = !this.enabled;
        return this;
    }

    applySlowMo() {
        const time = this.engine.time;
        if (!time) return this;
        if (time.paused) time.resume();
        const next = time.timeScale === this.slowScale ? 1 : this.slowScale;
        this.engine.setTimeScale(next);
        return this;
    }

    toggleFreeze() {
        const time = this.engine.time;
        if (!time) return this;
        time.togglePause();
        return this;
    }

    restoreRealtime() {
        const time = this.engine.time;
        if (!time) return this;
        if (time.paused) time.resume();
        this.engine.setTimeScale(1);
        return this;
    }

    #handleKey(event) {
        if (event.repeat) return;

        if (event.code === this.toggleKey) {
            event.preventDefault();
            this.toggle();
            return;
        }

        if (!this.enabled) return;

        if (event.code === this.slowKey) {
            event.preventDefault();
            this.applySlowMo();
            return;
        }

        if (event.code === this.freezeKey) {
            event.preventDefault();
            this.toggleFreeze();
        }
    }

    #collectEntities() {
        const list = this.#entities;
        list.length = 0;
        const seen = new Set();

        const visit = (entity) => {
            if (!entity || entity.destroyed || seen.has(entity)) return;
            seen.add(entity);
            list.push(entity);
            const kids = entity.children;
            if (!kids) return;
            for (let i = 0; i < kids.length; i++) {
                visit(kids[i]);
            }
        };

        const engine = this.engine;
        const roots = engine.entities;
        if (roots) {
            for (let i = 0; i < roots.length; i++) visit(roots[i]);
        }

        const scene = engine.scenes && engine.scenes.currentScene
            ? engine.scenes.currentScene
            : engine.currentScene;
        if (scene && scene.entities) {
            for (let i = 0; i < scene.entities.length; i++) visit(scene.entities[i]);
        }

        const groups = engine.collisions && engine.collisions.groups;
        if (groups && typeof groups.values === 'function') {
            for (const bucket of groups.values()) {
                if (!bucket) continue;
                for (let i = 0; i < bucket.length; i++) visit(bucket[i]);
            }
        }

        return list;
    }

    #aabbOf(entity) {
        const engine = this.engine;
        if (engine && typeof engine.getEntityDrawBounds === 'function') {
            return engine.getEntityDrawBounds(entity);
        }
        if (!entity) return null;
        return {
            x: typeof entity.worldX === 'number' ? entity.worldX : entity.x,
            y: typeof entity.worldY === 'number' ? entity.worldY : entity.y,
            width: entity.width ?? 0,
            height: entity.height ?? 0
        };
    }

    #refreshCollisions(list) {
        const colliding = this.#colliding;
        colliding.clear();

        const boxes = [];
        for (let i = 0; i < list.length; i++) {
            const bounds = this.#aabbOf(list[i]);
            if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
                boxes.push(null);
                continue;
            }
            boxes.push(bounds);
        }

        for (let i = 0; i < list.length; i++) {
            const a = boxes[i];
            if (!a) continue;
            for (let j = i + 1; j < list.length; j++) {
                const b = boxes[j];
                if (!b) continue;
                if (
                    a.x < b.x + b.width &&
                    a.x + a.width > b.x &&
                    a.y < b.y + b.height &&
                    a.y + a.height > b.y
                ) {
                    colliding.add(list[i]);
                    colliding.add(list[j]);
                }
            }
        }
    }

    /**
     * Hitbox in spazio mondo: chiamare PRIMA di ctx.restore() (dentro la camera).
     */
    drawWorld(ctx) {
        if (!this.enabled) return;

        const list = this.#collectEntities();
        this.#refreshCollisions(list);

        ctx.save();
        ctx.lineWidth = 1.5;

        for (let i = 0; i < list.length; i++) {
            const entity = list[i];
            const box = this.#aabbOf(entity);
            if (!box || box.width <= 0 || box.height <= 0) continue;

            const colliding = this.#colliding.has(entity);
            const active = entity.active !== false;
            const color = colliding
                ? this.colorColliding
                : (active ? this.colorActive : this.colorInactive);

            ctx.strokeStyle = color;
            ctx.fillStyle = colliding ? 'rgba(255, 59, 59, 0.16)' : 'rgba(61, 255, 106, 0.08)';
            ctx.fillRect(box.x, box.y, box.width, box.height);
            ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.width, box.height);
        }

        ctx.restore();
    }

    /**
     * Pannello HUD in spazio schermo: chiamare DOPO ctx.restore().
     */
    drawOverlay(ctx) {
        if (!this.enabled) return;

        const engine = this.engine;
        const time = engine.time;
        const list = this.#entities;
        let activeCount = 0;
        for (let i = 0; i < list.length; i++) {
            if (list[i].active !== false) activeCount += 1;
        }

        const fps = time ? time.fps : 0;
        const cycleMs = time ? time.unscaledDt * 1000 : 0;
        const scale = time ? time.timeScale : 1;
        const frozen = time ? time.paused : false;

        const x = this.overlayX;
        const y = this.overlayY;
        const width = 268;
        const height = 168;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.fillStyle = 'rgba(10, 12, 18, 0.82)';
        ctx.strokeStyle = '#ff4d4d';
        ctx.lineWidth = 2;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(x, y, width, height, 8);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);
        }

        ctx.fillStyle = '#ff4d4d';
        ctx.beginPath();
        ctx.arc(x + 22, y + 22, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x + 19, y + 20, 2, 0, Math.PI * 2);
        ctx.arc(x + 25, y + 20, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffe08a';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('BeeLadybug', x + 38, y + 14);

        ctx.fillStyle = '#d8d8d8';
        ctx.font = '12px monospace';
        const lines = [
            `FPS      ${fps.toFixed(0)}`,
            `ENTITA   ${activeCount} attive / ${list.length} in memoria`,
            `CICLO    ${cycleMs.toFixed(2)} ms`,
            `SCALE    ${scale.toFixed(2)}x   SIM ${frozen ? 'FREEZE' : 'RUN'}`
        ];
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x + 14, y + 42 + i * 16);
        }

        this.#buttons = [
            { id: 'slow', label: 'F3 SLOW', x: x + 12, y: y + 114, w: 78, h: 22 },
            { id: 'freeze', label: 'F4 STOP', x: x + 96, y: y + 114, w: 78, h: 22 },
            { id: 'live', label: '1x LIVE', x: x + 180, y: y + 114, w: 74, h: 22 }
        ];

        for (let i = 0; i < this.#buttons.length; i++) {
            const btn = this.#buttons[i];
            const hot = (btn.id === 'slow' && scale !== 1 && !frozen)
                || (btn.id === 'freeze' && frozen)
                || (btn.id === 'live' && scale === 1 && !frozen);
            ctx.fillStyle = hot ? '#ff4d4d' : '#2a2f3a';
            ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            ctx.strokeStyle = '#ffe08a';
            ctx.strokeRect(btn.x + 0.5, btn.y + 0.5, btn.w, btn.h);
            ctx.fillStyle = '#fff6d8';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#9aa0aa';
        ctx.font = '10px monospace';
        ctx.fillText('F2 mostra/nasconde   verde=ok  rosso=collide', x + 12, y + 146);

        ctx.restore();
    }

    /**
     * Click sui pulsanti dell'overlay. Chiamare prima di input.endFrame().
     */
    poll() {
        if (!this.enabled) return;

        const input = this.engine.input;
        if (!input || !input.mouse || !input.mouse.wasPressed) return;

        const mx = input.mouse.x;
        const my = input.mouse.y;
        for (let i = 0; i < this.#buttons.length; i++) {
            const btn = this.#buttons[i];
            if (mx < btn.x || mx > btn.x + btn.w || my < btn.y || my > btn.y + btn.h) continue;
            if (btn.id === 'slow') this.applySlowMo();
            else if (btn.id === 'freeze') this.toggleFreeze();
            else if (btn.id === 'live') this.restoreRealtime();
            break;
        }
    }
}
