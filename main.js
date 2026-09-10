import {
    BeeEngine,
    BeeEntity,
    BeeRigidBody,
    BEE_LAYER,
    BEE_BODY_TYPE
} from './BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600, 100);
window.gioco = gioco;

const COLORS = ['#4a90e2', '#f0a202', '#e85d4c', '#7ad17a', '#d8d8d8', '#c1783a'];

class PhysActor extends BeeEntity {
    constructor(x, y, width, height, color, bodyOptions) {
        super(x, y, width, height);
        this.color = color;
        this.shapeType = (bodyOptions && bodyOptions.shape && bodyOptions.shape.type) || 'box';
        this.transform.setPivot(width / 2, height / 2);
        this.addRigidBody({
            world: gioco.physics,
            ...bodyOptions
        });
    }

    draw(ctx) {
        ctx.save();
        this.applyWorldTransform(ctx);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;

        if (this.shapeType === 'circle') {
            const r = this.width / 2;
            ctx.beginPath();
            ctx.arc(r, r, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.strokeRect(0, 0, this.width, this.height);
        }

        ctx.restore();
    }
}

const walls = [
    new PhysActor(400, 580, 780, 28, '#3d4a3a', {
        type: BEE_BODY_TYPE.STATIC,
        shape: BeeRigidBody.box(780, 28),
        layer: BEE_LAYER.WORLD
    }),
    new PhysActor(20, 300, 28, 560, '#3d4a3a', {
        type: BEE_BODY_TYPE.STATIC,
        shape: BeeRigidBody.box(28, 560),
        layer: BEE_LAYER.WORLD
    }),
    new PhysActor(780, 300, 28, 560, '#3d4a3a', {
        type: BEE_BODY_TYPE.STATIC,
        shape: BeeRigidBody.box(28, 560),
        layer: BEE_LAYER.WORLD
    })
];

const swarm = [];
const playerMask = BEE_LAYER.WORLD | BEE_LAYER.PLAYER;
for (let i = 0; i < 56; i++) {
    const size = 12 + (i % 4) * 3;
    const ball = new PhysActor(
        80 + (i % 10) * 64,
        40 + Math.floor(i / 10) * 42,
        size,
        size,
        COLORS[i % COLORS.length],
        {
            type: BEE_BODY_TYPE.DYNAMIC,
            mass: size / 16,
            restitution: 0.45,
            shape: BeeRigidBody.circle(size / 2),
            layer: BEE_LAYER.PLAYER,
            mask: playerMask
        }
    );
    swarm.push(ball);
}

let lastHits = 0;

const scene = {
    entities: [...walls, ...swarm],

    draw(ctx) {
        ctx.fillStyle = '#0d1020';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#ffe08a';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('BeeSpatialHash — chi è vicino, non tutte le coppie', 24, 36);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#c8c8c8';
        ctx.fillText(`Body: ${gioco.physics.bodies.length}   celle: ${gioco.spatial.cellCount}   last blast: ${lastHits}`, 24, 58);
        ctx.fillText('Click = queryRadius 90px (esplosione). F2 Ladybug.', 24, 80);
    }
};

gioco.scenes.add('spatial', scene);
gioco.scenes.change('spatial');
gioco.enableLadybug();
gioco.start();

gioco.canvas.addEventListener('pointerdown', (event) => {
    const pos = gioco.input.getCanvasPosition(event.clientX, event.clientY);
    const hits = gioco.physics.queryRadius(pos.x, pos.y, 90);
    lastHits = hits.length;
    for (let i = 0; i < hits.length; i++) {
        const body = hits[i];
        if (body.type !== BEE_BODY_TYPE.DYNAMIC) continue;
        body.readPose();
        const dx = body.pose.x - pos.x;
        const dy = body.pose.y - pos.y;
        const dist = Math.hypot(dx, dy) || 1;
        const power = 420 * (1 - Math.min(1, dist / 90));
        body.applyImpulse((dx / dist) * power, (dy / dist) * power - 80);
    }
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
