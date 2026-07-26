import { BeeEntity } from './BeeEntity.js';
export class BeeParticleSystem extends BeeEntity {
    constructor({
        x = 0,
        y = 0
    } = {}) {
        super({ x, y });

        this.particles = [];
    }

    emit(count = 10, options = {}) {
        const {
            speedMin = 30,
            speedMax = 120,
            lifeMin = 0.3,
            lifeMax = 1,
            sizeMin = 2,
            sizeMax = 6,
            color = "orange"
        } = options;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = speedMin + Math.random() * (speedMax - speedMin);
            const life = lifeMin + Math.random() * (lifeMax - lifeMin);
            const size = sizeMin + Math.random() * (sizeMax - sizeMin);

            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life,
                maxLife: life,
                size,
                color
            });
        }
    }

    update(dt, scene) {
        for (const p of this.particles) {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }

        this.particles = this.particles.filter(p => p.life > 0);

        super.update(dt, scene);
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();

        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        super.draw(ctx);
    }
}
/** 🌟 * Classe BeeParticleSystem: Gestisce gli effetti di particelle nel gioco.
 * Permette di generare, aggiornare e animare centinaia di piccoli elementi visivi
 * contemporaneamente per simulare effetti come esplosioni, fumo, scintille o polvere.
 */
