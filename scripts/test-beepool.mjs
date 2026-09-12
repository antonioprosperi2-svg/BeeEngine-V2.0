import { BeePool } from '../src/core/BeePool.js';
import { BeeBullet } from '../src/physics/BeeBullet.js';
import { BeeParticleSystem } from '../src/graphics/BeeParticleSystem.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const pool = new BeePool({
    create: () => new BeeBullet(),
    reset: (bullet, x, y, vx, vy) => bullet.reset(x, y, vx, vy, 10, 10),
    initial: 4,
    max: 4
});

assert(pool.size === 4 && pool.available === 4 && pool.inUse === 0, 'prewarm');

const first = pool.acquire(10, 20, 1, 2);
assert(first instanceof BeeBullet, 'acquire bullet');
assert(first.x === 10 && first.y === 20 && first.vx === 1 && first.vy === 2, 'reset args');
assert(first.destroyed === false && first.pool === pool, 'wake');
assert(pool.inUse === 1 && pool.available === 3, 'in use');

first.destroy();
assert(first.destroyed === true, 'release via destroy');
assert(pool.inUse === 0 && pool.available === 4, 'back in pool');
assert(first.pool === pool, 'membership stays');

const live = [];
for (let i = 0; i < 4; i++) {
    live.push(pool.acquire(i, 0, 0, 100));
}
assert(pool.available === 0 && pool.inUse === 4 && pool.size === 4, 'full');

const stolen = pool.acquire(99, 88, 0, 50);
assert(stolen === live[0], 'reclaim oldest');
assert(stolen.x === 99 && stolen.y === 88, 'stolen reset');
assert(pool.size === 4, 'no growth past max');

const tight = new BeePool({
    create: () => ({ n: 0 }),
    reset: (item, n) => { item.n = n; },
    initial: 1,
    max: 1,
    reclaim: false
});
assert(tight.acquire(1).n === 1, 'first ok');
assert(tight.acquire(2) === null, 'no reclaim');

const fx = new BeeParticleSystem({ x: 0, y: 0, initial: 8, max: 8 });
fx.emit(8);
assert(fx.particles.length === 8, 'emit live');
assert(fx.particlePool.inUse === 8 && fx.particlePool.available === 0, 'particle pool full');
fx.emit(4);
assert(fx.particles.length === 8, 'no reclaim overflow');
fx.update(2, null, null);
assert(fx.particles.length === 0, 'compact dead');
assert(fx.particlePool.available === 8 && fx.particlePool.inUse === 0, 'particles released');

console.log('BeePool tests ok');
