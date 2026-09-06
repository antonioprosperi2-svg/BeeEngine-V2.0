import { BeeEngine, BeeEntity } from './BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600, 100);
window.gioco = gioco;

class TransformBody extends BeeEntity {
    constructor(x, y, width, height, color, angularVelocity = 0) {
        super(x, y, width, height);
        this.color = color;
        this.angularVelocity = angularVelocity;
        this.transform.setPivot(width / 2, height / 2);
        this.addRectCollider();
    }

    draw(ctx) {
        ctx.save();
        this.applyWorldTransform(ctx);
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#ffe08a';
        ctx.fillRect(this.width / 2 - 3, this.height / 2 - 3, 6, 6);
        ctx.restore();
    }
}

const sun = new TransformBody(400, 300, 72, 72, '#f0a202', 0.7);
const planet = new TransformBody(36 + 140, 36, 40, 40, '#4a90e2', -1.4);
const moon = new TransformBody(20 + 52, 20, 18, 18, '#d8d8d8', 2.5);

sun.addChild(planet);
planet.addChild(moon);

const scene = {
    entities: [sun],

    draw(ctx) {
        ctx.fillStyle = '#0d1020';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#ffe08a';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('BeeTransform — scena grafo, non parent.x + x', 24, 500);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#c8c8c8';
        ctx.fillText('Il sole ruota. Il pianeta è locale (140,0). La luna è locale al pianeta.', 24, 526);
        ctx.fillText('F2 Ladybug: l\'OBB ruota col parent. F4 freeze per ispezionare.', 24, 548);
    }
};

gioco.scenes.add('transform', scene);
gioco.scenes.change('transform');
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
