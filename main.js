import {
    BeeEngine,
    BeeEnemyShooter,
    BeeParticleSystem
} from './BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600, 100);
window.gioco = gioco;

const turret = new BeeEnemyShooter(380, 80, 44, 44);
turret.vx = 140;
turret.vy = 0;
turret.shootInterval = 0.12;
turret.bulletSpeed = 420;

const sparks = new BeeParticleSystem({ x: 400, y: 300, initial: 96, max: 384 });

const scene = {
    entities: [turret, sparks],

    draw(ctx) {
        ctx.fillStyle = '#0d1020';
        ctx.fillRect(0, 0, 800, 600);

        const bullets = gioco.bullets;
        ctx.fillStyle = '#ffe08a';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('BeePool — spawn / release, niente new a ogni sparo', 24, 36);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#c8c8c8';
        ctx.fillText(
            `Bullets  inUse ${bullets.inUse}   free ${bullets.available}   size ${bullets.size}/${bullets.max}`,
            24,
            58
        );
        ctx.fillText(
            `Sparks   live ${sparks.particles.length}   free ${sparks.particlePool.available}   size ${sparks.particlePool.size}/${sparks.particlePool.max}`,
            24,
            80
        );
        ctx.fillText('Click = burst particelle. F2 Ladybug.', 24, 102);
    }
};

gioco.scenes.add('pool', scene);
gioco.scenes.change('pool');
gioco.enableLadybug();
gioco.start();

gioco.canvas.addEventListener('pointerdown', (event) => {
    const pos = gioco.input.getCanvasPosition(event.clientX, event.clientY);
    sparks.x = pos.x;
    sparks.y = pos.y;
    sparks.emit(28, {
        speedMin: 40,
        speedMax: 220,
        lifeMin: 0.35,
        lifeMax: 0.9,
        sizeMin: 2,
        sizeMax: 5,
        color: '#ffcc66'
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
