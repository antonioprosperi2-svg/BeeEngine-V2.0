/**
 * Orologio di motore: un solo tick per frame, due assi temporali.
 *
 * - unscaled: tempo reale (UI, HUD, fade di pausa, audio mixer).
 * - scaled: tempo di simulazione (fisica, AI, animazioni di gameplay).
 *
 * `timeScale` 0.25 = slow-motion, 1 = normale, 2 = fast-forward.
 * In pausa dt scalato è 0, unscaledDt continua.
 */
export const BEE_TIME_DEFAULTS = Object.freeze({
    maxDelta: 0.05,
    timeScale: 1,
    minTimeScale: 0,
    maxTimeScale: 16,
    fixedDelta: 1 / 60,
    maxFixedSteps: 5,
    fpsSampleWindow: 0.5
});

export class BeeTime {
    /**
     * @param {Partial<typeof BEE_TIME_DEFAULTS>} [options]
     */
    constructor(options = {}) {
        const cfg = { ...BEE_TIME_DEFAULTS, ...options };

        this.maxDelta = cfg.maxDelta;
        this.minTimeScale = cfg.minTimeScale;
        this.maxTimeScale = cfg.maxTimeScale;
        this.fixedDelta = cfg.fixedDelta;
        this.maxFixedSteps = cfg.maxFixedSteps;
        this.fpsSampleWindow = cfg.fpsSampleWindow;

        this.#defaultScale = cfg.timeScale;
        this.#timeScale = cfg.timeScale;
        this.#paused = false;
        this.#lastTimestamp = 0;
        this.#hasTimestamp = false;
        this.#fixedAccumulator = 0;
        this.#fpsAccum = 0;
        this.#fpsFrames = 0;

        this.rawDelta = 0;
        this.unscaledDt = 0;
        this.dt = 0;
        this.elapsed = 0;
        this.unscaledElapsed = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.alpha = 0;
    }

    #defaultScale;
    #timeScale;
    #paused;
    #lastTimestamp;
    #hasTimestamp;
    #fixedAccumulator;
    #fpsAccum;
    #fpsFrames;

    get paused() {
        return this.#paused;
    }

    get timeScale() {
        return this.#timeScale;
    }

    set timeScale(value) {
        this.setScale(value);
    }

    get lastTimestamp() {
        return this.#lastTimestamp;
    }

    set lastTimestamp(value) {
        this.#lastTimestamp = Number(value) || 0;
        this.#hasTimestamp = true;
    }

    get scaledDt() {
        return this.dt;
    }

    get realDt() {
        return this.unscaledDt;
    }

    /**
     * Delta da usare in un sistema. UI/HUD passano true.
     * @param {boolean} [unscaled=false]
     */
    delta(unscaled = false) {
        return unscaled ? this.unscaledDt : this.dt;
    }

    setScale(value) {
        const numeric = Number(value);
        const clamped = Number.isFinite(numeric) ? numeric : this.#defaultScale;
        this.#timeScale = Math.min(this.maxTimeScale, Math.max(this.minTimeScale, clamped));
        return this;
    }

    pause() {
        this.#paused = true;
        return this;
    }

    resume() {
        this.#paused = false;
        return this;
    }

    togglePause() {
        this.#paused = !this.#paused;
        return this;
    }

    now() {
        return performance.now();
    }

    /**
     * Allinea il timestamp al frame corrente senza azzerare elapsed/scale.
     * Evita uno spike di dt dopo start, resume o un tab in background.
     */
    begin(timestamp = performance.now()) {
        this.#lastTimestamp = timestamp;
        this.#hasTimestamp = true;
        this.rawDelta = 0;
        this.unscaledDt = 0;
        this.dt = 0;
        this.#fixedAccumulator = 0;
        this.alpha = 0;
        return this;
    }

    /**
     * Nuova sessione: azzera i contatori, mantiene i default di scala.
     */
    reset(timestamp = 0) {
        this.#paused = false;
        this.#timeScale = this.#defaultScale;
        this.#lastTimestamp = timestamp;
        this.#hasTimestamp = timestamp > 0;
        this.#fixedAccumulator = 0;
        this.#fpsAccum = 0;
        this.#fpsFrames = 0;
        this.rawDelta = 0;
        this.unscaledDt = 0;
        this.dt = 0;
        this.elapsed = 0;
        this.unscaledElapsed = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.alpha = 0;
        return this;
    }

    /**
     * Un tick = un frame. Chiamare una sola volta per loop, sempre,
     * anche in pausa: così l'HUD reale non si ferma.
     * @param {number} timestamp performance.now() / rAF
     */
    tick(timestamp) {
        if (!this.#hasTimestamp) {
            this.#lastTimestamp = timestamp;
            this.#hasTimestamp = true;
            this.rawDelta = 0;
            this.unscaledDt = 0;
            this.dt = 0;
            this.alpha = this.fixedDelta > 0 ? this.#fixedAccumulator / this.fixedDelta : 0;
            return this;
        }

        const raw = Math.max(0, (timestamp - this.#lastTimestamp) / 1000);
        this.#lastTimestamp = timestamp;
        this.rawDelta = raw;
        this.unscaledDt = Math.min(raw, this.maxDelta);
        this.dt = this.#paused ? 0 : this.unscaledDt * this.#timeScale;

        this.unscaledElapsed += this.unscaledDt;
        this.elapsed += this.dt;
        this.frameCount += 1;

        this.#fpsAccum += this.unscaledDt;
        this.#fpsFrames += 1;
        if (this.#fpsAccum >= this.fpsSampleWindow) {
            this.fps = this.#fpsFrames / this.#fpsAccum;
            this.#fpsAccum = 0;
            this.#fpsFrames = 0;
        }

        if (!this.#paused && this.fixedDelta > 0) {
            this.#fixedAccumulator += this.dt;
            const cap = this.fixedDelta * this.maxFixedSteps;
            if (this.#fixedAccumulator > cap) {
                this.#fixedAccumulator = cap;
            }
        }

        this.alpha = this.fixedDelta > 0 ? this.#fixedAccumulator / this.fixedDelta : 0;
        return this;
    }

    /**
     * Step fisso per un futuro solver (massa/impulsi). Oggi il loop usa ancora dt variabile.
     * @param {(fixedDt: number) => void} callback
     */
    consumeFixedSteps(callback) {
        if (typeof callback !== 'function' || this.fixedDelta <= 0) return 0;

        let steps = 0;
        while (this.#fixedAccumulator >= this.fixedDelta) {
            callback(this.fixedDelta);
            this.#fixedAccumulator -= this.fixedDelta;
            steps += 1;
        }
        this.alpha = this.#fixedAccumulator / this.fixedDelta;
        return steps;
    }
}
