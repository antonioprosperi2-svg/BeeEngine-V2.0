import { BeeEntity } from '../core/BeeEntity.js';
import { BeePool } from '../core/BeePool.js';

function createParticle() {
    return {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: 'orange'
    };
}

/**
 * BeeParticleSystem — burst di particelle con pool, niente new/filter per frame.
 */
export class BeeParticleSystem extends BeeEntity {
    constructor({
        x = 0,
        y = 0,
        initial = 64,
        max = 512
    } = {}) {
        super(x, y);

        this.particles = [];
        this.particlePool = new BeePool({
            create: createParticle,
            reset(particle, spec = {}) {
                particle.x = spec.x ?? 0;
                particle.y = spec.y ?? 0;
                particle.vx = spec.vx ?? 0;
                particle.vy = spec.vy ?? 0;
                particle.life = spec.life ?? 1;
                particle.maxLife = spec.maxLife ?? particle.life;
                particle.size = spec.size ?? 2;
                particle.color = spec.color ?? 'orange';
            },
            initial,
            max,
            reclaim: false
        });
    }

    emit(count = 10, options = {}) {
        const {
            speedMin = 30,
            speedMax = 120,
            lifeMin = 0.3,
            lifeMax = 1,
            sizeMin = 2,
            sizeMax = 6,
            color = 'orange'
        } = options;

        const originX = this.worldX;
        const originY = this.worldY;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = speedMin + Math.random() * (speedMax - speedMin);
            const life = lifeMin + Math.random() * (lifeMax - lifeMin);
            const size = sizeMin + Math.random() * (sizeMax - sizeMin);
            const particle = this.particlePool.acquire({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life,
                maxLife: life,
                size,
                color
            });
            if (particle) this.particles.push(particle);
        }
    }

    update(dt, input, engine) {
        const list = this.particles;
        let write = 0;
        for (let i = 0; i < list.length; i++) {
            const particle = list[i];
            particle.life -= dt;
            if (particle.life <= 0) {
                this.particlePool.release(particle);
                continue;
            }
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            list[write] = particle;
            write += 1;
        }
        list.length = write;

        super.update(dt, input, engine);
    }

    dispose() {
        this.particlePool.clear();
        super.dispose();
    }

    destroy() {
        this.particlePool.clear();
        super.destroy();
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();

        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            ctx.globalAlpha = particle.life / particle.maxLife;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
