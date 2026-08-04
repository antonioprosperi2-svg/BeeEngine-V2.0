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
    BeeAnimatedSprite
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
    piattaforme: [],
    nemici: [],

    enter() {
        console.log("🎮 Inizio della partita!");
        this.entities = [];

        // Giocatore in modalità Platformer (Gravità + Salto)

        this.giocatore = new BeePlayer(100, 300, 40, 40, 'ape');
        this.giocatore.mode = 'platformer';
        this.giocatore.score = 0;
        this.giocatore.lives = 3;
        const apeImg = gioco.getAsset('ape');



        // 1. Prendi la grande immagine dell'Atlas caricata nel manifest
        const megaSheetImg = gioco.getAsset('spritesheet_totale');

        // Ogni casella di questo sheet è 128x128
        const frameW = 128;
        const frameH = 128;

        const apeSheet = new BeeSpriteSheet(megaSheetImg, frameW, frameH, {
            col: 3, // 8ª colonna (l'ultima a destra)
            row: 3, // 1ª riga in alto
            framesPerRow: 1, // Le apette sono una sotto l'altra, non affiancate!
            frameCount: 2
        });

        this.giocatore.sprite = new BeeAnimatedSprite(apeSheet, {
            animation: "fly",
            animations: {
                fly: { frames: [0, 1], fps: 4, loop: true }
            }
        });
        // Piattaforme solide
        const pavimento = new BeePlatform(0, 440, 800, 40, '#2e7d32'); // Terreno principale
        const p1 = new BeePlatform(150, 320, 180, 20, '#f57f17');
        const p2 = new BeePlatform(450, 240, 200, 20, '#f57f17');
        const p3 = new BeePlatform(250, 160, 150, 20, '#f57f17');

        this.piattaforme = [pavimento, p1, p2, p3];

        // Oggetto Collezionabile (Goccia di Miele)
        this.gocciaMiele = new BeeCollectible(800, 400);

        // Nemici
        const nemico1 = new BeeNemico(200, 390, 36, 36);
        const nemicoShooter = new BeeEnemyShooter(500, 180, 40, 40); // Nemico che spara proiettili

        this.nemici = [nemico1, nemicoShooter];

        // Registrazione Entità nella Scena
        this.entities.push(...this.piattaforme, this.gocciaMiele, ...this.nemici, this.giocatore);

        gioco.collisions.clear();
        gioco.collisions.setGroup('solids', this.piattaforme);
        gioco.collisions.setGroup('player', [this.giocatore]);
        gioco.collisions.setGroup('hazards', this.nemici);
        gioco.collisions.setGroup('collectibles', [this.gocciaMiele]);

        gioco.collisions.solid('player', 'solids');
        gioco.collisions.overlap('player', 'collectibles', (player, item) => {
            const suono = gioco.getAsset('suonoCollisione');
            if (suono) gioco.playSound(suono);
            player.addScore(100);
            item.reset();
        });
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

        // ==========================================
        // 1. MOVIMENTO E DIREZIONE DELL'APE
        // ==========================================

        // Movimento a Sinistra
        if (input.isPressed("ArrowLeft") || input.isPressed("KeyA")) {
            this.giocatore.vx = -200; // Imposta la velocità verso sinistra
            if (this.giocatore.sprite) {
                // Se flipX non funziona sul tuo motore, prova a cambiare flipX con scaleX = -1
                this.giocatore.sprite.flipX = true;
            }
        }
        // Movimento a Destra
        else if (input.isPressed("ArrowRight") || input.isPressed("KeyD")) {
            this.giocatore.vx = 200;  // Imposta la velocità verso destra
            if (this.giocatore.sprite) {
                // Se flipX non funziona sul tuo motore, prova a cambiare flipX con scaleX = 1
                this.giocatore.sprite.flipX = false;
            }
        }
        // Fermo
        else {
            this.giocatore.vx = 0;    // Ferma l'ape se non premi nulla
        }

        // Salto (Spazio o Freccia Su o W) - Salta solo se è a terra
        if ((input.wasPressed("Space") || input.wasPressed("ArrowUp") || input.wasPressed("KeyW")) && this.giocatore.sulTerreno) {
            this.giocatore.vy = -400; // Spinta verso l'alto
        }

        // ==========================================
        // 2. IL TUO CODICE ORIGINALE (Invariato)
        // ==========================================

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

        // Gestione collisioni
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

        for (const e of this.entities) {
            // Se l'entità ha uno sprite animato, disegna SOLO lo sprite!
            if (e.sprite) {
                e.sprite.draw(ctx, e.x, e.y, { width: e.width, height: e.height });
            } else {
                // Solo se NON ha uno sprite, disegna la forma base
                gioco.drawEntity(ctx, e);
            }
        }

        BeeText.drawHUD(ctx, this.giocatore.score, this.giocatore.lives, 'BEE ENGINE PLATFORMER');
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
        if (input.wasPressed("Space") || input.wasPressed("Enter") || input.wasPressed("KeyR") || (input.mouse && input.mouse.wasPressed)) {
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
    { type: 'image', name: 'spritesheet_totale', src: 'assets/spritesheet-enemies-double.png' },
    { type: 'image', name: 'mieleImg', src: 'assets/hud_coin.png', width: 32, height: 32 },
    { type: 'audio', name: 'musicaSfondo', src: 'assets/bgm_action_4.mp3' },
    { type: 'audio', name: 'suonoCollisione', src: 'assets/completetask_0.mp3' }
]).then(() => {
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
