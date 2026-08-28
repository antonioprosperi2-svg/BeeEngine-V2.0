import {
    BeeEngine,
    BeePlayer,
    BeeEnemy,
    BeeEnemyShooter,
    BeeCollectible,
    BeePlatform,
    BeeText,
    BeeRectCollider
} from '../BeeEngine.js';

// 1. Initialize Engine on Canvas
const game = new BeeEngine('testCanvas', 800, 600);
game.enableAutoResize(800, 600);
window.game = game;

// 2. Define Game Scene
const mainScene = {
    entities: [],
    player: null,

    enter() {
        // Player setup
        this.player = new BeePlayer(100, 300, 40, 40);
        this.player.mode = 'platformer';

        // Platforms
        const ground = new BeePlatform(0, 520, 800, 80);
        const platform1 = new BeePlatform(200, 380, 200, 20);
        const platform2 = new BeePlatform(480, 260, 200, 20);

        // Enemies
        const enemy = new BeeEnemy(220, 348, 32, 32);
        enemy.setPatrolBounds(200, 380);

        const shooter = new BeeEnemyShooter(520, 220, 32, 32);

        // Collectibles
        const collectible = new BeeCollectible(800, 600);

        this.entities = [ground, platform1, platform2, enemy, shooter, collectible, this.player];

        // Collision setup
        game.collisions.clear();
        game.collisions.setGroup('solids', [ground, platform1, platform2]);
        game.collisions.setGroup('player', [this.player]);
        game.collisions.setGroup('hazards', [enemy, shooter]);

        game.collisions.solid('player', 'solids');
        game.collisions.overlap('player', 'hazards', (p, h) => {
            const isDead = p.takeDamage(1);
            if (isDead) {
                p.x = 100;
                p.y = 300;
                p.lives = 3;
            }
        });
    },

    update(dt, input) {
        for (const e of this.entities) {
            if (e.update) e.update(dt, input, game);
        }
        game.collisions.run();
    },

    draw(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        for (const e of this.entities) {
            if (e.draw) e.draw(ctx, game);
        }

        BeeText.drawHUD(ctx, this.player?.score || 0, this.player?.lives || 3, 'BEE ENGINE 2D DEMO');
    }
};

game.scenes.add('main', mainScene);
game.scenes.change('main');
game.start();
