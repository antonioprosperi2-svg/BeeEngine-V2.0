import { BeeEngine } from './BeeEngine.js';

// 1. Inizializzazione minimal
const gioco = new BeeEngine("testCanvas", 800, 600);
gioco.enableAutoResize(800, 600, 100);

if (typeof gioco.enableJoystick === "function") {
    gioco.enableJoystick();
}

window.gioco = gioco;

// 2. Helper per estrarre lo stato del joystick (Coordinate dirette)
function getJoystickData(input) {
    const joy = input?.joystick || gioco?.joystick || gioco?.touchControls?.joystick || null;
    if (!joy) return { x: 0, y: 0, active: false };

    const x = joy.x ?? joy.dx ?? joy.axisX ?? joy.horizontal ?? 0;
    const y = joy.y ?? joy.dy ?? joy.axisY ?? joy.vertical ?? 0;

    return {
        x,
        y,
        active: Math.abs(x) > 0.1 || Math.abs(y) > 0.1
    };
}

// 3. Quadrato di test
const player = {
    x: 400,
    y: 300,
    size: 40,
    speed: 300 // pixel al secondo
};

// 4. Scena di Debug Minimal
const testScene = {
    update(dt, input) {
        const inSys = input || gioco?.input;
        const joy = getJoystickData(inSys);

        // Movimento da Tastiera
        if (inSys) {
            if (inSys.isPressed?.("ArrowLeft") || inSys.keys?.["ArrowLeft"]) player.x -= player.speed * dt;
            if (inSys.isPressed?.("ArrowRight") || inSys.keys?.["ArrowRight"]) player.x += player.speed * dt;
            if (inSys.isPressed?.("ArrowUp") || inSys.keys?.["ArrowUp"]) player.y -= player.speed * dt;
            if (inSys.isPressed?.("ArrowDown") || inSys.keys?.["ArrowDown"]) player.y += player.speed * dt;
        }

        // Movimento da Joystick Vettoriale
        if (joy.active) {
            player.x += joy.x * player.speed * dt;
            player.y += joy.y * player.speed * dt;
        }

        // Limiti dello schermo per non farlo uscire fuori
        player.x = Math.max(player.size / 2, Math.min(800 - player.size / 2, player.x));
        player.y = Math.max(player.size / 2, Math.min(600 - player.size / 2, player.y));
    },

    draw(ctx) {
        // Sfondo bianco pulito
        ctx.fillStyle = "#ffffff1e";
        ctx.fillRect(0, 0, 800, 600);

        // Quadrato rosso di test
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);

        // HUD di Telemetria in alto a sinistra
        const inSys = gioco?.input;
        const joy = getJoystickData(inSys);

        ctx.fillStyle = "#dcd7d7";
        ctx.font = "16px monospace";
        ctx.fillText(`TEST JOYSTICK BEEENGINE`, 20, 30);
        ctx.fillText(`Joystick Trovato: ${joy.active ? "SI (In uso)" : "IDLE / NO"}`, 20, 60);
        ctx.fillText(`Asse X: ${joy.x.toFixed(2)}`, 20, 85);
        ctx.fillText(`Asse Y: ${joy.y.toFixed(2)}`, 20, 110);
        ctx.fillText(`Posizione Quadrato X: ${Math.round(player.x)} Y: ${Math.round(player.y)}`, 20, 135);
    },

    render(ctx) {
        this.draw(ctx);
    }
};

gioco.scenes.add('test', testScene);
gioco.scenes.change('test');
gioco.start();