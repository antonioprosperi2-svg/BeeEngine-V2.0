export class BeeSave {
    static save(key, value) {
        localStorage.setItem(
            BeeSave.prefix + key,
            JSON.stringify(value)
        );
    }

    static load(key, defaultValue = null) {
        const data = localStorage.getItem(BeeSave.prefix + key);

        if (data === null) {
            return defaultValue;
        }

        try {
            return JSON.parse(data);
        } catch (err) {
            return defaultValue;
        }
    }

    static remove(key) {
        localStorage.removeItem(BeeSave.prefix + key);
    }

    static exists(key) {
        return localStorage.getItem(BeeSave.prefix + key) !== null;
    }

    static clearAll() {
        const keys = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            if (key.startsWith(BeeSave.prefix)) {
                keys.push(key);
            }
        }

        for (const key of keys) {
            localStorage.removeItem(key);
        }
    }
}
BeeSave.prefix = "BeeSave:";
/** 🌟 * Classe BeeSave: Gestisce il sistema di salvataggio e caricamento dei dati di gioco.
 * Utilizza la memoria del browser (LocalStorage) per salvare i record, il livello raggiunto
 * o le preferenze dell'utente, evitando di perdere i progressi alla chiusura del gioco.
 */
