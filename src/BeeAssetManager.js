export class BeeAssetManager {
    constructor() {
        this.images = new Map();
        this.sounds = new Map();
    }
    async loadManifest(manifest) {
        const promises = manifest.map(item => {
            if (item.type === 'image') return this.loadImage(item.name, item.src);
            if (item.type === 'audio') return this.loadSound(item.name, item.src);
            return Promise.reject(new Error(`Tipo di asset non supportato: ${item.type}`));
        });
        await Promise.all(promises);
        console.log("🐝 BeeAssetManager: Tutte le risorse del manifest sono state caricate!");
    }

    // Aggiungi questo metodo alla tua classe BeeAssetManager
    async loadAssets(assetList) {
        const promises = [];
        if (assetList.images) assetList.images.forEach(item => promises.push(this.loadImage(item.name, item.src)));
        if (assetList.sounds) assetList.sounds.forEach(item => promises.push(this.loadSound(item.name, item.src)));
        await Promise.all(promises);
        console.log("Tutte le risorse caricate!");
    }

    loadImage(name, src) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                this.images.set(name, img);
                resolve(img);
            };

            img.onerror = () => {
                reject(new Error(`Errore caricamento immagine: ${src}`));
            };

            img.src = src;
        });
    }

    getImage(name) {
        return this.images.get(name);
    }

    loadSound(name, src) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();

            audio.oncanplaythrough = () => {
                this.sounds.set(name, audio);
                resolve(audio);
            };

            audio.onerror = () => {
                reject(new Error(`Errore caricamento audio: ${src}`));
            };

            audio.src = src;
        });
    }

    getSound(name) {
        return this.sounds.get(name);
    }

    getAsset(name) {
        return this.images.get(name) || this.sounds.get(name);
    }

    playSound(name, volume = 1) {
        const sound = this.sounds.get(name);

        if (!sound) return;

        const clone = sound.cloneNode();
        clone.volume = volume;
        clone.play();
    }
}
/** 🌟* Classe BeeAssetManager: Gestisce il caricamento centralizzato di tutte le risorse.
 * Carica in memoria file multimediali (immagini, sprite, tracce audio ed effetti sonori) 
 * prima dell'avvio del gioco, rendendoli subito accessibili a tutte le altre entità.
 */
