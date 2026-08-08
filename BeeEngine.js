import { BeeTilemapLoader } from './src/BeeTilemapLoader.js';
import { BeeAnimatedSprite } from './src/BeeAnimatedSprite.js';
import { BeeSpriteSheet } from './src/BeeSpriteSheet.js';
import { BeeCollectible } from './src/BeeCollectible.js';
import { BeeSceneManager } from './src/BeeSceneManager.js';
import { BeeSave } from './src/BeeSave.js';
import { BeeParticleSystem } from './src/BeeParticleSystem.js';
import { BeeTilemap } from './src/BeeTilemap.js';
import { BeeButton } from './src/BeeButton.js';
import { BeeText } from './src/BeeText.js';
import { BeeTimer } from './src/BeeTimer.js';
import { BeeRectCollider } from './src/BeeRectCollider.js';
import { BeeAssetManager } from './src/BeeAssetManager.js';
import { BeeMenuScene } from './src/BeeMenuScene.js';
import { BeeBullet } from './src/BeeBullet.js';
import { BeePlayer } from './src/BeePlayer.js';
import { BeeEntity } from './src/BeeEntity.js';
import { BeeGrid } from './src/BeeGrid.js';
import { BeeCamera } from './src/BeeCamera.js';
import { BeeSprite } from './src/BeeSprite.js';
import { BeeTouchControls } from './src/BeeTouchControls.js';
import { BeeInput } from './src/BeeInput.js';
import { BeeNemico } from './src/BeeNemico.js';
import { BeeEnemyShooter } from './src/BeeEnemyShooter.js';
import { BeePlatform } from './src/BeePlatform.js';
import { BeeCollisionSystem } from './src/BeeCollisionSystem.js';
export class BeeEngine {
    constructor(canvasId, width, height) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = width;
        this.canvas.height = height;

        this.assets = new BeeAssetManager();
        this.input = new BeeInput(this.canvas);
        this.scenes = new BeeSceneManager(this); // Sostituito la Map grezza con il SceneManager dedicato

        this.entities = [];
        this.collisions = new BeeCollisionSystem(this);
        this.lastTime = 0;
        this.camera = null;
        this.grid = null;
        this.currentScene = null;
        this.events = {};

        this.isRunning = false;
        this.isPaused = false;
        this.animationFrameId = null;

        this._startAudioHandler = null; // Riferimento per fare il cleanup dei listener audio

        this.lockOrientation();

