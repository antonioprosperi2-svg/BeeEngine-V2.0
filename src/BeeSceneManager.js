export class BeeSceneManager {
    constructor(engine) {
        this.engine = engine;
        this.ctx = engine.ctx;
        this.scenes = new Map();
        this.currentScene = null;
        this.currentSceneName = null;
    }

    add(name, scene) {
        if (!scene.entities) {
            scene.entities = [];
        }

        scene.engine = this.engine;

        this.scenes.set(name, scene);
    }

    change(name, data = null) {
        if (!this.scenes.has(name)) {
            throw new Error(`Scena non trovata: ${name}`);
        }

        if (this.currentScene) {
            if (this.currentScene.onExit) {
                this.currentScene.onExit();
            } else if (this.currentScene.exit) {
                this.currentScene.exit();
            }
        }

        this.currentScene = this.scenes.get(name);
        this.currentSceneName = name;

        // Compatibilità con engine.currentScene, se nel motore lo usi ancora
        this.engine.currentScene = this.currentScene;

        this.currentScene.engine = this.engine;

        if (!this.currentScene.entities) {
            this.currentScene.entities = [];
        }

        if (this.currentScene.onEnter) {
            this.currentScene.onEnter(data);
        } else if (this.currentScene.enter) {
            this.currentScene.enter(data);
        }
    }

    addEntity(entity) {
        if (!this.currentScene) return;

        entity.engine = this.engine;
        entity.scene = this.currentScene;

        this.currentScene.entities.push(entity);
    }

    update(dt) {
        if (!this.currentScene) return;

        if (this.currentScene.update) {
            this.currentScene.update(dt, this.engine.input);
        }

        for (const entity of this.currentScene.entities) {
            if (entity.active !== false && entity.update) {
                entity.update(dt, this.engine.input);
            }
        }

        this.currentScene.entities = this.currentScene.entities.filter(
            entity => !entity.destroyed
        );
    }

    draw(ctx = this.ctx) {
        if (!this.currentScene) return;

        if (this.currentScene.draw) {
            this.currentScene.draw(ctx, this.engine);
        }

        if (this.currentScene.entities) {
            for (const entity of this.currentScene.entities) {
                this.engine.drawEntity(ctx, entity);
            }
        }
    }

    getCurrentScene() {
        return this.currentScene;
    }

    getCurrentSceneName() {
        return this.currentSceneName;
    }
}

/** 🌟 * Classe BeeSceneManager: Gestisce la transizione e il rendering delle scene nel gioco.
 * Permette di organizzare il contenuto del gioco in diverse "scene" (menu, livelli, ecc.),
 * caricando e disegnando gli elementi appropriati per ogni stato del gioco.
 /**
 * Classe BeeSceneManager: Coordina il passaggio tra le diverse schermate (scene) del gioco.
 * Controlla quale scena deve essere attiva in ogni momento, gestendo la transizione fluida
 * dal Menu Principale (BeeMenuScene), alla partita vera e propria, fino al Game Over.
 */
