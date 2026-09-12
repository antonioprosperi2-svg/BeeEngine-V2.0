import { BeeTime } from '../src/core/BeeTime.js';
import { BeeTimer, BeeTimerClock } from '../src/core/BeeTimer.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const idle = new BeeTimer(1);
idle.update(1);
assert(idle.elapsed === 0 && !idle.running, 'no autostart');

const once = new BeeTimer(1);
let fires = 0;
once.onComplete = () => { fires += 1; };
once.start();
once.update(1);
assert(once.finished && !once.running && fires === 1, 'one-shot');
once.reset();
once.update(1);
assert(once.elapsed === 0 && !once.running && fires === 1, 'reset does not restart');

once.start();
once.update(0.4);
once.pause();
assert(once.paused && !once.running && once.elapsed > 0, 'pause keeps elapsed');
once.update(10);
assert(once.elapsed < 1 && !once.finished, 'paused ignores step');
once.resume();
once.update(0.7);
assert(once.finished && fires === 2, 'resume continues');

const clock = new BeeTime();
clock.begin(0);
clock.tick(16);
clock.pause();
clock.tick(32);
assert(clock.dt === 0 && clock.unscaledDt > 0, 'paused axes');

const hudNum = new BeeTimer(1, null, true, { unscaled: true });
hudNum.start();
hudNum.update(clock.dt);
assert(hudNum.elapsed === 0, 'number is explicit (dt=0)');

const hudObj = new BeeTimer({ duration: 1, loop: true, unscaled: true, autoStart: true });
hudObj.update(clock);
assert(hudObj.elapsed > 0, 'BeeTime honors unscaled');

let loopFires = 0;
const loop = new BeeTimer({
    duration: 0.1,
    loop: true,
    maxCatchUp: 8,
    onComplete: () => { loopFires += 1; }
});
loop.start();
loop.update(1);
assert(loopFires === 8, 'catch-up cap ' + loopFires);

let throws = 0;
const boom = new BeeTimer(1, () => {
    throws += 1;
    throw new Error('cb');
});
boom.start();
try { boom.update(1); } catch {}
try { boom.update(0.016); } catch {}
assert(throws === 1 && boom.finished && !boom.running, 'throw does not retrigger');

let zeroOk = false;
try {
    new BeeTimer({ duration: 0, loop: true });
} catch {
    zeroOk = true;
}
assert(zeroOk, 'loop duration 0 throws');

const host = new BeeTimerClock();
let hosted = 0;
const pulse = host.create({
    duration: 0.2,
    autoStart: true,
    onComplete: () => { hosted += 1; }
});
const t = new BeeTime();
t.begin(0);
for (let i = 1; i <= 16; i++) {
    t.tick(i * 16);
    host.tick(t);
}
assert(hosted === 1, 'clock ticks one-shot ' + hosted);
assert(host.size === 0, 'finished one-shot leaves clock');
assert(pulse.finished, 'reference still readable');

pulse.cancel();
assert(pulse.cancelled && !pulse.running, 'cancel');

console.log('BeeTimer tests ok');
