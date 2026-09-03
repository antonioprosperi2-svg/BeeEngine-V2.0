import { BeeEngine, BeeEntity, BeePlatform } from './BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600, 100);
window.gioco = gioco;

class PatrolBox extends BeeEntity {
    constructor(x, y, width, height, color, vx, minX, maxX) {
        super(x, y, width, height);
        this.color = color;
        this.vx = vx;
        this.minX = minX;
        this.maxX = maxX;
        this.addRectCollider();
    }

    update(dt, input, engine) {
        super.update(dt, input, engine);
        if (this.worldX <= this.minX || this.worldX + this.width >= this.maxX) {
            this.vx *= -1;
            this.worldX = Math.max(this.minX, Math.min(this.maxX - this.width, this.worldX));
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.worldX, this.worldY, this.width, this.height);
    }
}

const ground = new BeePlatform(60, 430, 680, 28, '#c9a227');
ground.addRectCollider();

const walker = new PatrolBox(90, 382, 48, 48, '#4a90e2', 160, 70, 730);
const hunter = new PatrolBox(560, 390, 40, 40, '#e24a4a', -120, 70, 730);
const hover = new PatrolBox(200, 250, 36, 36, '#7c5cff', 90, 80, 720);

const ladybugScene = {
    entities: [ground, walker, hunter, hover],

    draw(ctx) {
        ctx.fillStyle = '#14161f';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#ffe08a';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('BeeLadybug — debug visivo del motore', 24, 520);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#c8c8c8';
        ctx.fillText('F2 apre la coccinella. Verde = attiva, rosso = in collisione.', 24, 546);
        ctx.fillText('F3 slow-motion   F4 freeze del frame   click sui tasti dell\'overlay', 24, 568);
    }
};

gioco.scenes.add('ladybug', ladybugScene);
gioco.scenes.change('ladybug');
gioco.enableLadybug();
gioco.start();

function bindControls() {
    const pauseBtn = document.getElementById('btnPause');
    const resumeBtn = document.getElementById('btnResume');
    const slowBtn = document.getElementById('btnSlow');
    const normalBtn = document.getElementById('btnNormal');
    const fastBtn = document.getElementById('btnFast');
    const ladybugBtn = document.getElementById('btnLadybug');

    if (pauseBtn) pauseBtn.addEventListener('click', () => gioco.pause());
    if (resumeBtn) resumeBtn.addEventListener('click', () => gioco.resume());
    if (slowBtn) slowBtn.addEventListener('click', () => gioco.debug.applySlowMo());
    if (normalBtn) normalBtn.addEventListener('click', () => gioco.debug.restoreRealtime());
    if (fastBtn) fastBtn.addEventListener('click', () => gioco.setTimeScale(2));
    if (ladybugBtn) ladybugBtn.addEventListener('click', () => gioco.debug.toggle());
}

bindControls();
