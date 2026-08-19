// 1. TUTTI GLI IMPORT IN CIMA AL FILE
import {
    BeeEngine,
    BeeSprite,
    BeeGrid,
    BeeInput,
    BeeSceneManager,
    BeeEnemyShooter,
    BeeMenuScene
} from './BeeEngine.js';

import { BeeTouchControls } from './BeeTouchControls.js';

// 2. Inizializzazione Motore su Canvas "testCanvas"
const gioco = new BeeEngine("testCanvas", 800, 600);
gioco.enableAutoResize(800, 600, 100);

window.gioco = gioco;

// Riferimento corretto al Canvas e al Context
const canvas = gioco.canvas || document.getElementById('testCanvas');
const ctx = gioco.ctx || canvas.getContext('2d');

// 3. Costanti di configurazione per lo Spara Bolle
const WIDTH = 800;
const HEIGHT = 600;

const RADIUS = 18;
const DIAMETER = RADIUS * 2;
const VERTICAL_GAP = Math.sqrt(3) * RADIUS;

const COLS = 12;
const ROWS = 14;

const TOP = 55;
const LEFT = (WIDTH - (COLS * DIAMETER + RADIUS)) / 2;

const SHOOTER_X = WIDTH / 2;
const SHOOTER_Y = HEIGHT - 45;

const COLORS = [
    "#ff4444",
    "#44aaff",
    "#ffdd33",
    "#66dd66",
    "#cc66ff"
];

// 4. Inizializzazione Controlli Touch usando l'input di BeeEngine
const touchControls = new BeeTouchControls(canvas, gioco.input || gioco);

// 5. Funzioni Utility della Griglia
function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function distanceSq(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
}

function cellToPixel(row, col) {
    return {
        x: LEFT + col * DIAMETER + (row % 2) * RADIUS + RADIUS,
        y: TOP + row * VERTICAL_GAP + RADIUS
    };
}

