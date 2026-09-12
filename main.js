import { BeeEngine } from './BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600, 100);
window.gioco = gioco;

let gameTicks = 0;
let hudTicks = 0;
let shots = 0;
let lastOneShot = '—';

const gameBeat = gioco.every(1, () => {
    gameTicks += 1;
}, { unscaled: false });

const hudBeat = gioco.every(1, () => {
    hudTicks += 1;
}, { unscaled: true });

const scene = {
    entities: [],

    draw(ctx) {
        ctx.fillStyle = '#0d1020';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#ffe08a';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('BeeTimer — simulazione vs HUD', 24, 36);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#c8c8c8';
        ctx.fillText(
            `clock ${gioco.timers.size}   game beats ${gameTicks}   HUD beats ${hudTicks}   one-shot ${lastOneShot}`,
            24,
            58
        );
        ctx.fillText(
            `Pausa = barra gialla ferma, ciano gira. Click = after(0.8). F2 Ladybug.`,
            24,
            80
        );

        drawBar(ctx, 80, 220, 640, 36, gameBeat.progress, '#f0a202', 'SIM  1s  (dt)');
        drawBar(ctx, 80, 300, 640, 36, hudBeat.progress, '#00e5ff', 'HUD  1s  (unscaledDt)');

        ctx.fillStyle = gioco.time.paused ? '#ffd700' : '#7ad17a';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(gioco.time.paused ? 'PAUSA' : 'RUN', 80, 180);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#c8c8c8';
        ctx.fillText(
            `${gioco.time.timeScale.toFixed(2)}x   game ${gioco.time.elapsed.toFixed(1)}s   real ${gioco.time.unscaledElapsed.toFixed(1)}s   shots ${shots}`,
            180,
            180
        );
    }
};

function drawBar(ctx, x, y, width, height, progress, color, label) {
    ctx.save();
    ctx.fillStyle = '#1a1f33';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * progress, height);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px monospace';
    ctx.fillText(label, x, y - 8);
    ctx.restore();
}

gioco.scenes.add('timer', scene);
gioco.scenes.change('timer');
gioco.enableLadybug();
gioco.start();

gioco.canvas.addEventListener('pointerdown', (event) => {
    const pos = gioco.input.getCanvasPosition(event.clientX, event.clientY);
    lastOneShot = '…';
    gioco.after(0.8, () => {
        shots += 1;
        lastOneShot = `${Math.round(pos.x)},${Math.round(pos.y)}`;
    });
});

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
