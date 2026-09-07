/**
 * BeeSave — persistenza DTO su storage del browser.
 *
 * Non è un `localStorage.setItem` nudo. Ogni record è un envelope
 *   { __bee, v, t, d }
 * così missing, corrupt e primo avvio non sono la stessa cosa.
 *
 * Solo JSON piatto: niente entità vive, funzioni, cicli.
 * Stessa origin = stesso disco: `configure({ namespace })` all'avvio.
 */

export const BEE_SAVE_DEFAULTS = Object.freeze({
    prefix: 'BeeSave:',
    namespace: '',
    version: 1,
    onCorrupt: 'keep',
    fallback: 'memory',
    resaveOnMigrate: false
});

export const BEE_SAVE_STATUS = Object.freeze({
    OK: 'ok',
    MISSING: 'missing',
    CORRUPT: 'corrupt',
    UNAVAILABLE: 'unavailable',
    REJECTED: 'rejected',
    QUOTA: 'quota'
});

const ENVELOPE_MARK = 1;

function createMemoryStorage() {
    const map = new Map();
    return {
        get length() {
            return map.size;
        },
        key(index) {
            if (index < 0 || index >= map.size) return null;
            let i = 0;
            for (const key of map.keys()) {
                if (i === index) return key;
                i++;
            }
            return null;
        },
        getItem(key) {
            return map.has(key) ? map.get(key) : null;
        },
        setItem(key, value) {
            map.set(String(key), String(value));
        },
        removeItem(key) {
            map.delete(key);
        }
    };
}

function probeLocalStorage() {
    try {
        const storage = globalThis.localStorage;
        if (!storage) return null;
        const probe = '__bee_save_probe__';
        storage.setItem(probe, '1');
        storage.removeItem(probe);
        return storage;
    } catch {
        return null;
    }
}

function isQuotaError(error) {
    if (!error) return false;
    return (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22 ||
        error.code === 1014
    );
}

function assertDto(value, path = '$') {
    if (value === undefined) {
        return `${path} is undefined — JSON cannot store it; use null`;
    }
    if (typeof value === 'function') {
        return `${path} is a function — save a DTO, not live objects`;
    }
    if (typeof value === 'symbol' || typeof value === 'bigint') {
        return `${path} is ${typeof value} — not JSON`;
    }
    if (value === null || typeof value !== 'object') {
        return null;
    }
    if (value instanceof Date) {
        return null;
    }

    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) {
        const name = value.constructor && value.constructor.name ? value.constructor.name : 'class';
        return `${path} is a live ${name} — serialize a plain DTO`;
    }

    const seen = new WeakSet();
    const walk = (node, nodePath) => {
        if (node === undefined) {
            return `${nodePath} is undefined`;
        }
        if (typeof node === 'function') {
            return `${nodePath} is a function`;
        }
        if (typeof node === 'symbol' || typeof node === 'bigint') {
            return `${nodePath} is ${typeof node}`;
        }
        if (node === null || typeof node !== 'object') {
            return null;
        }
        if (node instanceof Date) {
            return null;
        }
        if (seen.has(node)) {
            return `${nodePath} is circular`;
        }
        seen.add(node);

        const nodeProto = Object.getPrototypeOf(node);
        if (nodeProto !== Object.prototype && nodeProto !== Array.prototype && nodeProto !== null) {
            const name = node.constructor && node.constructor.name ? node.constructor.name : 'class';
            return `${nodePath} is a live ${name}`;
        }

        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                const err = walk(node[i], `${nodePath}[${i}]`);
                if (err) return err;
            }
            return null;
        }

        const keys = Object.keys(node);
        for (let i = 0; i < keys.length; i++) {
            const err = walk(node[keys[i]], `${nodePath}.${keys[i]}`);
            if (err) return err;
        }
        return null;
    };

    return walk(value, path);
}

function result(status, extra) {
    return {
        ok: status === BEE_SAVE_STATUS.OK,
        status,
        key: extra.key ?? '',
        storageKey: extra.storageKey ?? '',
        value: extra.value,
        version: extra.version ?? 0,
        savedAt: extra.savedAt ?? 0,
        legacy: extra.legacy === true,
        message: extra.message ?? ''
    };
}

