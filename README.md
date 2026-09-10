![BeeEngine](https://raw.githubusercontent.com/antonioprosperi2-svg/BeeEngine-V2.0/main/Gemini_Generated_Image_pz9goopz9goopz9g.jpg)
# 🐝 Motore di gioco 2D BeeEngine (v2.5.0 Professional)

BeeEngine è un motore di gioco 2D leggero, modulare e altamente ottimizzato scritto in puro JavaScript moderno (ES Modules) per HTML5 Canvas.
La versione 2.5 introduce **BeeTransform**: scena grafo affine (posizione, rotazione, scala, pivot), non un `world = parent.x + x`.

## 📁 Struttura del Progetto Aggiornata

```text
BeeEngine-V2.5/
├── index.html                  # Punto di ingresso HTML e configurazione Canvas
├── index.js                    # Barrel ESM (re-export di BeeEngine.js)
├── main.js                     # Demo visiva (BeeSpatialHash: stormo + esplosione)
├── BeeEngine.js                # Il CUORE del motore (Core Loop & System Coordinator)
├── README.md                   # Documentazione ufficiale e specifiche tecniche
├── package.json                # Manifest di configurazione per la pubblicazione NPM
├── tsconfig.json               # Configurazione TypeScript per i controlli dell'IDE
├── index.d.ts                  # Definizioni di tipo globali per IntelliSense e TypeScript
├── assets/                     # Gestione centralizzata e ordinata delle risorse
│   ├── audio/                  # Effetti sonori (.mp3) e musiche di sottofondo
│   └── images/                 # Texture dei personaggi (.png), sprite e sfondi
└── src/
    ├── core/                   # BeeTransform, BeeTime, BeeEntity, BeeTimer, scene, asset, save, grid
    ├── gameplay/               # Player, enemy, platform, collectible, menu
    ├── graphics/               # Camera, sprite, tilemap, text, particles
    ├── input/                  # Tastiera, mouse, joystick, touch, button
    ├── physics/                # BeeSpatialHash, BeePhysicsWorld, BeeRigidBody, AABB groups
    └── debug/                  # BeeLadybug: overlay e hitbox
```

## ⏱ BeeTime (v2.3.0) — orologio di motore

`BeeTime` è l'orologio unico del core loop. Ogni frame fa **un** `tick(timestamp)`; da lì nascono due delta:

| Asse | Campo | Si ferma in pausa? | Segue `timeScale`? | Uso |
| --- | --- | --- | --- | --- |
| Simulazione | `dt` / `elapsed` | sì (`dt = 0`) | sì | fisica, AI, sprite di gameplay, `BeeTimer` di default |
| Reale | `unscaledDt` / `unscaledElapsed` | no | no | HUD, UI, mixer audio, timer di interfaccia |

### Integrazione

Il loop di `BeeEngine` chiama sempre `time.tick`, **renderizza sempre** (anche in pausa) e avanza scene/entità solo se il mondo non è in pausa.

```javascript
import { BeeEngine, BeeTimer } from 'beeengine';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.start();

gioco.pause();              // mondo fermo, HUD vivo
gioco.resume();
gioco.setTimeScale(0.25);   // slow-motion
gioco.time.togglePause();

// Timer immune a pausa/slow-mo (barra UI, fade)
const hudTick = new BeeTimer(1, () => {}, true, { useUnscaledTime: true });
hudTick.start();
hudTick.update(gioco.time);
```

### API essenziale

* `gioco.time.dt` — delta di simulazione (`unscaledDt * timeScale`; 0 in pausa). `maxDelta` (default 50 ms) clamp-a il tempo **reale**, prima della scala.
* `gioco.time.unscaledDt` — delta reale dello stesso frame (vive in pausa).
* `gioco.time.timeScale` — 0.25 / 1 / 2… (clamp 0–16 via `setScale`; il costruttore non clamp-a).
* `gioco.time.begin()` — allinea il timestamp senza azzerare elapsed (start / ripartenza dopo `stop`).
* `gioco.time.fps` — stima su finestra 0.5 s di tempo reale.
* `gioco.time.consumeFixedSteps(fn)` — il loop lo chiama verso `physics.step` (passo 1/60, max 5). Le entity senza `body` restano a dt variabile.
* `BeeTimer(..., { useUnscaledTime: true })` — cooldown sul tempo reale; va aggiornato nel callback `engine.update` se deve vivere in pausa (`scene.update` in freeze non parte).

Demo visiva: apri `index.html` (via `main.js`). **F2** apre BeeLadybug.

## 🎬 BeeSceneManager — replace, non stack

`change` sostituisce la scena. Stesso nome = restart (`onExit`/`exit` → sweep entity → `onEnter`/`enter`). Non è uno stack: niente push/pop/fade.

Il manager è l’unico owner del loop entity. `scene.update` / `scene.draw` sono logica di scena e HUD, non un secondo `for` sulle entity (quello era un doppio tick).

| API | Contratto |
| --- | --- |
| `add(name, scene)` | registra; `add(null)` lancia |
| `change(name, data)` | replace + restart; `change` dentro `update` slitta le entity al frame dopo |
| `remove(name)` | sweep + toglie dalla Map |
| `persistEntities: true` | uscire non distrugge le entity |
| `gioco.addEntity` | se c’è una scena corrente, va lì, non in `engine.entities` |

`engine.destroy()` chiama `scenes.destroy()` (exit della corrente, sweep di tutte, Map vuota).

## 🧭 BeeTransform (v2.5.0) — scena grafo affine

`BeeTransform` è la geometria. `BeeEntity` ne possiede una (`entity.transform`) e non ricalcola più il mondo come somma di offset.

Matrice locale: `T(pos) · R · S · T(-pivot)`.  
Matrice mondo: `parent.world · local`. Cache dirty-flag, zero allocazioni nel tick.

| Locale | Mondo |
| --- | --- |
| `x`, `y`, `rotation`, `scaleX/Y`, `pivotX/Y` | `worldX/Y`, `worldRotation`, `worldScaleX/Y` |
| `setPivot` / `setPivotNormalized` | `setWorldOrigin` (inverte la catena, non sottrae) |
| `applyWorldTo(ctx)` | disegna in spazio locale |

```javascript
hub.transform.setPivot(36, 36);
hub.angularVelocity = 0.8;
hub.addChild(satellite);          // satellite.x/y restano locali
ctx.save();
entity.applyWorldTransform(ctx);
ctx.fillRect(0, 0, entity.width, entity.height);
ctx.restore();
```

`getWorldAABB()` è l'AABB dell'OBB ruotato: Ladybug disegna i quattro spigoli, il culling usa i bounds giusti.

## ⚖ BeeRigidBody + BeePhysicsWorld — corpo e mondo, non AABB a gruppi

`BeeEntity` resta dati. `BeeTransform` resta geometria. La fisica vive in `gioco.physics` (`BeePhysicsWorld`): gravità di scena, massa, impulsi, layer/mask, forme box/cerchio/capsula. `BeeCollisionSystem` **non** è questo: è ancora il risolutore AABB a gruppi per il platformer.

Il loop chiama `time.consumeFixedSteps` → `physics.step`. Se l'entità ha un `body`, `integrate()` non si muove da sola.

| Layer | Uso tipico |
| --- | --- |
| `BEE_LAYER.WORLD` | pavimento, muri |
| `BEE_LAYER.PLAYER` | corpi dinamici di gameplay |
| `BEE_LAYER.TRIGGER` | sensor: `isTrigger`, niente bounce |
| `BEE_LAYER.GHOST` | il player lo ignora se non è nel `mask` |

```javascript
const body = entity.addRigidBody({
    world: gioco.physics,
    type: 'dynamic',
    mass: 2,
    shape: BeeRigidBody.circle(18),
    layer: BEE_LAYER.PLAYER,
    mask: BEE_LAYER.WORLD | BEE_LAYER.PLAYER | BEE_LAYER.TRIGGER
});
body.applyImpulse(0, -420);

gioco.physics.gravityY = 980;
gioco.physics.onBeginOverlap = (a, b) => { /* trigger o sensor */ };
```

Click in demo: impulso verso il puntatore. F2 Ladybug disegna la forma del body, non solo il rettangolo.

## 🗺 BeeSpatialHash — chi è vicino a questo AABB?

Le coppie n² esplodono con decine di proiettili. `BeeSpatialHash` è un indice a celle (non un quadtree: i body di gameplay hanno taglia simile, l'hash è più stabile). `gioco.physics.hash` si ricostruisce ogni `step`. `gioco.spatial` è lo stesso indice, per i query di gioco.

```javascript
const hits = gioco.physics.queryRadius(x, y, 80);
for (let i = 0; i < hits.length; i++) {
    hits[i].applyImpulse(0, -300);   // esplosione
}
```

`BeeCollisionSystem` e Ladybug usano lo stesso broadphase. Cella default 64px (`cellSize`).

## 💾 BeeSave — persistenza DTO, non `setItem` nudo

`BeeSave` non è più una facade cieca su `localStorage`. Ogni record è un envelope `{ __bee, v, t, d }`. `read()` distingue **missing / ok / corrupt / unavailable / rejected / quota**. Un JSON rotto non è un primo avvio.

| Metodo | Significato |
| --- | --- |
| `read(key)` | record onesto: usa questo per i progressi |
| `load(key, fallback)` | valore se `ok` (anche `null` salvato); missing → fallback |
| `exists(key)` | record **valido**; un blob corrotto è `false` |
| `has(key)` | chiave presente sul disco, anche se rotta |
| `configure({ namespace, version, migrate })` | una volta all'avvio: isola i denti sullo stesso dominio |

```javascript
gioco.save.configure({ namespace: 'orbit', version: 2, migrate(data, from) {
    if (from < 2) return { score: data.score ?? 0, lives: 3 };
    return data;
}});

const slot = gioco.save.readSlot(0);
if (slot.status === 'missing') { /* primo avvio */ }
if (slot.status === 'corrupt') { /* ripara o wipe, non trattarlo come new game */ }
if (slot.ok) { apply(slot.value); }

gioco.save.save('settings', { muted: true });   // DTO piatto
// BeeSave.save('p', player) → rejected: niente entità vive
```

Safari privato / storage assente: fallback in memoria di sessione (`fallback: 'memory'`). `save` non lancia. I record pre-envelope restano leggibili come `legacy`.

## 🐞 BeeLadybug (v2.4.0) — debug visivo e monitoraggio

`BeeLadybug` è l'occhio del motore: non è una classe di gameplay. Vive in `src/debug/` e disegna **dopo** il mondo (hitbox in spazio camera, overlay in spazio schermo).

### Perché F2

* **F12** è DevTools del browser: non lo tocchiamo.
* La **tilde** sui layout italiani non è un tasto unico.
* **F2** è libero, ed è lo standard dei pannelli debug nei motori.

### Cosa mostra

* Hitbox AABB di ogni entità (scene + `engine.entities` + figli + gruppi di collisione). Se l'entità ha un `BeeTransform`, Ladybug traccia anche l'OBB (i quattro spigoli ruotati).
* **Verde** = attiva, **rosso** = in overlap con un'altra AABB, **grigio** = inattiva.
* Overlay: FPS (`BeeTime.fps`), entità attive / in memoria, durata ciclo (`unscaledDt` in ms), `timeScale`, stato RUN/FREEZE.

### Controlli

| Tasto | Azione |
| --- | --- |
| F2 | mostra / nasconde la coccinella |
| F3 | alterna slow-motion `0.25x` e `1x` |
| F4 | freeze / unfreeze della simulazione (`BeeTime.pause`) |

I tre pulsanti sull'overlay fanno la stessa cosa. Il freeze ferma `dt` ma il loop continua a disegnare: puoi ispezionare le hitbox da fermo.

```javascript
const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableLadybug();          // visibile; F2 la nasconde
// oppure: gioco.debug.toggle();
gioco.start();
```

## 🚀 Novità e ottimizzazioni professionali nella v2.2.0

### 1. Controlli Mobile e Joystick Virtuale (`BeeJoystick` & `BeeTouchControls`)
* **Supporto nativo:** Gestione integrata per tutti gli schermi touch.
* **Attivazione rapida:** Attiva il joystick analogico e i pulsanti programmabili con un solo comando.
* **Codice:** `gioco.enableJoystick()`.

### 📱 NUOVO: Componenti Interfaccia Touch Avanzati
Nella v2.2.0 sono state introdotte due nuove classi specifiche esportate per una gestione granulare dell'input mobile:
* **`BeeVirtualDPad`**: Una pulsantiera direzionale configurabile a 4 o 8 direzioni (`eightWay: false/true`), ideale per movimenti precisi stile retro-game o platform.
* **`BeeTouchButton`**: Un pulsante tattile rotondo completamente personalizzabile nel raggio e nel testo dell'etichetta (es. "A" per saltare, "B" per sparare).

### 2. Gestione Sprite e Mappe Avanzata (`BeeSpriteSheet` & `BeeTilemapLoader`)
* **Ritaglio tessere:** Semplificato il caricamento e il ritaglio da fogli di sprite complessi.
* **Asincronia:** Gestione fluida e asincrona dei livelli di gioco durante i caricamenti.

### 3. Sistema di Collisioni Centralizzato (`BeeCollisionSystem`)
* **Gruppi logici:** Registro centralizzato per dividere le entità in gruppi.
* **Fisica ottimizzata:** Risoluzioni fisiche solide (`solid`) e interazioni ad eventi (`overlap`) ad alta efficienza.

### 4. Risparmio CPU tramite Frustum Culling (`BeeCamera`)
* **Sfoltimento grafico:** Algoritmo per saltare il rendering delle entità fuori dallo schermo.
* **Performance:** Mantiene i 60 FPS stabili anche con centinaia di oggetti in gioco.

### 5. Distribuzione NPM & Type Definitions (`index.d.ts`)
* **Modulo ES6:** Distribuzione ufficiale sul registro NPM ottimizzata per i moduli moderni.
* **Autocompletamento:** Definizioni di tipo aggiornate per l'IntelliSense e i suggerimenti in VS Code.

### 🛠️ Miglioramenti e correzioni
* Esportate nuove classi touch in `index.js` per una perfetta integrazione con il pacchetto.

* Aggiornata la documentazione e il layout Markdown.

* Testata e verificata la reattività al tocco in tempo reale su dispositivi mobili.

## 🛠️ Esempio d'Uso Rapido (v2.2.0)

```javascript
import { BeeEngine, BeeVirtualDPad, BeeTouchButton } from 'beeengine';

// 1. Inizializzazione Motore
const gioco = new BeeEngine("testCanvas", 800, 600);
gioco.enableAutoResize(800, 600, 100);

// 2. Attivazione controlli mobile nativi (v2.2)
gioco.enableJoystick();

// Configurazione opzionale D-Pad e Pulsanti Touch personalizzati
const dPad = new BeeVirtualDPad({
    canvas: gioco.canvas,
    x: 100,
    y: 500,
    size: 120,
    eightWay: false
});

const pulsanteSalto = new BeeTouchButton({
    canvas: gioco.canvas,
    x: 700,
    y: 500,
    radius: 35,
    label: "SALTA"
});

// 3. Regole Collisioni
gioco.collisions.setGroup('solidi', piattaforme);
gioco.collisions.setGroup('giocatore', [giocatore]);
gioco.collisions.solid('giocatore', 'solidi');

// 4. Avvio Ciclo di Gioco
gioco.start();
```

---

![BeeEngine](https://raw.githubusercontent.com/antonioprosperi2-svg/BeeEngine-V2.0/main/download.png)
