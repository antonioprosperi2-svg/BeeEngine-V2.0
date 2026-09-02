// ==========================================
// 1. CORE & BASE SYSTEMS (src/core/)
// ==========================================
import { BeeAssetManager } from './src/core/BeeAssetManager.js';
import { BeeEntity, BEE_ENTITY_DEFAULTS } from './src/core/BeeEntity.js';
import { BeeSceneManager } from './src/core/BeeSceneManager.js';
import { BeeSave } from './src/core/BeeSave.js';
import { BeeTimer } from './src/core/BeeTimer.js';
import { BeeGrid } from './src/core/BeeGrid.js';

// ==========================================
// 2. INPUT & TOUCH CONTROLS (src/input/)
// ==========================================
import { BeeInput } from './src/input/BeeInput.js';
import { BeeTouchControls } from './src/input/BeeTouchControls.js';
import { BeeTouchButton } from './src/input/BeeTouchButton.js';
import { BeeVirtualDPad } from './src/input/BeeVirtualDPad.js';
import { BeeJoystick } from './src/input/BeeJoystick.js';
import { BeeButton } from './src/input/BeeButton.js';

// ==========================================
// 3. GRAPHICS & RENDERING (src/graphics/)
// ==========================================
import { BeeSprite } from './src/graphics/BeeSprite.js';
import { BeeSpriteSheet } from './src/graphics/BeeSpriteSheet.js';
import { BeeAnimatedSprite } from './src/graphics/BeeAnimatedSprite.js';
import { BeeCamera } from './src/graphics/BeeCamera.js';
import { BeeParticleSystem } from './src/graphics/BeeParticleSystem.js';
import { BeeTilemap } from './src/graphics/BeeTilemap.js';
import { BeeTilemapLoader } from './src/graphics/BeeTilemapLoader.js';
import { BeeText } from './src/graphics/BeeText.js';

// ==========================================
// 4. PHYSICS & COLLISIONS (src/physics/)
// ==========================================
import { BeeCollisionSystem } from './src/physics/BeeCollisionSystem.js';
import { BeeRectCollider } from './src/physics/BeeRectCollider.js';
import { BeeBullet } from './src/physics/BeeBullet.js';

// ==========================================
// 5. GAMEPLAY & ENTITIES (src/gameplay/)
// ==========================================
import { BeePlayer } from './src/gameplay/BeePlayer.js';
import { BeeEnemy } from './src/gameplay/BeeEnemy.js';
import { BeeEnemyShooter } from './src/gameplay/BeeEnemyShooter.js';
import { BeeCollectible } from './src/gameplay/BeeCollectible.js';
import { BeePlatform } from './src/gameplay/BeePlatform.js';
import { BeeMenuScene } from './src/gameplay/BeeMenuScene.js';

// Backward compatibility alias
const BeeNemico = BeeEnemy;

export class BeeEngine {
    constructor(canvasId, width = 800, height = 600) {
        this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
        if (!this.canvas) {
            throw new Error(`BeeEngine: Canvas element not found: ${canvasId}`);
        }
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = width;
        this.canvas.height = height;

        this.assets = new BeeAssetManager();
        this.input = new BeeInput(this.canvas);
        this.scenes = new BeeSceneManager(this);

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

        this._startAudioHandler = null;
        this._resizeHandler = null;
        this.touchControls = null;
    }

    enableTouchControls() {
        if (this.touchControls && typeof this.touchControls.destroy === 'function') {
            this.touchControls.destroy();
        }
        this.touchControls = new BeeTouchControls(this.canvas, this.input);
        return this.touchControls;
    }

    enableJoystick(options = {}) {
        if (this.touchControls && typeof this.touchControls.destroy === 'function') {
            this.touchControls.destroy();
        }
        this.touchControls = new BeeJoystick(this.canvas, this.input);
        return this.touchControls;
    }

    createSpriteSheet(image, frameWidth, frameHeight, config = {}) {
        return new BeeSpriteSheet(image, frameWidth, frameHeight, config);
    }

    createAnimatedSprite(spriteSheet, config = {}) {
        return new BeeAnimatedSprite(spriteSheet, config);
    }

