import { BeeEntity } from '../core/BeeEntity.js';
export class BeeButton extends BeeEntity {
    static listen(canvas) {
        function updateMousePosition(event) {
            const rect = canvas.getBoundingClientRect();

            BeeButton.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
            BeeButton.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
        }

        canvas.addEventListener("mousemove", event => {
            updateMousePosition(event);
        });

        canvas.addEventListener("mousedown", event => {
            updateMousePosition(event);
            BeeButton.mouse.down = true;
            BeeButton.mouse.pressed = true;
        });

        canvas.addEventListener("mouseup", event => {
            updateMousePosition(event);
            BeeButton.mouse.down = false;
            BeeButton.mouse.released = true;
        });
    }

    static endFrame() {
        BeeButton.mouse.pressed = false;
        BeeButton.mouse.released = false;
    }

    constructor({
        x = 0,
        y = 0,
        width = 160,
        height = 50,
        text = "Button",
        font = "20px Arial",
        background = "#333",
        hoverBackground = "#555",
        pressedBackground = "#222",
        color = "white",
        onClick = null
    } = {}) {
        super(x, y, width, height);

        this.text = text;
        this.font = font;
        this.background = background;
        this.hoverBackground = hoverBackground;
        this.pressedBackground = pressedBackground;
        this.color = color;
        this.onClick = onClick;

        this.hover = false;
        this.down = false;

        this.addRectCollider();
    }

    update(dt, scene) {
        const mouse = BeeButton.mouse;

        this.hover = this.collider.containsPoint(mouse.x, mouse.y);

        if (this.hover && mouse.pressed) {
            this.down = true;
        }

        if (this.down && mouse.released) {
            if (this.hover && this.onClick) {
                this.onClick(this, scene);
            }

            this.down = false;
        }

        super.update(dt, scene);
    }

    draw(ctx) {
        if (!this.visible) return;

        let bg = this.background;

        if (this.down) {
            bg = this.pressedBackground;
        } else if (this.hover) {
            bg = this.hoverBackground;
        }

        ctx.save();

        ctx.fillStyle = bg;
        ctx.fillRect(this.worldX, this.worldY, this.width, this.height);

        ctx.strokeStyle = "white";
        ctx.strokeRect(this.worldX, this.worldY, this.width, this.height);

        ctx.font = this.font;
        ctx.fillStyle = this.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
            this.text,
            this.worldX + this.width / 2,
            this.worldY + this.height / 2
        );

        ctx.restore();
    }
}

BeeButton.mouse = {
    x: 0,
    y: 0,
    down: false,
    pressed: false,
    released: false
};

/** 🌟 * Classe BeeButton: Rappresenta un pulsante interattivo su schermo (eredita/usa BeeEntity).
 * Gestisce l'area cliccabile, gli stati visivi (normale, hover, premuto) e 
 * scatena l'evento onClick per permettere l'interazione nei menu o nella UI.
 */