        if ('ontouchstart' in window) {
            this.touchControls = new BeeTouchControls(this.canvas, this.input);
        }
    }
    createSpriteSheet(image, frameWidth, frameHeight, config = {}) {
        return new BeeSpriteSheet(image, frameWidth, frameHeight, config);
    }

    createAnimatedSprite(spriteSheet, config = {}) {
        return new BeeAnimatedSprite(spriteSheet, config);
    }
    enableAutoResize(baseWidth = this.canvas.width, baseHeight = this.canvas.height, reservedHeight = 80) {
        this.canvas.style.display = 'block';
        this.canvas.style.margin = '0 auto';

        this._resizeHandler = () => {
            const windowWidth = window.innerWidth;
            // Sottraggono lo spazio per i pulsanti HTML in basso/alto
            const availableHeight = Math.max(200, window.innerHeight - reservedHeight);

            const targetRatio = baseWidth / baseHeight;
            const windowRatio = windowWidth / availableHeight;

            let newWidth = windowWidth;
            let newHeight = availableHeight;

            if (windowRatio > targetRatio) {
                newWidth = availableHeight * targetRatio;
            } else {
                newHeight = windowWidth / targetRatio;
            }

            this.canvas.style.width = `${newWidth}px`;
            this.canvas.style.height = `${newHeight}px`;
        };

        window.addEventListener('resize', this._resizeHandler);
        this._resizeHandler();
    }
    // Metodo legacy mantenuto per compatibilità, delega al SceneManager
    // NUOVO METODO (Pulito e agganciato al Manager)
    setScene(name, data = null) {
        // Svuota le entità globali ad ogni cambio di scena per evitare residui
        this.entities = [];

        // Delega il cambio al gestore delle scene
        if (this.scenes) {
            this.scenes.change(name, data);
        }
    }

    lockOrientation() {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {
                // Silentemente ignorato su dispositivi desktop che non supportano il lock dell'orientamento
            });
        }
    }

    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            console.log('BeeEngine: Gioco in pausa');
        }
    }

    resume() {
        // Se il motore è stato fermato (stop()), permetti di riavviare se abbiamo i callback salvati
        if (!this.isRunning) {
            if (this.update || this.render) {
                this.isRunning = true;
                this.isPaused = false;
                this.lastTime = performance.now();
                console.log('BeeEngine: Gioco ripreso (da stop)');
                this.animationFrameId = requestAnimationFrame((timestamp) => this.loop(timestamp));
            } else {
                console.warn('BeeEngine: impossibile riprendere, nessun callback di update/render disponibile. Usa start() con i callback.');
            }
            return;
        }

        if (this.isRunning && this.isPaused) {
            this.isPaused = false;
            this.lastTime = performance.now();
            console.log('BeeEngine: Gioco ripreso');
            this.animationFrameId = requestAnimationFrame((timestamp) => this.loop(timestamp));
        }
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        console.log('BeeEngine: Gioco fermato');
    }

    destroy() {
        this.stop();
        this.entities = [];
        this.events = {};

        if (this._startAudioHandler) {
            window.removeEventListener('click', this._startAudioHandler);
            window.removeEventListener('keydown', this._startAudioHandler);
        }

        // 🌟 Pulizia dell'evento di resize se attivo
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }

        console.log('BeeEngine: Risorse liberate e motore distrutto.');
    }

    start(updateCallback, renderCallback) {
        if (this.isRunning) return;

        // Se vengono passati callback, salvali per poter riavviare dopo uno stop
        if (typeof updateCallback === 'function') this._savedUpdate = updateCallback;
        if (typeof renderCallback === 'function') this._savedRender = renderCallback;

        // Usa i callback salvati se non passati come argomenti
        this.update = typeof updateCallback === 'function' ? updateCallback : this._savedUpdate;
        this.render = typeof renderCallback === 'function' ? renderCallback : this._savedRender;

        if (!this.update && !this.render && !this.scenes) {
            console.warn('BeeEngine: Nessun callback di update/render o SceneManager fornito. Usa start(update, render) o aggiungi le scene.');
            return;
        }

        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame((timestamp) => this.loop(timestamp));
        console.log('BeeEngine: Gioco avviato');
    }

    loop(timestamp) {
        // 1. Se il gioco è stoppato, esce
        if (!this.isRunning) return;

        // 2. Se è in PAUSA, ricarica il frame successivo ma non aggiorna né disegna
        if (this.isPaused) {
            this.animationFrameId = requestAnimationFrame((ts) => this.loop(ts));
            return;
        }

        // 3. Calcolo e clamping del deltaTime
        if (!this.lastTime) this.lastTime = timestamp;
        let deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        deltaTime = Math.min(deltaTime, 0.05);

        // --- UPDATE ---
        // Il SceneManager si occupa di aggiornare la scena attiva!
        // In UPDATE:
        if (this.scenes) {
            this.scenes.update(deltaTime, this.input);
        }
        // Aggiorna eventuali entità globali
        this.updateEntities(deltaTime, this.input);

        if (this.update) {
            this.update(deltaTime, this.input);
        }

        // --- RENDER (con frustum culling tramite drawEntity / BeeCamera) ---
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        if (this.camera) {
            this.camera.apply(this.ctx);
        }

        // Il SceneManager disegna la scena attiva!
        if (this.scenes) {
            this.scenes.draw(this.ctx);
        }

        this.renderEntities(this.ctx);

        if (this.render) {
            this.render(this.ctx);
        }

        this.ctx.restore();

        if (this.touchControls) {
            this.touchControls.draw(this.ctx);
        }

        // Reset degli input del frame
        this.input.endFrame();

        // Richiesta del prossimo frame
        this.animationFrameId = requestAnimationFrame((ts) => this.loop(ts));
    }
    on(evento, callback) {
        if (!this.events[evento]) this.events[evento] = [];
        this.events[evento].push(callback);
    }

    emit(evento, dati) {
        if (this.events[evento]) {
            this.events[evento].forEach(callback => callback(dati));
        }
    }
    off(evento, callback) {
        if (!this.events[evento]) return;
        this.events[evento] = this.events[evento].filter(cb => cb !== callback);
    }

    addEntity(entity) { this.entities.push(entity); }

    updateEntities(dt, input) {
        let hasDestroyed = false;
        for (let i = 0; i < this.entities.length; i++) {
            const e = this.entities[i];
            if (e.update) e.update(dt, input, this);
            if (e.destroyed) hasDestroyed = true;
        }

        if (hasDestroyed) {
            this.entities = this.entities.filter(e => !e.destroyed);
        }
    }

    renderEntities(ctx) {
        for (let i = 0; i < this.entities.length; i++) {
            this.drawEntity(ctx, this.entities[i]);
        }
    }

    /**
     * Bounds di disegno in coordinate mondo (collider se presente, altrimenti x/y/width/height).
     */
    getEntityDrawBounds(entity) {
        if (!entity) return null;
        if (entity.collider) {
            return {
                x: entity.collider.x,
                y: entity.collider.y,
                width: entity.collider.width,
                height: entity.collider.height
            };
        }
        return {
            x: entity.x,
            y: entity.y,
            width: entity.width ?? 0,
            height: entity.height ?? 0
        };
    }

    /**
     * Verifica visibilità in coordinate mondo rispetto alla telecamera (o al canvas se assente).
     */
    isRectVisibleInView(x, y, width, height) {
        if (width <= 0 || height <= 0) return false;

        // 1. Se hai una telecamera configurata, usiamo la telecamera!
        if (this.camera && typeof this.camera.isRectVisible === 'function') {
            return this.camera.isRectVisible(x, y, width, height);
        }

        // 2. Se usi la telecamera manuale (cameraX)
        const cameraX = this.cameraX || 0;

        // 3. Permettiamo al disegno di estendersi molto più a destra (es. fino a 10.000 pixel!)
        return (
            x < cameraX + 10000 &&
            x + width > cameraX &&
            y < this.canvas.height &&
            y + height > 0
        );
    }

    /**
     * Disegna un'entità solo se rientra nel frustum della telecamera (culling).
     */
    drawEntity(ctx, entity) {
        if (!entity || entity.visible === false || !entity.draw) return;

        const bounds = this.getEntityDrawBounds(entity);
        if (!this.isRectVisibleInView(bounds.x, bounds.y, bounds.width, bounds.height)) {
            return;
        }

        entity.draw(ctx, this);
    }

    checkCollision(rect1, rect2) {
        return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y);
    }

    async loadAsset(type, name, src) {
        if (type === 'image') return this.assets.loadImage(name, src);
        if (type === 'audio') return this.assets.loadSound(name, src);
        if (type === 'json' && typeof this.assets.loadJSON === 'function') {
            return this.assets.loadJSON(name, src);
        }
        return Promise.reject(new Error(`Tipo di asset non supportato: ${type}`));
    }

    async loadManifest(manifest) {
        if (typeof this.assets.loadManifest === 'function') {
            return this.assets.loadManifest(manifest);
        }
        // Fallback se il manager non ha ancora il metodo nativo
        const promises = manifest.map(a => this.loadAsset(a.type, a.name, a.src));
        return Promise.all(promises);
    }

    getAsset(name) {
        if (typeof this.assets.getAsset === 'function') {
            return this.assets.getAsset(name);
        }
        return this.assets.getImage(name) || this.assets.getSound(name);
    }

    playSound(audioAsset) {
        if (!audioAsset) return;
        const soundClone = audioAsset.cloneNode();
        soundClone.play().catch((err) => console.warn("Audio bloccato:", err));
    }

    playMusic(audioAsset, volume = 0.5) {
        if (!audioAsset) return;
        audioAsset.loop = true;
        audioAsset.volume = volume;
        audioAsset.play().catch(() => {
            // Salviamo la funzione per poterla rimuovere nel destroy()
            this._startAudioHandler = () => {
                audioAsset.play();
                window.removeEventListener('click', this._startAudioHandler);
                window.removeEventListener('keydown', this._startAudioHandler);
            };
            window.addEventListener('click', this._startAudioHandler);
            window.addEventListener('keydown', this._startAudioHandler);
        });
    }
}

export {
    BeeSceneManager,
    BeeSave,
    BeeParticleSystem,
    BeeTilemap,
    BeeButton,
    BeeText,
    BeeTimer,
    BeeRectCollider,
    BeeAssetManager,
    BeeMenuScene,
    BeeBullet,
    BeePlayer,
    BeeEntity,
    BeeGrid,
    BeeCamera,
    BeeSprite,
    BeeTouchControls,
    BeeInput,
    BeeNemico,
    BeeEnemyShooter,
    BeePlatform,
    BeeCollectible,
    BeeCollisionSystem,
    BeeSpriteSheet,
    BeeAnimatedSprite,
    BeeTilemapLoader,
};

/** 🌟 Il ruolo di BeeEngine
 * È il cuore del motore di gioco.
 * Gestisce l'aggiornamento e il rendering delle entità.
 * Gestisce i controlli e gli input.
 * Carica e gestisce le risorse.
 * Coordina l'intero ciclo di vita dell'applicazione: aggiorna la logica (Update),
 * renderizza la grafica (Draw), gestisce gli input e carica le risorse (immagini/suoni).
 */