export class BeeSaveStore {
    /**
     * @param {Partial<typeof BEE_SAVE_DEFAULTS> & { storage?: Storage | null, migrate?: Function }} [options]
     */
    constructor(options = {}) {
        const cfg = { ...BEE_SAVE_DEFAULTS, ...options };

        this.prefix = cfg.prefix;
        this.namespace = cfg.namespace;
        this.version = cfg.version;
        this.onCorrupt = cfg.onCorrupt;
        this.fallback = cfg.fallback;
        this.resaveOnMigrate = cfg.resaveOnMigrate;
        this.migrate = typeof options.migrate === 'function' ? options.migrate : null;

        this.#injected = options.storage !== undefined;
        this.#disk = this.#injected ? options.storage : probeLocalStorage();
        this.#memory = createMemoryStorage();
        this.lastRead = null;
        this.lastWrite = null;
    }

    #injected;
    #disk;
    #memory;

    get available() {
        return this.#backend() !== null;
    }

    get persistent() {
        return this.#disk !== null;
    }

    configure(options = {}) {
        if (options.prefix != null) this.prefix = String(options.prefix);
        if (options.namespace != null) this.namespace = String(options.namespace);
        if (options.version != null) this.version = Number(options.version) || 1;
        if (options.onCorrupt != null) this.onCorrupt = options.onCorrupt;
        if (options.fallback != null) this.fallback = options.fallback;
        if (options.resaveOnMigrate != null) this.resaveOnMigrate = options.resaveOnMigrate === true;
        if (typeof options.migrate === 'function') this.migrate = options.migrate;
        if (options.storage !== undefined) {
            this.#injected = true;
            this.#disk = options.storage;
        }
        return this;
    }

    #backend() {
        if (this.#disk) return this.#disk;
        if (this.fallback === 'memory') return this.#memory;
        return null;
    }

    storageKey(key) {
        const id = String(key ?? '');
        const ns = this.namespace ? `${this.namespace}:` : '';
        return `${this.prefix}${ns}${id}`;
    }