    enableAutoResize(baseWidth = this.canvas.width, baseHeight = this.canvas.height, reservedHeight = 0) {
        this.canvas.style.display = 'block';
        this.canvas.style.margin = '0 auto';

        this._resizeHandler = () => {
            const windowWidth = window.innerWidth;
            const availableHeight = Math.max(100, window.innerHeight - reservedHeight);

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

    setScene(name, data = null) {
        this.entities = [];
        if (this.scenes) {
            this.scenes.change(name, data);
        }
    }

    lockOrientation(orientation = 'landscape') {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock(orientation).catch(() => {});
        }
    }

    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
        }
    }

    resume() {
        if (!this.isRunning) {
            if (this.update || this.render) {
                this.isRunning = true;
                this.isPaused = false;
                this.lastTime = performance.now();
                this.animationFrameId = requestAnimationFrame((timestamp) => this.loop(timestamp));
            }
            return;
        }

        if (this.isRunning && this.isPaused) {
            this.isPaused = false;
            this.lastTime = performance.now();
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
    }

    destroy() {
        this.stop();
        this.entities = [];
        this.events = {};

        if (this._startAudioHandler) {
            window.removeEventListener('click', this._startAudioHandler);
            window.removeEventListener('keydown', this._startAudioHandler);
        }

        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
    }

    start(updateCallback, renderCallback) {
        if (this.isRunning) return;

        if (typeof updateCallback === 'function') this._savedUpdate = updateCallback;
        if (typeof renderCallback === 'function') this._savedRender = renderCallback;

        this.update = typeof updateCallback === 'function' ? updateCallback : this._savedUpdate;
        this.render = typeof renderCallback === 'function' ? renderCallback : this._savedRender;

        if (!this.update && !this.render && !this.scenes) {
            console.warn('BeeEngine: No update/render callback or SceneManager provided.');
            return;
        }

        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame((timestamp) => this.loop(timestamp));
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        if (this.isPaused) {
            this.animationFrameId = requestAnimationFrame((ts) => this.loop(ts));
            return;
        }

        if (!this.lastTime) this.lastTime = timestamp;
        let deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        deltaTime = Math.min(deltaTime, 0.05);

        if (this.scenes) {
            this.scenes.update(deltaTime, this.input);
        }

        this.updateEntities(deltaTime, this.input);

        if (this.update) {
            this.update(deltaTime, this.input);
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        if (this.camera) {
            this.camera.apply(this.ctx);
        }

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

        this.input.endFrame();
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
            x: typeof entity.worldX === 'number' ? entity.worldX : entity.x,
            y: typeof entity.worldY === 'number' ? entity.worldY : entity.y,
            width: entity.width ?? 0,
            height: entity.height ?? 0
        };
    }

    isRectVisibleInView(x, y, width, height) {
        if (width <= 0 || height <= 0) return false;

        if (this.camera && typeof this.camera.isRectVisible === 'function') {
            return this.camera.isRectVisible(x, y, width, height);
        }

        const cameraX = this.cameraX || 0;
        const cameraY = this.cameraY || 0;

        return (
            x < cameraX + this.canvas.width &&
            x + width > cameraX &&
            y < cameraY + this.canvas.height &&
            y + height > cameraY
        );
    }

    drawEntity(ctx, entity) {
        if (!entity || entity.visible === false || entity.destroyed) return;

        if (typeof entity.draw === 'function') {
            const bounds = this.getEntityDrawBounds(entity);
            const hasSize = bounds.width > 0 && bounds.height > 0;
            if (!hasSize || this.isRectVisibleInView(bounds.x, bounds.y, bounds.width, bounds.height)) {
                entity.draw(ctx, this);
            }
        }

        const children = entity.children;
        if (!children || children.length === 0) return;
        for (let i = 0; i < children.length; i++) {
            this.drawEntity(ctx, children[i]);
        }
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
        return Promise.reject(new Error(`Unsupported asset type: ${type}`));
    }

    async loadManifest(manifest) {
        if (typeof this.assets.loadManifest === 'function') {
            return this.assets.loadManifest(manifest);
        }
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
        soundClone.play().catch((err) => console.warn("Audio blocked:", err));
    }

    playMusic(audioAsset, volume = 0.5) {
        if (!audioAsset) return;
        audioAsset.loop = true;
        audioAsset.volume = volume;
        audioAsset.play().catch(() => {
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
    BEE_ENTITY_DEFAULTS,
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
    BeeEnemy,
    BeeNemico,
    BeeEnemyShooter,
    BeePlatform,
    BeeCollectible,
    BeeCollisionSystem,
    BeeSpriteSheet,
    BeeAnimatedSprite,
    BeeTilemapLoader,
    BeeJoystick,
    BeeTouchButton,
    BeeVirtualDPad,
};
