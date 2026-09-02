export class BeeRectCollider {
    /**
     * Supports both entity-attached colliders: new BeeRectCollider(entity, offsetX, offsetY, width, height)
     * and standalone static colliders: new BeeRectCollider(x, y, width, height)
     */
    constructor(entityOrX = 0, offsetYOrY = 0, widthOrW = 0, heightOrH = 0, height = null) {
        if (typeof entityOrX === 'object' && entityOrX !== null) {
            this.entity = entityOrX;
            this.offsetX = offsetYOrY;
            this.offsetY = widthOrW;
            this.width = heightOrH != null ? heightOrH : (entityOrX.width || 0);
            this.height = height != null ? height : (entityOrX.height || 0);
            this._staticX = 0;
            this._staticY = 0;
        } else {
            this.entity = null;
            this.offsetX = 0;
            this.offsetY = 0;
            this._staticX = Number(entityOrX) || 0;
            this._staticY = Number(offsetYOrY) || 0;
            this.width = Number(widthOrW) || 0;
            this.height = Number(heightOrH) || 0;
        }
    }

    get x() {
        if (!this.entity) return this._staticX;
        const origin = typeof this.entity.worldX === 'number' ? this.entity.worldX : this.entity.x;
        return origin + this.offsetX;
    }

    get y() {
        if (!this.entity) return this._staticY;
        const origin = typeof this.entity.worldY === 'number' ? this.entity.worldY : this.entity.y;
        return origin + this.offsetY;
    }

    intersects(other) {
        if (!other) return false;
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
