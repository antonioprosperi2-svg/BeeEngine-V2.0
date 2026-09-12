import { BeeEngine, BeeEntity, BeeAnimatedSprite } from './BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600, 100);
window.gioco = gioco;

const CLIP_COLOR = {
    0: '#6b7280',
    1: '#9ca3af',
    2: '#f0a202',
    3: '#f5b942',
    4: '#e09b00',
    5: '#ffcc66',
    6: '#4a90e2',
    7: '#ef4444',
    8: '#dc2626',
    9: '#b91c1c'
};

const sheet = {
    frameWidth: 64,
    frameHeight: 64,
    drawFrame(ctx, frameIndex, x, y, w, h) {
        ctx.fillStyle = CLIP_COLOR[frameIndex] || '#888';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#111';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(String(frameIndex), x + 8, y + 22);
    }
};

const sprite = new BeeAnimatedSprite(sheet, {
    animation: 'idle',
    animations: {
        idle: { frames: [0, 1], fps: 4, loop: true },
        run: { frames: [2, 3, 4, 5], fps: 10, loop: true },
        jump: { frames: [6], fps: 8, loop: false },
        attack: { frames: [7, 8, 9], fps: 12, loop: false }
    }
});

class Actor extends BeeEntity {
    constructor() {
        super(368, 268, 64, 64);
        this.grounded = true;
        this.wantsAttack = false;
        this.airTime = 0;
        this.sprite = sprite;
        this.animator = gioco.createAnimator(sprite)
            .add('idle', { clip: 'idle', initial: true })
            .add('run', { clip: 'run', priority: 1 })
            .add('jump', { clip: 'jump', loop: false, priority: 2 })
            .add('attack', {
                clip: 'attack',
                loop: false,
                lock: true,
                priority: 10,
                exitTo: 'idle',
                onEnter: () => { this.wantsAttack = false; }
            })
            .when('idle', 'run', (actor) => actor.grounded && Math.abs(actor.vx) > 1)
            .when('run', 'idle', (actor) => actor.grounded && Math.abs(actor.vx) <= 1)
            .when(['idle', 'run'], 'jump', (actor) => !actor.grounded)
            .when('jump', 'idle', (actor) => actor.grounded && Math.abs(actor.vx) <= 1)
            .when('jump', 'run', (actor) => actor.grounded && Math.abs(actor.vx) > 1)
            .when('*', 'attack', (actor) => actor.wantsAttack)
            .start();
    }

    update(dt, input, engine) {
        this.vx = 0;
        if (input) {
            if (input.isPressed('ArrowRight') || input.isPressed('KeyD')) this.vx = 180;
            if (input.isPressed('ArrowLeft') || input.isPressed('KeyA')) this.vx = -180;
            if (this.grounded && (input.wasPressed('Space') || input.wasPressed('ArrowUp') || input.wasPressed('KeyW'))) {
                this.grounded = false;
                this.airTime = 0.45;
            }
            if (input.wasPressed('KeyX') || input.wasPressed('KeyJ')) {
                this.wantsAttack = true;
            }
        }

        if (!this.grounded) {
            this.airTime -= dt;
            if (this.airTime <= 0) {
                this.grounded = true;
                this.airTime = 0;
            }
        }

        super.update(dt, input, engine);
        if (this.sprite) this.sprite.flipX = this.vx < 0;
    }

    draw(ctx) {
        if (this.sprite) {
            this.sprite.draw(ctx, this.worldX, this.worldY, { width: this.width, height: this.height });
        }
    }
}

const hero = new Actor();

const scene = {
    entities: [hero],

    draw(ctx) {
        ctx.fillStyle = '#0d1020';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#1a1f33';
        ctx.fillRect(0, 360, 800, 8);

        ctx.fillStyle = '#ffe08a';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('BeeAnimator — idle → run → jump, lock attacco', 24, 36);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#c8c8c8';
        ctx.fillText(
            `stato ${hero.animator.current}   lock ${hero.animator.locked ? 'sì' : 'no'}   clip ${sprite.clip}   frame ${sprite.currentFrameIndex}`,
            24,
            58
        );
        ctx.fillText('A/D o frecce = corri. Spazio = salto. X o J = attacco (non interrompibile). F2 Ladybug.', 24, 80);
    }
};

gioco.scenes.add('animator', scene);
gioco.scenes.change('animator');
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
