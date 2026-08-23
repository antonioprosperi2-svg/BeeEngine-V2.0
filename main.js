import {
    BeeEngine,
    BeeVirtualDPad,
    BeeTouchButton,
} from './BeeEngine.js';

// 1. Inizializzazione motore
const gioco = new BeeEngine("testCanvas", 800, 600);
gioco.enableAutoResize(800, 600, 100);
window.gioco = gioco;

const canvas = gioco.canvas || document.getElementById('testCanvas');

// 2. Istanza del D-Pad (a sinistra)
const dpad = new BeeVirtualDPad({
    canvas: canvas,
    x: 120,
    y: 480,
    size: 120,
    eightWay: true // true per 8 direzioni, false per 4
});

// 3. Istanza del Pulsante Azione (a destra, ad esempio "JUMP" o "A")
const buttonA = new BeeTouchButton({
    canvas: canvas,
    x: 680,
    y: 480,
    radius: 40,
    label: 'A'
});

// 4. Entità Quadrato di Test
const box = {
    x: 400,
    y: 250,
    size: 40,
    speed: 200
};

// 5. Scena di Test
const testScene = {
    update(dt) {
        // Movimento tramite D-Pad (funziona sia con Touch che con Mouse)
        if (dpad.state.left) box.x -= box.speed * dt;
        if (dpad.state.right) box.x += box.speed * dt;
        if (dpad.state.up) box.y -= box.speed * dt;
        if (dpad.state.down) box.y += box.speed * dt;

        // Limiti del canvas
        box.x = Math.max(0, Math.min(800 - box.size, box.x));
        box.y = Math.max(0, Math.min(600 - box.size, box.y));
    },

    draw(ctx) {
        // Sfondo bianco
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 800, 600);

        // Se il pulsante A è premuto, il quadrato cambia colore in verde, altrimenti rosso
        ctx.fillStyle = buttonA.isPressed ? "#00ff00" : "#ff0000";
        ctx.fillRect(box.x, box.y, box.size, box.size);

        // Disegna i comandi a schermo
        dpad.render(ctx);
        buttonA.render(ctx);

        // Info di Debug
        ctx.fillStyle = "#000000";
        ctx.font = "bold 16px monospace";
        ctx.fillText("TEST D-PAD E TOUCH BUTTON", 20, 30);
        ctx.font = "14px monospace";
        ctx.fillText(`D-Pad Pressed: ${dpad.isPressed ? 'SI' : 'NO'}`, 20, 60);
        ctx.fillText(`Direzioni: U:${dpad.state.up} D:${dpad.state.down} L:${dpad.state.left} R:${dpad.state.right}`, 20, 80);
        ctx.fillText(`Pulsante A: ${buttonA.isPressed ? 'PREMUTO' : 'RILASCIATO'}`, 20, 100);
    },

    render(ctx) {
        this.draw(ctx);
    }
};

gioco.scenes.add('test', testScene);
gioco.scenes.change('test');
gioco.start();