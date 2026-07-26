export class BeeRectCollider {
    constructor(entity, offsetX = 0, offsetY = 0, width = null, height = null) {
        this.entity = entity;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.width = width != null ? width : entity.width;
        this.height = height != null ? height : entity.height;
    }

    get x() {
        return this.entity.x + this.offsetX;
    }

    get y() {
        return this.entity.y + this.offsetY;
    }

    intersects(other) {
        return (
            this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y
        );
    }

    containsPoint(px, py) {
        return (
            px >= this.x &&
            px <= this.x + this.width &&
            py >= this.y &&
            py <= this.y + this.height
        );
    }
}
/** 🌟 * Classe BeeRectCollider: Gestisce le collisioni rettangolari nel gioco.
 * Fornisce le funzioni matematiche per determinare quando due hitbox si
 * sovrappongono (es. proiettile-nemico) o quando un punto si trova in un'area.
 */
