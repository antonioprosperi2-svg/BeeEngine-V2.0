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

    async enter() {
        console.log("📌 Asset disponibili:", gioco.assets?.jsons || 'Nessun asset caricato');


        // Prendi il JSON della mappa dagli asset
        const jsonMappa = gioco.getAsset('livello1');

        if (jsonMappa) {
            this.tilemapLoader = new BeeTilemapLoader(gioco);

            // 1. Precarica tutte le immagini distinte presenti nella mappa Tiled
            await this.tilemapLoader.preloadAssets(jsonMappa, 'assets/');

            // 2. Analizza la mappa ed estrae la griglia e le collisioni
            this.tilemapLoader.load(jsonMappa);
        } else {
            console.error("❌ Errore: Mappa JSON non trovata tra gli asset!");
        }

        // Giocatore in modalità Platformer (Gravità + Salto)
        this.giocatore = new BeePlayer(100, 300, 40, 40, 'ape');
        this.giocatore.mode = 'platformer';
        this.giocatore.score = 0;
        this.giocatore.lives = 3;

        // Spritesheet del giocatore
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

        // Registrazione Entità
        this.entities = [...this.nemici, this.giocatore];

        // Impostazione Collisioni con BeeCollisionSystem
        gioco.collisions.clear();

        // Estrazione automatica dei collisori solidi ottimizzati dalla Tilemap
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

        // Usa il punto interrogativo per evitare che il gioco si blocchi se il giocatore non è ancora nato
        BeeText.drawHUD(ctx, this.giocatore?.score || 0, this.giocatore?.lives || 0, 'BEE ENGINE PLATFORMER');

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

// 4. Caricamento Asset e Avvio dalla Scena 'menu'
gioco.loadManifest([

    { type: 'json', name: 'livello1', src: 'assets/livello-1.json' },

    // I 5 fogli dello spritesheet
    { type: 'image', name: 'Terrain (16 x 16).png', src: 'assets/Terrain (16 x 16).png' },
    { type: 'image', name: 'Tropics_entities (16 x 16).png', src: 'assets/Tropics_entities.png' },
    { type: 'image', name: '1 - Waters_version_1.png', src: 'assets/1 - Waters_version_1.png' },
    { type: 'image', name: '5 - Sky_color.png', src: 'assets/5 - Sky_color.png' },
    { type: 'image', name: '4 - Background_clouds.png', src: 'assets/4 - Background_clouds.png' },

    { type: 'audio', name: 'musicaSfondo', src: 'assets/bgm_action_4.mp3' },
    { type: 'audio', name: 'suonoCollisione', src: 'assets/completetask_0.mp3' }
]).then(() => {
    const levelData = gioco.getAsset('livello1');
    console.log('JSON caricato:', levelData);

    gioco.scenes.change('menu');
    gioco.start();
}).catch((err) => {
    console.error('❌ Errore caricamento asset:', err);
    gioco.scenes.change('menu');
    gioco.start();
}).then(() => {
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