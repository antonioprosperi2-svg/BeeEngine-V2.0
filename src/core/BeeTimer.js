/**
 * Timer di evento (cooldown, spawn, durata bonus).
 * Di default avanza col tempo di SIMULAZIONE (dt scalato).
 * `useUnscaledTime: true` lo rende immune a pausa e slow-motion (HUD, UI).
 */
export class BeeTimer {
    /**
     * @param {number} duration secondi
     * @param {(() => void)|null} [callback]
     * @param {boolean} [loop=false]
     * @param {{ useUnscaledTime?: boolean }} [options]
     */
    constructor(duration, callback = null, loop = false, options = {}) {
        this.duration = duration;
        this.callback = callback;
        this.loop = loop;
        this.useUnscaledTime = options.useUnscaledTime === true;

        this.time = 0;
        this.running = false;
        this.finished = false;
    }

    start() {
        this.time = 0;
        this.running = true;
        this.finished = false;
        return this;
    }

    stop() {
        this.running = false;
        return this;
    }

    reset() {
        this.time = 0;
        this.finished = false;
        return this;
    }

    get progress() {
        if (this.duration <= 0) return 1;
        return Math.min(1, this.time / this.duration);
    }

    /**
     * @param {number|{ dt?: number, unscaledDt?: number }} dtOrTime
     * @param {{ dt?: number, unscaledDt?: number }|null} [time]
     */
    update(dtOrTime, time = null) {
        if (!this.running || this.finished) return;

        let clock = time;
        let fallbackDt = 0;

        if (dtOrTime && typeof dtOrTime === 'object') {
            clock = dtOrTime;
        } else {
            fallbackDt = Number(dtOrTime) || 0;
        }

        const step = this.useUnscaledTime
            ? (clock && typeof clock.unscaledDt === 'number' ? clock.unscaledDt : fallbackDt)
            : (clock && typeof clock.dt === 'number' ? clock.dt : fallbackDt);

        this.time += step;

        if (this.time >= this.duration) {
            if (this.callback) {
                this.callback();
            }

            if (this.loop) {
                this.time -= this.duration;
                if (this.time < 0) this.time = 0;
            } else {
                this.finished = true;
                this.running = false;
            }
        }
    }
}
