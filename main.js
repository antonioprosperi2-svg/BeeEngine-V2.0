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

let triggerHits = 0;
let triggerInside = 0;

gioco.physics.onBeginOverlap = (a, b) => {
    if (a.isTrigger || b.isTrigger) {
        triggerHits += 1;
        triggerInside += 1;
    }
};
gioco.physics.onEndOverlap = (a, b) => {
    if (a.isTrigger || b.isTrigger) {
        triggerInside = Math.max(0, triggerInside - 1);
    }
};

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
        } else if (this.shapeType === 'capsule') {
            const r = Math.min(this.width, this.height) / 2;
            if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(0, 0, this.width, this.height, r);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(0, 0, this.width, this.height);
                ctx.strokeRect(0, 0, this.width, this.height);
            }
        } else {
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.strokeRect(0, 0, this.width, this.height);
        }

        ctx.restore();
    }
}

const floor = new PhysActor(400, 560, 760, 40, '#3d4a3a', {
    type: BEE_BODY_TYPE.STATIC,
    shape: BeeRigidBody.box(760, 40),
    layer: BEE_LAYER.WORLD,
    mask: BEE_LAYER.ALL
});
const left = new PhysActor(20, 300, 40, 520, '#3d4a3a', {
    type: BEE_BODY_TYPE.STATIC,
    shape: BeeRigidBody.box(40, 520),
    layer: BEE_LAYER.WORLD
});
const right = new PhysActor(780, 300, 40, 520, '#3d4a3a', {
    type: BEE_BODY_TYPE.STATIC,
    shape: BeeRigidBody.box(40, 520),
    layer: BEE_LAYER.WORLD
});

const sensor = new PhysActor(400, 430, 160, 80, 'rgba(61, 255, 106, 0.28)', {
    type: BEE_BODY_TYPE.STATIC,
    isTrigger: true,
    shape: BeeRigidBody.box(160, 80),
    layer: BEE_LAYER.TRIGGER,
    mask: BEE_LAYER.PLAYER
});

const ghost = new PhysActor(620, 320, 140, 24, '#7a5cff', {
    type: BEE_BODY_TYPE.STATIC,
    shape: BeeRigidBody.box(140, 24),
    layer: BEE_LAYER.GHOST,
    mask: BEE_LAYER.GHOST | BEE_LAYER.WORLD
});

const playerMask = BEE_LAYER.WORLD | BEE_LAYER.PLAYER | BEE_LAYER.TRIGGER;

const ballA = new PhysActor(220, 80, 36, 36, '#4a90e2', {
    type: BEE_BODY_TYPE.DYNAMIC,
    mass: 1.2,
    restitution: 0.35,
    shape: BeeRigidBody.circle(18),
    layer: BEE_LAYER.PLAYER,
    mask: playerMask
});
const ballB = new PhysActor(300, 40, 28, 28, '#f0a202', {
    type: BEE_BODY_TYPE.DYNAMIC,
    mass: 0.8,
    restitution: 0.55,
    shape: BeeRigidBody.circle(14),
    layer: BEE_LAYER.PLAYER,
    mask: playerMask
});
const crate = new PhysActor(400, 90, 48, 48, '#c1783a', {
    type: BEE_BODY_TYPE.DYNAMIC,
    mass: 2,
    restitution: 0.1,
    shape: BeeRigidBody.box(48, 48),
    layer: BEE_LAYER.PLAYER,
    mask: playerMask,
    omega: 1.2
});
const capsule = new PhysActor(500, 50, 28, 64, '#e85d4c', {
    type: BEE_BODY_TYPE.DYNAMIC,
    mass: 1.4,
    restitution: 0.2,
    shape: BeeRigidBody.capsule(14, 36),
    layer: BEE_LAYER.PLAYER,
    mask: playerMask
});
const scanner = new PhysActor(640, 80, 24, 24, '#d8d8d8', {
    type: BEE_BODY_TYPE.DYNAMIC,
    mass: 0.6,
    restitution: 0.4,
    shape: BeeRigidBody.circle(12),
    layer: BEE_LAYER.GHOST,
    mask: BEE_LAYER.WORLD | BEE_LAYER.GHOST
});

const scene = {
    entities: [floor, left, right, sensor, ghost, ballA, ballB, crate, capsule, scanner],

    draw(ctx) {
        ctx.fillStyle = '#0d1020';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#ffe08a';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('BeePhysicsWorld — massa e layer, non AABB a gruppi', 24, 36);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#c8c8c8';
        ctx.fillText('Verde = trigger (niente bounce). Viola = ghost: il player lo attraversa, lo scanner no.', 24, 58);
        ctx.fillText(`Trigger hits: ${triggerHits}   inside: ${triggerInside}   click = impulso`, 24, 80);
        ctx.fillText('F2 Ladybug: forma del body. F4 freeze.', 24, 102);
    }
};

gioco.scenes.add('physics', scene);
gioco.scenes.change('physics');
gioco.enableLadybug();
gioco.start();

gioco.canvas.addEventListener('pointerdown', (event) => {
    const pos = gioco.input.getCanvasPosition(event.clientX, event.clientY);
    const bodies = gioco.physics.bodies;
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.type !== BEE_BODY_TYPE.DYNAMIC) continue;
        body.readPose();
        const dx = pos.x - body.pose.x;
        const dy = pos.y - body.pose.y;
        const dist = Math.hypot(dx, dy) || 1;
        body.applyImpulse((dx / dist) * 280, (dy / dist) * 280);
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