    #empty(status, key, message) {
        return result(status, {
            key,
            storageKey: key ? this.storageKey(key) : '',
            value: undefined,
            message
        });
    }

    save(key, value) {
        const id = String(key ?? '');
        if (!id) {
            this.lastWrite = this.#empty(BEE_SAVE_STATUS.REJECTED, id, 'empty key');
            return this.lastWrite;
        }

        const dtoError = assertDto(value);
        if (dtoError) {
            this.lastWrite = this.#empty(BEE_SAVE_STATUS.REJECTED, id, dtoError);
            return this.lastWrite;
        }

        const backend = this.#backend();
        if (!backend) {
            this.lastWrite = this.#empty(BEE_SAVE_STATUS.UNAVAILABLE, id, 'storage unavailable');
            return this.lastWrite;
        }

        const envelope = {
            __bee: ENVELOPE_MARK,
            v: this.version,
            t: Date.now(),
            d: value
        };

        let serialized;
        try {
            serialized = JSON.stringify(envelope);
        } catch (error) {
            this.lastWrite = this.#empty(BEE_SAVE_STATUS.REJECTED, id, error.message);
            return this.lastWrite;
        }

        try {
            backend.setItem(this.storageKey(id), serialized);
        } catch (error) {
            const status = isQuotaError(error) ? BEE_SAVE_STATUS.QUOTA : BEE_SAVE_STATUS.UNAVAILABLE;
            this.lastWrite = this.#empty(status, id, error.message);
            return this.lastWrite;
        }

        this.lastWrite = result(BEE_SAVE_STATUS.OK, {
            key: id,
            storageKey: this.storageKey(id),
            value,
            version: this.version,
            savedAt: envelope.t
        });
        return this.lastWrite;
    }

    read(key) {
        const id = String(key ?? '');
        if (!id) {
            this.lastRead = this.#empty(BEE_SAVE_STATUS.REJECTED, id, 'empty key');
            return this.lastRead;
        }

        const backend = this.#backend();
        if (!backend) {
            this.lastRead = this.#empty(BEE_SAVE_STATUS.UNAVAILABLE, id, 'storage unavailable');
            return this.lastRead;
        }

        let raw;
        try {
            raw = backend.getItem(this.storageKey(id));
        } catch (error) {
            this.lastRead = this.#empty(BEE_SAVE_STATUS.UNAVAILABLE, id, error.message);
            return this.lastRead;
        }

        if (raw === null) {
            this.lastRead = this.#empty(BEE_SAVE_STATUS.MISSING, id, 'missing');
            return this.lastRead;
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            this.lastRead = this.#corrupt(id, backend, error.message);
            return this.lastRead;
        }

        const envelope = parsed && parsed.__bee === ENVELOPE_MARK && Object.prototype.hasOwnProperty.call(parsed, 'd');
        let value = envelope ? parsed.d : parsed;
        let version = envelope ? Number(parsed.v) || 0 : 0;
        const savedAt = envelope ? Number(parsed.t) || 0 : 0;
        const legacy = !envelope;

        if (this.migrate && version < this.version) {
            try {
                value = this.migrate(value, version, this.version, id);
                version = this.version;
                if (this.resaveOnMigrate) {
                    this.save(id, value);
                }
            } catch (error) {
                this.lastRead = this.#corrupt(id, backend, error.message);
                return this.lastRead;
            }
        }

        this.lastRead = result(BEE_SAVE_STATUS.OK, {
            key: id,
            storageKey: this.storageKey(id),
            value,
            version,
            savedAt,
            legacy
        });
        return this.lastRead;
    }

    #corrupt(key, backend, message) {
        if (this.onCorrupt === 'remove') {
            try {
                backend.removeItem(this.storageKey(key));
            } catch {
                // il record resta; lo status è comunque corrupt
            }
        }
        return result(BEE_SAVE_STATUS.CORRUPT, {
            key,
            storageKey: this.storageKey(key),
            value: undefined,
            message
        });
    }

    /**
     * Valore se il record è valido (anche `null` salvato).
     * Chiave assente → default. Corrupt non è un primo avvio: usa `read()`.
     */
    load(key, defaultValue = null) {
        const record = this.read(key);
        if (record.status === BEE_SAVE_STATUS.OK) {
            return record.value;
        }
        return defaultValue;
    }

    remove(key) {
        const id = String(key ?? '');
        const backend = this.#backend();
        if (!backend || !id) {
            return false;
        }
        try {
            backend.removeItem(this.storageKey(id));
            return true;
        } catch {
            return false;
        }
    }

    /** Record valido e leggibile. Un JSON rotto non conta. */
    exists(key) {
        return this.read(key).status === BEE_SAVE_STATUS.OK;
    }

    /** Chiave presente sul disco, anche se corrotta. */
    has(key) {
        const id = String(key ?? '');
        const backend = this.#backend();
        if (!backend || !id) return false;
        try {
            return backend.getItem(this.storageKey(id)) !== null;
        } catch {
            return false;
        }
    }

    clearAll() {
        const backend = this.#backend();
        if (!backend) return 0;

        const keys = [];
        const root = this.storageKey('');
        let length = 0;
        try {
            length = backend.length;
        } catch {
            return 0;
        }

        for (let i = 0; i < length; i++) {
            let storageKey = null;
            try {
                storageKey = backend.key(i);
            } catch {
                continue;
            }
            if (storageKey && storageKey.startsWith(root)) {
                keys.push(storageKey);
            }
        }

        let removed = 0;
        for (let i = 0; i < keys.length; i++) {
            try {
                backend.removeItem(keys[i]);
                removed++;
            } catch {
                // passa oltre
            }
        }
        return removed;
    }

    slotKey(index) {
        return `slot:${Number(index) || 0}`;
    }

    saveSlot(index, value) {
        return this.save(this.slotKey(index), value);
    }

    readSlot(index) {
        return this.read(this.slotKey(index));
    }

    loadSlot(index, defaultValue = null) {
        return this.load(this.slotKey(index), defaultValue);
    }
}

const defaultStore = new BeeSaveStore();

export class BeeSave {
    static get prefix() {
        return defaultStore.prefix;
    }

    static set prefix(value) {
        defaultStore.prefix = String(value || BEE_SAVE_DEFAULTS.prefix);
    }

    static get store() {
        return defaultStore;
    }

    static create(options) {
        return new BeeSaveStore(options);
    }

    static configure(options) {
        defaultStore.configure(options);
        return BeeSave;
    }

    static save(key, value) {
        return defaultStore.save(key, value);
    }

    static read(key) {
        return defaultStore.read(key);
    }

    static load(key, defaultValue = null) {
        return defaultStore.load(key, defaultValue);
    }

    static remove(key) {
        return defaultStore.remove(key);
    }

    static exists(key) {
        return defaultStore.exists(key);
    }

    static has(key) {
        return defaultStore.has(key);
    }

    static clearAll() {
        return defaultStore.clearAll();
    }

    static saveSlot(index, value) {
        return defaultStore.saveSlot(index, value);
    }

    static readSlot(index) {
        return defaultStore.readSlot(index);
    }

    static loadSlot(index, defaultValue = null) {
        return defaultStore.loadSlot(index, defaultValue);
    }
}
