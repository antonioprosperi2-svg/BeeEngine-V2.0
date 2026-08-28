import { BeeRectCollider } from '../physics/BeeRectCollider.js';

/**
 * Classe BeeEntity: La classe madre base per tutte le entità del motore.
 * Gestisce posizione (x, y), velocità (vx, vy), gravità facoltativa, collisioni e gerarchia di figli.
 */
export class BeeEntity {
    constructor(x = 0, y = 0, width = 32, height = 32) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.vx = 0;
        this.vy = 0;
        this.gravity = 0; // Se > 0, applica la forza di gravità ad ogni frame
        this.isGrounded = false;

        this.active = true;
        this.visible = true;
        this.destroyed = false;
        this.collider = null;
        this.children = [];
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

    addChild(entity) {
        this.children.push(entity);
        return entity;
    }

    removeChild(entity) {
        this.children = this.children.filter(child => child !== entity);
    }

    /**
     * Controlla se questa entità si sovrappone a un'altra entità (AABB)
     */
    collidesWith(other) {
        if (!other || other === this) return false;
        return (
            this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y
        );
    }

    /**
     * Risolve la collisione solida con una piattaforma o blocco di terreno.
     * Se l'entità cade da sopra, la fa atterrare in modo solido.
     */
    resolvePlatformCollision(platform) {
        if (!this.collidesWith(platform)) return false;

        // Calcola le sovrapposizioni sui 4 lati
        const overlapX = Math.min(this.x + this.width - platform.x, platform.x + platform.width - this.x);
        const overlapY = Math.min(this.y + this.height - platform.y, platform.y + platform.height - this.y);

        if (overlapY < overlapX) {
            // Collisione Verticale (Atterraggio o impatto da sotto)
            if (this.vy >= 0 && this.y + this.height - this.vy * 0.1 <= platform.y + 10) {
                this.y = platform.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
                return true;
            } else if (this.vy < 0) {
                this.y = platform.y + platform.height;
                this.vy = 0;
            }
        } else {
            // Collisione Orizzontale (Muro)
            if (this.vx > 0) {
                this.x = platform.x - this.width;
            } else if (this.vx < 0) {
                this.x = platform.x + platform.width;
            }
        }
        return false;
    }

    update(dt, input, engine) {
        // Applica gravità se presente
        if (this.gravity > 0 && !this.isGrounded) {
            this.vy += this.gravity * dt;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Reset dello stato di atterraggio (verrà riconfermato dalle piattaforme)
        this.isGrounded = false;

        for (const child of this.children) {
            if (child.active && child.update) {
                child.update(dt, input, engine);
            }
        }
    }

    draw(ctx, engine) {
        for (const child of this.children) {
            if (!child.visible || !child.draw) continue;
            if (engine && typeof engine.drawEntity === 'function') {
                engine.drawEntity(ctx, child);
            } else {
                child.draw(ctx, engine);
            }
        }
    }

    destroy() {
        this.active = false;
        this.visible = false;
        this.destroyed = true;
    }
}