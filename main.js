import { BeeEngine } from './BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600, 100);
window.gioco = gioco;

const box = {
    x: 80,
    y: 280,
    size: 48,
    speed: 240
};

const timeScene = {
    update(dt) {
        box.x += box.speed * dt;
        if (box.x <= 40 || box.x + box.size >= 760) {
            box.speed *= -1;
            box.x = Math.max(40, Math.min(760 - box.size, box.x));
        }
    },

    draw(ctx, engine) {
        const time = engine.time;

        ctx.fillStyle = '#f7f7f4';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#ff2d2d';
        ctx.fillRect(box.x, box.y, box.size, box.size);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.size, box.size);

        if (time.paused) {
            ctx.fillStyle = 'rgba(13, 15, 26, 0.45)';
            ctx.fillRect(0, 0, 800, 600);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 48px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSA', 400, 250);
            ctx.font = '18px monospace';
            ctx.fillStyle = '#00e5ff';
            ctx.fillText('il tempo reale continua — la lancetta gira ancora', 400, 290);
            ctx.textAlign = 'left';
        }

        const cx = 700;
        const cy = 90;
        const radius = 36;
        const realAngle = time.unscaledElapsed * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
            cx + Math.cos(realAngle - Math.PI / 2) * (radius - 8),
            cy + Math.sin(realAngle - Math.PI / 2) * (radius - 8)
        );
        ctx.stroke();

        ctx.fillStyle = time.paused ? '#ffd700' : '#111';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('BeeTime — orologio di simulazione vs tempo reale', 24, 40);

        ctx.font = '16px monospace';
        ctx.fillText(`tempo gioco  (scaled) : ${time.elapsed.toFixed(2)} s`, 24, 80);
        ctx.fillText(`tempo reale (unscaled): ${time.unscaledElapsed.toFixed(2)} s`, 24, 106);
        ctx.fillText(`timeScale             : ${time.timeScale.toFixed(2)}x`, 24, 132);
        ctx.fillText(`dt / unscaledDt       : ${time.dt.toFixed(4)} / ${time.unscaledDt.toFixed(4)}`, 24, 158);
        ctx.fillText(`fps                   : ${time.fps.toFixed(0)}`, 24, 184);

        ctx.fillStyle = time.paused ? '#ffd700' : '#444';
        ctx.fillText('P  pausa/riprendi     1  0.25x     2  1x     3  2x', 24, 540);
        ctx.fillText('Il quadrato rosso usa dt scalato. La lancetta ciano usa unscaledElapsed.', 24, 566);
    }
};

gioco.scenes.add('time', timeScene);
gioco.scenes.change('time');
gioco.start();

function bindTimeControls() {
    const onPause = () => gioco.pause();
    const onResume = () => gioco.resume();
    const onSlow = () => gioco.setTimeScale(0.25);
    const onNormal = () => gioco.setTimeScale(1);
    const onFast = () => gioco.setTimeScale(2);

    const pauseBtn = document.getElementById('btnPause');
    const resumeBtn = document.getElementById('btnResume');
    const slowBtn = document.getElementById('btnSlow');
    const normalBtn = document.getElementById('btnNormal');
    const fastBtn = document.getElementById('btnFast');

    if (pauseBtn) pauseBtn.addEventListener('click', onPause);
    if (resumeBtn) resumeBtn.addEventListener('click', onResume);
    if (slowBtn) slowBtn.addEventListener('click', onSlow);
    if (normalBtn) normalBtn.addEventListener('click', onNormal);
    if (fastBtn) fastBtn.addEventListener('click', onFast);

    window.addEventListener('keydown', (event) => {
        if (event.repeat) return;
        if (event.code === 'KeyP') gioco.time.togglePause();
        if (event.code === 'Digit1' || event.code === 'Numpad1') gioco.setTimeScale(0.25);
        if (event.code === 'Digit2' || event.code === 'Numpad2') gioco.setTimeScale(1);
        if (event.code === 'Digit3' || event.code === 'Numpad3') gioco.setTimeScale(2);
    });
}

bindTimeControls();
