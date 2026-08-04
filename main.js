import {
    BeeEngine,
    BeePlayer,
    BeeNemico,
    BeeEnemyShooter,
    BeeCollectible,
    BeePlatform,
    BeeMenuScene,
    BeeText,
    BeeSpriteSheet,
    BeeAnimatedSprite,
    BeeTilemapLoader // NUOVO: Sostituito BeeTilemap con il loader per Image Collections
} from './BeeEngine.js';

// 1. Inizializzazione Motore su Canvas 800x600 con AutoResize
const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600, 100);
window.gioco = gioco;

// 2. Definizione delle Scene del Gioco
const menuScene = new BeeMenuScene();

// Scena della Partita Reale (GameScene)
const gameScene = {
    entities: [],
    giocatore: null,
    gocciaMiele: null,
    nemici: [],
    tilemapLoader: null,
    enter() {
        console.log("📌 Caricamento GameScene in corso...");

        const jsonMappa = gioco.getAsset('livello1');

        if (jsonMappa) {
            this.tilemapLoader = new BeeTilemapLoader(gioco);
            this.tilemapLoader.load(jsonMappa);
            console.log("✅ Mappa Tiled caricata con successo!");
        } else {
            console.error("❌ Errore: Mappa JSON non trovata tra gli asset!");
        }

        // Giocatore
        this.giocatore = new BeePlayer(100, 300, 40, 40, 'ape');
        this.giocatore.mode = 'platformer';
        this.giocatore.score = 0;
        this.giocatore.lives = 3;

        // Spritesheet giocatore
        const megaSheetImg = gioco.getAsset('spritesheet_totale');
        if (megaSheetImg) {
            const apeSheet = new BeeSpriteSheet(megaSheetImg, 128, 128, {
                col: 5,
                row: 0,
                framesPerRow: 1,
                frameCount: 2
            });

            this.giocatore.sprite = new BeeAnimatedSprite(apeSheet, {
                animation: "fly",
                animations: {
                    fly: { frames: [0, 1], fps: 4, loop: true }
                }
            });
        }

        // Nemici
        const nemico1 = new BeeNemico(200, 390, 36, 36);
        const nemicoShooter = new BeeEnemyShooter(500, 180, 40, 40);

        this.nemici = [nemico1, nemicoShooter];
        this.entities = [...this.nemici, this.giocatore];

        // Collisioni
        gioco.collisions.clear();
        const solidiMappa = this.tilemapLoader ? this.tilemapLoader.getColliders() : [];

        gioco.collisions.setGroup('solids', solidiMappa);
        gioco.collisions.setGroup('player', [this.giocatore]);
        gioco.collisions.setGroup('hazards', this.nemici);

        gioco.collisions.solid('player', 'solids');

        gioco.collisions.overlap('player', 'hazards', (player, hazard) => {
            const gameOver = player.takeDamage(1);
            if (hazard.destroy) hazard.destroy();

            if (gameOver) {
                gioco.scenes.change('gameOver', { score: player.score });
            } else {
                player.x = 100;
                player.y = 300;
                player.vy = 0;
            }
        });
    },

    update(dt, input) {
        if (!input || !this.giocatore) return;

        // 1. Movimento e Direzione
        if (input.isPressed("ArrowLeft") || input.isPressed("KeyA")) {
            this.giocatore.vx = -200;
            if (this.giocatore.sprite) {
                this.giocatore.sprite.flipX = true;
            }
        }
        else if (input.isPressed("ArrowRight") || input.isPressed("KeyD")) {
            this.giocatore.vx = 200;
            if (this.giocatore.sprite) {
                this.giocatore.sprite.flipX = false;
            }
        }
        else {
            this.giocatore.vx = 0;
        }

        // Salto
        if ((input.wasPressed("Space") || input.wasPressed("ArrowUp") || input.wasPressed("KeyW")) && this.giocatore.sulTerreno) {
            this.giocatore.vy = -400;
        }

        // Aggiorna le entità
        for (let i = 0; i < this.entities.length; i++) {
            const e = this.entities[i];
            if (e.update) e.update(dt, input, gioco);
        }

        // Aggiorna gli sprite delle entità
        for (const e of this.entities) {
            if (e.sprite && e.sprite.update) {
                e.sprite.update(dt);
            }
        }

        // Gestione collisioni centralizzata
        gioco.collisions.run();

        // Limiti Mappa Orizzontali
        if (this.giocatore.x < 0) this.giocatore.x = 0;
        if (this.giocatore.x + this.giocatore.width > gioco.canvas.width) {
            this.giocatore.x = gioco.canvas.width - this.giocatore.width;
        }

        // Se il giocatore cade nel vuoto, perde una vita
        if (this.giocatore.y > gioco.canvas.height) {
            this.giocatore.takeDamage(1);
            this.giocatore.x = 100;
            this.giocatore.y = 300;
            this.giocatore.vy = 0;
            if (this.giocatore.lives <= 0) {
                gioco.scenes.change('gameOver', { score: this.giocatore.score });
            }
        }

        // Pulizia entità distrutte
        this.entities = this.entities.filter(e => !e.destroyed);
    },

    draw(ctx) {
        ctx.fillStyle = '#121629';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Disegna la Tilemap (gestisce internamente Frustum Culling e Allineamento)
        if (this.tilemapLoader) {
            this.tilemapLoader.render(ctx);
        }

        for (const e of this.entities) {
            if (e.sprite) {
                e.sprite.draw(ctx, e.x, e.y, { width: e.width, height: e.height });
            } else {
                gioco.drawEntity(ctx, e);
            }
        }

        const score = this.giocatore ? this.giocatore.score : 0;
        const lives = this.giocatore ? this.giocatore.lives : 0;
        BeeText.drawHUD(ctx, score, lives, 'BEE ENGINE PLATFORMER');
    }
};

