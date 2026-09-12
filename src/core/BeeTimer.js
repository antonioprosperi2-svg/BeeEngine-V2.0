/**
 * BeeTimer — cooldown / loop di evento sul clock di BeeTime.
 * Il motore ticka `gioco.timers` ogni frame, anche in pausa:
 * i timer scalati si fermano, quelli unscaled no.
 */

export const BEE_TIMER_DEFAULTS = Object.freeze({
    duration: 1,
    loop: false,
    unscaled: false,
    autoStart: false,
    maxCatchUp: 8
});

function isSpec(value) {
    return value !== null && typeof value === 'object' && typeof value !== 'function';
}

function resolveStep(timer, dtOrTime) {
    if (dtOrTime && typeof dtOrTime.delta === 'function') {
        return dtOrTime.delta(timer.unscaled);
    }
    if (dtOrTime && typeof dtOrTime === 'object') {
        if (timer.unscaled) {
            return typeof dtOrTime.unscaledDt === 'number' ? dtOrTime.unscaledDt : 0;
        }
        return typeof dtOrTime.dt === 'number' ? dtOrTime.dt : 0;
    }
    return Number(dtOrTime) || 0;
}

export class BeeTimer {
    /**
     * @param {number|{
     *   duration?: number,
     *   onComplete?: ((timer: BeeTimer) => void)|null,
     *   callback?: ((timer: BeeTimer) => void)|null,
     *   loop?: boolean,
     *   unscaled?: boolean,
     *   useUnscaledTime?: boolean,
     *   autoStart?: boolean,
     *   maxCatchUp?: number,
     *   clock?: BeeTimerClock|null
     * }} durationOrOptions
     * @param {((timer: BeeTimer) => void)|null} [onComplete]
     * @param {boolean} [loop=false]
     * @param {{ unscaled?: boolean, useUnscaledTime?: boolean, autoStart?: boolean, maxCatchUp?: number, clock?: BeeTimerClock|null }} [options]
     */
    constructor(durationOrOptions = BEE_TIMER_DEFAULTS.duration, onComplete = null, loop = false, options = {}) {
        const spec = isSpec(durationOrOptions)
            ? durationOrOptions
            : {
                duration: durationOrOptions,
                onComplete,
                loop,
                ...options
            };

        this.duration = Number(spec.duration);
        if (!Number.isFinite(this.duration)) this.duration = 0;

        this.loop = spec.loop === true;
        this.unscaled = spec.unscaled === true || spec.useUnscaledTime === true;
        this.useUnscaledTime = this.unscaled;
        this.onComplete = typeof spec.onComplete === 'function'
            ? spec.onComplete
            : (typeof spec.callback === 'function' ? spec.callback : null);
        this.callback = this.onComplete;
        this.maxCatchUp = Number.isFinite(Number(spec.maxCatchUp))
            ? Math.max(1, Math.floor(Number(spec.maxCatchUp)))
            : BEE_TIMER_DEFAULTS.maxCatchUp;

        if (this.loop && this.duration <= 0) {
            throw new Error('BeeTimer: loop richiede duration > 0');
        }

        this.elapsed = 0;
        this.running = false;
        this.finished = false;
        this.cancelled = false;
        this.clock = spec.clock instanceof BeeTimerClock ? spec.clock : null;
        this.#paused = false;

        if (this.clock) this.clock.add(this);
        if (spec.autoStart === true) this.start();
    }

    #paused;

    get paused() {
        return this.#paused;
    }

    get remaining() {
        return Math.max(0, this.duration - this.elapsed);
    }

    get progress() {
        if (this.duration <= 0) return 1;
        return Math.min(1, this.elapsed / this.duration);
    }

    /** @deprecated usa elapsed */
    get time() {
        return this.elapsed;
    }

    set time(value) {
        this.elapsed = Number(value) || 0;
    }

    start() {
        if (this.loop && this.duration <= 0) {
            throw new Error('BeeTimer: loop richiede duration > 0');
        }

        this.elapsed = 0;
        this.finished = false;
        this.cancelled = false;
        this.#paused = false;
        this.running = true;
        if (this.clock) this.clock.add(this);
        return this;
    }

    pause() {
        if (!this.running) return this;
        this.running = false;
        this.#paused = true;
        return this;
    }

    resume() {
        if (this.finished || this.cancelled) return this;
        this.running = true;
        this.#paused = false;
        if (this.clock) this.clock.add(this);
        return this;
    }

    /** Alias di pause: ferma senza azzerare. */
    stop() {
        return this.pause();
    }

    reset() {
        this.elapsed = 0;
        this.finished = false;
        this.cancelled = false;
        return this;
    }

    cancel() {
        this.running = false;
        this.#paused = false;
        this.finished = false;
        this.cancelled = true;
        this.elapsed = 0;
        if (this.clock) this.clock.remove(this);
        return this;
    }

    /**
     * @param {import('./BeeTime.js').BeeTime|number|{ dt?: number, unscaledDt?: number }} dtOrTime
     * BeeTime usa `unscaled`. Un numero è uno step esplicito (niente flag magico).
     */
    update(dtOrTime) {
        if (!this.running || this.finished || this.cancelled) return this;

        this.elapsed += resolveStep(this, dtOrTime);

        if (this.loop) {
            if (this.duration <= 0) return this;
            let fires = 0;
            while (this.elapsed >= this.duration && fires < this.maxCatchUp) {
                this.elapsed -= this.duration;
                fires += 1;
                this.#fire();
                if (!this.running || this.cancelled) return this;
            }
            if (this.elapsed >= this.duration) {
                this.elapsed %= this.duration;
            }
            return this;
        }

        if (this.elapsed >= this.duration) {
            this.finished = true;
            this.running = false;
            this.#paused = false;
            this.#fire();
        }

        return this;
    }

    #fire() {
        const fn = this.onComplete || this.callback;
        if (typeof fn === 'function') fn(this);
    }
}

export class BeeTimerClock {
    constructor() {
        this.#live = [];
    }

    #live;

    get size() {
        return this.#live.length;
    }

    add(timer) {
        if (!(timer instanceof BeeTimer)) return timer;
        timer.clock = this;
        if (this.#live.indexOf(timer) < 0) {
            this.#live.push(timer);
        }
        return timer;
    }

    create(options = {}) {
        return new BeeTimer({ ...options, clock: this });
    }

    remove(timer) {
        const index = this.#live.indexOf(timer);
        if (index >= 0) this.#live.splice(index, 1);
        if (timer && timer.clock === this) timer.clock = null;
        return this;
    }

    tick(time) {
        const list = this.#live;
        let write = 0;
        for (let i = 0; i < list.length; i++) {
            const timer = list[i];
            if (!timer || timer.cancelled) continue;
            timer.update(time);
            if (timer.cancelled || (timer.finished && !timer.loop)) continue;
            list[write] = timer;
            write += 1;
        }
        list.length = write;
        return this;
    }

    clear() {
        const live = this.#live.slice();
        this.#live.length = 0;
        for (let i = 0; i < live.length; i++) {
            const timer = live[i];
            if (!timer) continue;
            timer.clock = null;
            timer.cancel();
        }
        return this;
    }
}
