export class BeeTimer {
    constructor(duration, callback, loop = false) {
        this.duration = duration;
        this.callback = callback;
        this.loop = loop;

        this.time = 0;
        this.running = false;
        this.finished = false;
    }

    start() {
        this.time = 0;
        this.running = true;
        this.finished = false;
    }

    stop() {
        this.running = false;
    }

    reset() {
        this.time = 0;
        this.finished = false;
    }

    update(dt) {
        if (!this.running || this.finished) return;

        this.time += dt;

        if (this.time >= this.duration) {
            if (this.callback) {
                this.callback();
            }

            if (this.loop) {
                this.time = 0;
            } else {
                this.finished = true;
                this.running = false;
            }
        }
    }
}
/** 🌟 Il ruolo di BeeTimer
 * Gestisce il tempo di un evento.
 * Può essere utilizzato per creare ritardi, animazioni o controlli di tempo.
 */
/** 
 * Classe BeeTimer: Gestisce il tempo e i ritardi nel gioco.
 * Utilizzata per creare cooldown (es. tempo di ricarica dei colpi), 
 * durate di bonus/malus, spawn temporizzati dei nemici o animazioni.
 */
