# 🐝 Motore di gioco 2D BeeEngine (v2.1.3 Professional)

BeeEngine è un motore di gioco 2D leggero, modulare e altamente ottimizzato scritto in puro JavaScript moderno (ES Modules) per HTML5 Canvas.
La versione 2.1 espande il motore introducendo controlli touch nativi e joystick virtuale per smartphone, architettura pronta per la distribuzione tramite NPM, ottimizzazioni avanzate per il risparmio della CPU e un sistema di collisioni centralizzato.

## 📁 Struttura del Progetto Aggiornata

```text
BeeEngine-V2.1/
├── index.html                  # Punto di ingresso HTML e configurazione Canvas
├── main.js                     # Demo, gestione scene e punto d'avvio del gioco
├── BeeEngine.js                # Il CUORE del motore (Core Loop & System Coordinator)
├── README.md                   # Documentazione ufficiale e specifiche tecniche
├── package.json                # Manifest di configurazione per la pubblicazione NPM
├── tsconfig.json               # Configurazione TypeScript per i controlli dell'IDE
├── index.d.ts                  # Definizioni di tipo globali per IntelliSense e TypeScript
├── assets/                     # Gestione centralizzata e ordinata delle risorse
│   ├── audio/                  # Effetti sonori (.mp3) e musiche di sottofondo
│   └── images/                 # Texture dei personaggi (.png), sprite e sfondi
└── src/                        # Tutti i moduli logici del motore
    ├── BeeAssetManager.js      # Caricamento asincrono e cache di immagini/audio
    ├── BeeBullet.js            # Gestione dei proiettili 2D attivi
    ├── BeeButton.js            # Pulsanti interattivi per menu su Canvas
    ├── BeeCamera.js            # Telecamera 2D con supporto al bounding box visivo
    ├── BeeCollectible.js       # Oggetti raccoglibili (monete, miele)
    ├── BeeCollisionSystem.js   # Gestore centralizzato e ottimizzato delle collisioni
    ├── BeeEnemyShooter.js      # Nemico avanzato a 4 direzioni con sparo automatico
    ├── BeeEntity.js            # Classe base per tutte le entità di gioco
    ├── BeeGrid.js              # Griglia di sfondo / debug spaziale
    ├── BeeInput.js             # Gestione input (tastiera, mouse, comandi)
    ├── BeeJoystick.js          # NUOVO: Leva analogica virtuale integrata per mobile
    ├── BeeMenuScene.js         # Scena nativa del menu principale
    ├── BeeNemico.js            # Nemico base con movimento a pattuglia
    ├── BeeParticleSystem.js    # Sistema di particelle per effetti grafici
    ├── BeePlayer.js            # Personaggio giocabile (Modalità: 'platformer' o 'free')
    ├── BeeRectCollider.js      # Collisore geometrico rettangolare AABB
    ├── BeeSave.js              # Salvataggio dati persistenti in LocalStorage
    ├── BeeSceneManager.js      # Gestore dei cicli di vita e transizioni delle scene
    ├── BeeSprite.js            # Renderizzatore di fogli di sprite e texture
    ├── BeeSpriteSheet.js       # NUOVO: Gestore e ritaglio avanzato degli sprite sheet
    ├── BeeText.js              # Disegno di testi e rendering della barra HUD nativa
    ├── BeeTilemap.js           # Mappe a blocchi ottimizzate con culling riga/colonna
    ├── BeeTilemapLoader.js     # NUOVO: Caricatore asincrono per mappe di tessere
    ├── BeeTimer.js             # Gestore eventi basati sul tempo (Cooldown)
    └── BeeTouchControls.js     # NUOVO: Pulsanti tattili su schermo (Spara/Azione)
```
## 🚀 Novità e ottimizzazioni professionali nella v2.1.3

### 1. Controlli Mobile e Joystick Virtuale (`BeeJoystick` & `BeeTouchControls`)
* **Supporto nativo:** Gestione integrata per tutti gli schermi touch.
* **Attivazione rapida:** Attiva il joystick analogico e i pulsanti programmabili con un solo comando.
* **Codice:** `gioco.enableJoystick()`.

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

## 🛠️ Esempio d'Uso Rapido (v2.1.3)

```javascript
import { BeeEngine } from 'beeengine';

// 1. Inizializzazione Motore
const gioco = new BeeEngine("testCanvas", 800, 600);
gioco.enableAutoResize(800, 600, 100);

// 2. Attivazione controlli mobile nativi (v2.1)
gioco.enableJoystick();

// 3. Regole Collisioni
gioco.collisions.setGroup('solidi', piattaforme);
gioco.collisions.setGroup('giocatore', [giocatore]);
gioco.collisions.solid('giocatore', 'solidi');

// 4. Avvio Ciclo di Gioco
gioco.start();
```

---

BeeEngine è una libreria open source progettata per offrire un framework 2D fluido, leggero e modulare per lo sviluppo su HTML5 Canvas. 🐝