// Scena di Game Over
const gameOverScene = {
    finalScore: 0,
    enter(data) {
        this.finalScore = (data && data.score) ? data.score : 0;
    },
    update(dt, input) {
        if (!input) return;
        if (input.wasPressed("Space") || input.wasPressed("Enter") || input.wasPressed("KeyR") || input.mouse.wasPressed) {
            gioco.scenes.change('game');
        }
    },
    draw(ctx) {
        ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.fillStyle = '#FF3333';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', ctx.canvas.width / 2, ctx.canvas.height / 3);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`PUNTEGGIO FINALE: ${String(this.finalScore).padStart(6, '0')}`, ctx.canvas.width / 2, ctx.canvas.height / 2);

        const time = Date.now() / 400;
        ctx.fillStyle = Math.sin(time) > 0 ? '#FFD700' : '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Premi SPAZIO, INVIO o TOCCA per Giocare Ancora', ctx.canvas.width / 2, ctx.canvas.height / 1.5);
    }
};

// 3. Registrazione delle Scene nel SceneManager di BeeEngine
gioco.scenes.add('menu', menuScene);
gioco.scenes.add('game', gameScene);
gioco.scenes.add('gameOver', gameOverScene);

// 4. Caricamento Manifest COMPLETO (Sia Nemici che Terreni)
gioco.loadManifest([
    { type: 'image', name: 'BG', src: 'assets/BG/BG.png' },
    { type: 'image', name: 'Tiles', src: 'assets/Tiles/tiles.png' },
    { type: 'json', name: 'livello1', src: 'assets/livello-1.json' },
    { type: 'audio', name: 'musicaSfondo', src: 'assets/bgm_action_4.mp3' },
    { type: 'audio', name: 'suonoCollisione', src: 'assets/completetask_0.mp3' }
])
    .then(async () => {
        // Pre-carica le tile della mappa subito dopo aver scaricato il JSON
        const jsonMappa = gioco.getAsset('livello1');
        if (jsonMappa) {
            const tempLoader = new BeeTilemapLoader(gioco);
            await tempLoader.preloadAssets(jsonMappa, 'assets/');
        }

        gioco.scenes.change('menu');
        gioco.start();
    }).catch((err) => {
        console.error('❌ Errore caricamento asset:', err);
        gioco.scenes.change('menu');
        gioco.start();
    });

// Musica di Sfondo al primo Click o Tasto
const avviaMusica = () => {
    const musica = gioco.getAsset('musicaSfondo');
    if (musica) gioco.playMusic(musica, 0.3);
    window.removeEventListener('click', avviaMusica);
    window.removeEventListener('keydown', avviaMusica);
};

window.addEventListener('click', avviaMusica);
window.addEventListener('keydown', avviaMusica);