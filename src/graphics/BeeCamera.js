export class BeeCamera {
    constructor(canvasWidth, canvasHeight) {
        this.x = 0;
        this.y = 0;
        this.w = canvasWidth;
        this.h = canvasHeight;

        this.bounds = null;
    }

    setBounds(x, y, width, height) {
        this.bounds = { x, y, width, height };
    }

    follow(target, smooth = 0.1) {
        const originX = typeof target.worldX === 'number' ? target.worldX : target.x;
        const originY = typeof target.worldY === 'number' ? target.worldY : target.y;
        let targetX = originX + target.width / 2 - this.w / 2;
        let targetY = originY + target.height / 2 - this.h / 2;

        this.x += (targetX - this.x) * smooth;
        this.y += (targetY - this.y) * smooth;

        if (this.bounds) {
            this.x = Math.max(this.bounds.x, Math.min(this.x, this.bounds.x + this.bounds.width - this.w));
            this.y = Math.max(this.bounds.y, Math.min(this.y, this.bounds.y + this.bounds.height - this.h));
        }
    }

    apply(ctx) {
        ctx.translate(-Math.round(this.x), -Math.round(this.y));
    }

    /**
     * Rettangolo visibile in coordinate mondo (tiene conto dello scroll x/y).
     */
    getViewBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.w,
            height: this.h
        };
    }

    /**
     * Frustum culling: true se il rettangolo mondo interseca l'area inquadrata dalla telecamera.
     */
    isRectVisible(x, y, width, height) {
        if (width <= 0 || height <= 0) return false;
        return (
            x < this.x + this.w &&
            x + width > this.x &&
            y < this.y + this.h &&
            y + height > this.y
        );
    }
}
/** 🌟 * Classe BeeCamera: Gestisce l'inquadratura visiva e lo scorrimento del gioco.
 * Segue fluidamente un oggetto bersaglio (di solito il Player) per mostrare 
 * la porzione corretta del mondo di gioco quando la mappa è più grande dello schermo.
 */