function inBounds(row, col) {
    return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function getNeighbors(row, col) {
    if (row % 2 === 0) {
        return [
            [row, col - 1], [row, col + 1],
            [row - 1, col], [row - 1, col - 1],
            [row + 1, col], [row + 1, col - 1]
        ];
    } else {
        return [
            [row, col - 1], [row, col + 1],
            [row - 1, col], [row - 1, col + 1],
            [row + 1, col], [row + 1, col + 1]
        ];
    }
}

// 6. Classe per la Bolla sparata
class ShotBubble {
    constructor(x, y, angle, color) {
        this.x = x;
        this.y = y;
        this.color = color;
    }
}

const speed = 520;
this.vx = Math.cos(angle) * speed;
this.vy = Math.sin(angle) * speed;

this.destroyed = false;


update(dt); {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Rimbalzo sui muri
    if (this.x - RADIUS <= 0) {
        this.x = RADIUS;
        this.vx = Math.abs(this.vx);
    }

    if (this.x + RADIUS >= WIDTH) {
        this.x = WIDTH - RADIUS;
        this.vx = -Math.abs(this.vx);
    }

    if (this.y > HEIGHT + 100) {
        this.destroyed = true;
    }
}

draw(ctx); {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
}


// 4. Scena di Gioco Completa
const gameScene = {
    grid: null,
    shot: null,
    nextColor: null,
    score: 0,
    gameOver: false,
    win: false,

    enter() {
        console.log("🎮 Inizio spara bolle!");

        this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

        // Righe iniziali di bolle
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < COLS; c++) {
                this.grid[r][c] = randomColor();
            }
        }

        this.shot = null;
        this.nextColor = randomColor();
        this.score = 0;
        this.gameOver = false;
        this.win = false;
    },

    update(dt, input) {
        // Se input viene passato dal motore o preso direttamente
        const inSys = input || (gioco ? gioco.input : null);
        if (!inSys) return;

        if (this.gameOver) {
            if (inSys.wasPressed("KeyR") || inSys.wasPressed("r")) {
                this.enter();
            }
            return;
        }

        const wantsShoot =
            (inSys.mouse && inSys.mouse.wasPressed) ||
            inSys.wasPressed("Space") ||
            inSys.wasPressed(" ");

        if (wantsShoot) {
            this.shoot(inSys);
        }

        if (this.shot) {
            this.shot.update(dt);

            if (this.shouldAttachShot()) {
                this.attachShot();
            }

            if (this.shot && this.shot.destroyed) {
                this.shot = null;
            }
        }
    },

    getAimAngle(input) {
        let mx = (input.mouse && input.mouse.x) ? input.mouse.x : SHOOTER_X;
        let my = (input.mouse && input.mouse.y) ? input.mouse.y : 0;

        let angle = Math.atan2(my - SHOOTER_Y, mx - SHOOTER_X);

        if (angle > 0) {
            angle = -Math.PI / 2;
        }

        const minAngle = -Math.PI + 0.18;
        const maxAngle = -0.18;

        return Math.max(minAngle, Math.min(maxAngle, angle));
    },

    shoot(input) {
        if (this.shot) return;

        const angle = this.getAimAngle(input);

        this.shot = new ShotBubble(
            SHOOTER_X,
            SHOOTER_Y,
            angle,
            this.nextColor
        );

        this.nextColor = randomColor();
    },

    shouldAttachShot() {
        if (!this.shot) return false;

        if (this.shot.y - RADIUS <= TOP) {
            return true;
        }

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const color = this.grid[r][c];
                if (!color) continue;

                const p = cellToPixel(r, c);
                const d2 = distanceSq(this.shot.x, this.shot.y, p.x, p.y);

                if (d2 <= (DIAMETER - 2) * (DIAMETER - 2)) {
                    return true;
                }
            }
        }
        return false;
    },

    attachShot() {
        if (!this.shot) return;

        const cell = this.findNearestEmptyCell(this.shot.x, this.shot.y);

        if (!cell) {
            this.gameOver = true;
            return;
        }

        const { row, col } = cell;
        this.grid[row][col] = this.shot.color;

        const placedColor = this.shot.color;
        this.shot = null;

        const matched = this.findConnectedSameColor(row, col, placedColor);

        if (matched.length >= 3) {
            for (const b of matched) {
                this.grid[b.row][b.col] = null;
            }

            this.score += matched.length * 10;

            const floating = this.findFloatingBubbles();
            for (const b of floating) {
                this.grid[b.row][b.col] = null;
            }

            this.score += floating.length * 20;
        }

        this.checkWinLose();
    },

    findNearestEmptyCell(x, y) {
        let best = null;
        let bestDist = Infinity;

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c]) continue;

                const p = cellToPixel(r, c);
                const d2 = distanceSq(x, y, p.x, p.y);

                if (d2 < bestDist) {
                    bestDist = d2;
                    best = { row: r, col: c };
                }
            }
        }
        return best;
    },

    findConnectedSameColor(startRow, startCol, color) {
        const result = [];
        const visited = new Set();
        const queue = [{ row: startRow, col: startCol }];

        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.row},${current.col}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (!inBounds(current.row, current.col)) continue;
            if (this.grid[current.row][current.col] !== color) continue;

            result.push(current);

            const neighbors = getNeighbors(current.row, current.col);

            for (const [nr, nc] of neighbors) {
                if (!inBounds(nr, nc)) continue;
                if (this.grid[nr][nc] === color) {
                    queue.push({ row: nr, col: nc });
                }
            }
        }
        return result;
    },

    findFloatingBubbles() {
        const connectedToTop = new Set();
        const queue = [];

        for (let c = 0; c < COLS; c++) {
            if (this.grid[0][c]) {
                queue.push({ row: 0, col: c });
            }
        }

        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.row},${current.col}`;

            if (connectedToTop.has(key)) continue;
            connectedToTop.add(key);

            const neighbors = getNeighbors(current.row, current.col);

            for (const [nr, nc] of neighbors) {
                if (!inBounds(nr, nc)) continue;
                if (!this.grid[nr][nc]) continue;

                const nKey = `${nr},${nc}`;
                if (!connectedToTop.has(nKey)) {
                    queue.push({ row: nr, col: nc });
                }
            }
        }

        const floating = [];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (!this.grid[r][c]) continue;

                const key = `${r},${c}`;
                if (!connectedToTop.has(key)) {
                    floating.push({ row: r, col: c });
                }
            }
        }
        return floating;
    },

    checkWinLose() {
        let remaining = 0;

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c]) {
                    remaining++;
                    const p = cellToPixel(r, c);

                    if (p.y + RADIUS > SHOOTER_Y - 45) {
                        this.gameOver = true;
                        this.win = false;
                    }
                }
            }
        }

        if (remaining === 0) {
            this.gameOver = true;
            this.win = true;
        }
    },

    // Il motore cerca 'draw' o 'render'? Li mettiamo entrambi e li facciamo puntare allo stesso codice.
    draw(ctx) {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Sfondo
        ctx.fillStyle = "#102030";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Area superiore
        ctx.fillStyle = "#223344";
        ctx.fillRect(0, 0, WIDTH, TOP);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, TOP);
        ctx.lineTo(WIDTH, TOP);
        ctx.stroke();

        // Bolle sulla griglia
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const color = this.grid[r][c];
                if (!color) continue;

                const p = cellToPixel(r, c);
                this.drawBubble(ctx, p.x, p.y, color);
            }
        }

        // Bolla sparata
        if (this.shot) {
            this.shot.draw(ctx);
        }

        // Cannone / mira
        this.drawShooter(ctx);

        // HUD
        this.drawHUD(ctx);

        if (this.gameOver) {
            this.drawGameOver(ctx);
        }
    },

    render(ctx) {
        this.draw(ctx);
    },

    drawBubble(ctx, x, y, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.arc(x - 6, y - 7, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    drawShooter(ctx) {
        const input = gioco ? gioco.input : null;
        let angle = -Math.PI / 2;

        if (input) {
            angle = this.getAimAngle(input);
        }

        const aimLength = 80;
        const endX = SHOOTER_X + Math.cos(angle) * aimLength;
        const endY = SHOOTER_Y + Math.sin(angle) * aimLength;

        ctx.save();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(SHOOTER_X, SHOOTER_Y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.fillStyle = "#dddddd";
        ctx.beginPath();
        ctx.arc(SHOOTER_X, SHOOTER_Y, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Prossima bolla
        this.drawBubble(ctx, SHOOTER_X, SHOOTER_Y, this.nextColor);
        ctx.restore();
    },

    drawHUD(ctx) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, WIDTH, 40);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`Score: ${this.score}`, 20, 20);

        ctx.textAlign = "right";
        ctx.fillText("Click / Space per sparare", WIDTH - 20, 20);
        ctx.restore();
    },

    drawGameOver(ctx) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        ctx.fillStyle = this.win ? "#66ff66" : "#ff6666";
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
            this.win ? "HAI VINTO!" : "GAME OVER",
            WIDTH / 2,
            HEIGHT / 2 - 30
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "24px Arial";
        ctx.fillText(
            "Premi R per ricominciare",
            WIDTH / 2,
            HEIGHT / 2 + 30
        );
        ctx.restore();
    }
}; // <-- FINE DELL'OGGETTO gameScene CORRETTA!

// 5. REGISTRAZIONE DELLA SCENA ED AVVIO DEL MOTORE

gioco.scenes.add('game', gameScene);
gioco.scenes.change('game');
gioco.start();