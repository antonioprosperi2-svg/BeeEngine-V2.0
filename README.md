# 🐝 Motore di gioco 2D BeeEngine (v2.3.0 Professional)

BeeEngine è un motore di gioco 2D leggero, modulare e altamente ottimizzato scritto in puro JavaScript moderno (ES Modules) per HTML5 Canvas.
La versione 2.3 introduce **BeeTime**, l'orologio di motore: tempo di simulazione scalato, tempo reale, pausa e slow-motion senza fermare il loop di rendering.

## 📁 Struttura del Progetto Aggiornata

```text
BeeEngine-V2.3/
├── index.html                  # Punto di ingresso HTML e configurazione Canvas
├── index.js                    # Barrel ESM (re-export di BeeEngine.js)
├── main.js                     # Demo visiva (BeeTime: pausa / slow-motion)
├── BeeEngine.js                # Il CUORE del motore (Core Loop & System Coordinator)
├── README.md                   # Documentazione ufficiale e specifiche tecniche
├── package.json                # Manifest di configurazione per la pubblicazione NPM
├── tsconfig.json               # Configurazione TypeScript per i controlli dell'IDE
├── index.d.ts                  # Definizioni di tipo globali per IntelliSense e TypeScript
├── assets/                     # Gestione centralizzata e ordinata delle risorse
│   ├── audio/                  # Effetti sonori (.mp3) e musiche di sottofondo
│   └── images/                 # Texture dei personaggi (.png), sprite e sfondi
└── src/
    ├── core/                   # BeeTime, BeeEntity, BeeTimer, scene, asset, save, grid
    ├── gameplay/               # Player, enemy, platform, collectible, menu
    ├── graphics/               # Camera, sprite, tilemap, text, particles
    ├── input/                  # Tastiera, mouse, joystick, touch, button
    └── physics/                # Collisioni, collider, bullet
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

* `gioco.time.dt` — delta di simulazione (già clampato a `maxDelta`, default 50 ms).
* `gioco.time.unscaledDt` — delta reale dello stesso frame.
* `gioco.time.timeScale` — 0.25 / 1 / 2…
* `gioco.time.fps` — stima su finestra 0.5 s di tempo reale.
* `gioco.time.consumeFixedSteps(fn)` — accumulatore 1/60 pronto per un futuro solver fisico (il loop attuale resta a dt variabile).
* `BeeTimer(..., { useUnscaledTime: true })` — cooldown sul tempo reale.

Demo visiva: apri `index.html` (via `main.js`). Il quadrato rosso usa `dt`; la lancetta ciano usa `unscaledElapsed`. **P** pausa, **1/2/3** per 0.25x / 1x / 2x.

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

BeeEngine è una libreria open source progettata per offrire un framework 2D fluido, leggero e modulare per lo sviluppo su HTML5 Canvas. 🐝
