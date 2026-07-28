# 🐝 BeeEngine 2D Game Engine (v2.0 Professional)

**BeeEngine** è un motore di gioco 2D leggero, modulare e altamente ottimizzato scritto in puro JavaScript moderno (ES Modules) per HTML5 Canvas. 

La versione 2.0 introduce un'architettura professionale pronta per la distribuzione tramite NPM, ottimizzazioni avanzate per il risparmio della CPU e un sistema di collisioni centralizzato.

---

## 📁 Struttura del Progetto Aggiornata

```text
BeeEngine V2.0/
├── index.html                  # Punto di ingresso HTML e configurazione Canvas
├── main.js                     # Demo, gestione scene e punto d'avvio del gioco
├── BeeEngine.js                # Il CUORE del motore (Core Loop & System Coordinator)
├── README.md                   # Documentazione ufficiale e specifiche tecniche
├── package.json                # Manifest di configurazione per la pubblicazione NPM
├── tsconfig.json               # Configurazione TypeScript per i controlli dell'IDE
├── index.d.ts                  # Definizioni di tipo globali (Oltre 600 righe di IntelliSense)
├── assets/                     # Gestione centralizzata e ordinata delle risorse
│   ├── audio/                  # Effetti sonori (.mp3) e musiche di sottofondo
│   └── images/                 # Texture dei personaggi (.png), sprite e sfondi
└── src/                        # Tutti i moduli logici del motore
    ├── BeeCollisionSystem.js   # NUOVO: Gestore centralizzato e ottimizzato delle collisioni
    ├── BeeAssetManager.js      # Caricamento asincrono e cache di immagini/audio
    ├── BeeBullet.js            # Gestione dei proiettili 2D attivi
    ├── BeeButton.js            # Pulsanti interattivi per menu su Canvas
    ├── BeeCamera.js            # Telecamera 2D con supporto al bounding box visivo
    ├── BeeCollectible.js       # Oggetti raccoglibili (monete, miele)
    ├── BeeEntity.js            # Classe base per tutte le entità di gioco
    ├── BeeEnemyShooter.js      # Nemico avanzato a 4 direzioni con sparo automatico
    ├── BeeGrid.js              # Griglia di sfondo / debug spaziale
    ├── BeeInput.js             # Gestione input (tastiera, mouse, comandi)
    ├── BeeMenuScene.js         # Scena nativa del menu principale
    ├── BeeNemico.js            # Nemico base con movimento a pattuglia
    ├── BeeParticleSystem.js    # Sistema di particelle per effetti grafici
    ├── BeePlayer.js            # Personaggio giocabile (Modalità: 'platformer' o 'free')
    ├── BeeRectCollider.js      # Collisore geometrico rettangolare AABB
    ├── BeeSave.js              # Salvataggio dati persistenti in LocalStorage
    ├── BeeSceneManager.js      # Gestore dei cicli di vita e transizioni delle scene
    ├── BeeSprite.js            # Renderizzatore di fogli di sprite e texture
    ├── BeeText.js              # Disegno di testi e rendering della barra HUD nativa
    ├── BeeTilemap.js           # Mappe a blocchi ottimizzate con culling riga/colonna
    ├── BeeTimer.js             # Gestore eventi basati sul tempo (Cooldown)
    └── BeeTouchControls.js     # Interfaccia comandi touch mobili nativa
```

---

## 🚀 Novità e Ottimizzazioni Professionali in v2.0

### 1. Sistema di Collisioni Centralizzato (`BeeCollisionSystem`)
Rimosso il controllo manuale e iterativo delle collisioni nel ciclo di gioco. Il nuovo modulo permette di registrare le entità in gruppi logici ed eseguire passate di risoluzione fisiche o logiche ultra-efficienti:
* **Fisica Solida (`solid`)**: Gestione automatica della gravità e atterraggio solido dei corpi mobili sulle piattaforme.
* **Incroci di Eventi (`overlap`)**: Gestione dei trigger (es. raccolta monete, danno dai nemici) tramite funzioni di callback asincrone.

### 2. Risparmio CPU tramite Frustum Culling (`BeeCamera`)
Implementato un algoritmo di sfoltimento grafico (*Culling*) legato ai confini visivi di `BeeCamera`. 
* Prima di inviare i dati di disegno al Canvas, il motore verifica se l'entità o la porzione di mappa si trova dentro lo schermo.
* Se l'oggetto è fuori dalla visuale, il comando di rendering viene saltato. Questo **abbatte drasticamente l'uso della CPU**, mantenendo i 60 FPS stabili anche su mappe di grandi dimensioni.
* Elementi fissi come l'**HUD delle vite/punteggio** e i **Controlli Touch mobili** sono protetti dal culling per rimanere ancorati allo schermo.

### 3. Supporto Professionale NPM & IntelliSense Completo
Il motore è stato standardizzato per essere distribuito come libreria riutilizzabile:
* **`index.d.ts`**: Un file di oltre 600 righe di definizioni di tipo TypeScript che mappa tutte le 22 classi del motore. Abilita l'autocompletamento intelligente (IntelliSense) in VS Code/Cursor anche scrivendo in puro JavaScript.
* **`package.json`**: Configurato con standard ESM (ES Modules) ed esportazioni pulite per essere installato tramite terminale con `npm install`.

---

## 🛠️ Esempio d'Uso del Nuovo Sistema di Collisioni

All'interno dell'inizializzazione della tua scena in `main.js`:

```javascript
// 1. Pulisci e definisci i gruppi all'avvio della scena
gioco.collisions.clear();
gioco.collisions.setGroup('solids', this.piattaforme);
gioco.collisions.setGroup('player', [this.giocatore]);
gioco.collisions.setGroup('hazards', this.nemici);

// 2. Definisci le regole del mondo
gioco.collisions.solid('player', 'solids'); // Il giocatore atterra sui solidi

gioco.collisions.overlap('player', 'hazards', (player, hazard, engine) => {
    player.takeDamage(1); // Gestione danno automatica al contatto
});

// 3. Nel ciclo di update(), esegui tutte le regole in un colpo solo
gioco.collisions.run();
```

---
*BeeEngine è sviluppato con passione per rendere lo sviluppo di giochi 2D in JavaScript semplice, performante ed elegante!* 🐝
ciao