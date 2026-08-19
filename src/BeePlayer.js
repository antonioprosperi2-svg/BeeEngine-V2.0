import { BeeEntity } from './BeeEntity.js';
import { BeeAnimatedSprite } from './BeeAnimatedSprite.js';
import { BeeSpriteSheet } from './BeeSpriteSheet.js';
/**
 * Classe BeePlayer: Il personaggio giocabile principale del motore.
 * Include gestione del punteggio, delle vite, movimenti sia per giochi Volanti/Arcade che Platformer (Salto + Gravità).
 */
export class BeePlayer extends BeeEntity {
    constructor(x = 100, y = 100, width = 40, height = 40, textureKey = 'ape') {
        super(x, y, width, height);
        this.speed = 220;

        // Salviamo il valore di base per poterlo ripristinare all'occorrenza
        this.baseJumpForce = -420;
        this.jumpForce = this.baseJumpForce;

        this.gravity = 500; // Gravità attiva per modalità platformer/salti
        this.textureKey = textureKey;

        // Punteggio e Vite integrati
        this.score = 0;
        this.lives = 3;
        this.mode = 'platformer'; // 'platformer' (salto+gravità) oppure 'free' (volo libero a 360°)
    }

    /**
     * Esegue il salto se il giocatore si trova a terra (isGrounded)
     */
    jump() {
        if (this.isGrounded || this.mode === 'free') {
            this.vy = this.jumpForce;
            this.isGrounded = false;
        }
    }

    /**
     * Aumenta la forza del salto. 
     * @param {number} amount - Il valore da sommare alla potenza (es. 150 per saltare molto più in alto)
     */
    potenziaSalto(amount) {
        // Sottraiamo perché sull'asse Y i numeri negativi vanno verso l'alto
        this.jumpForce = this.baseJumpForce - amount;
    }

    /**
     * Aumenta la forza del salto solo per un determinato periodo di tempo.
     * @param {number} amount - Il valore del bonus (es. 150)
     * @param {number} durationMs - Durata in millisecondi (es. 5000 per 5 secondi)
     */
    potenziaSaltoTemporaneo(amount, durationMs) {
        this.potenziaSalto(amount);

        // Ritorna al salto normale dopo che il tempo è scaduto
        setTimeout(() => {
            this.jumpForce = this.baseJumpForce;
        }, durationMs);
    }

    addScore(points) {
        this.score += points;
    }

    takeDamage(amount = 1) {
        this.lives = Math.max(0, this.lives - amount);
        return this.lives <= 0;
    }

    update(dt, input, engine) {
        if (!input) return;

        // Movimento Orizzontale
        this.vx = 0;
        if (input.isPressed("ArrowRight") || input.isPressed("KeyD")) this.vx = this.speed;
        if (input.isPressed("ArrowLeft") || input.isPressed("KeyA")) this.vx = -this.speed;

        // Movimento in base alla modalità di gioco
        if (this.mode === 'platformer') {
            // Salto con Spazio, Frecce o Touch
            if (input.wasPressed("Space") || input.wasPressed("ArrowUp") || input.wasPressed("KeyW") || input.mouse.wasPressed) {
                this.jump();
            }
        } else {
            // Volo libero (Modalità Arcade / Flying)
            if (input.isPressed("ArrowDown") || input.isPressed("KeyS")) this.vy = this.speed;
            else if (input.isPressed("ArrowUp") || input.isPressed("KeyW")) this.vy = -this.speed;
            else this.vy = 0;
        }

        // Applica gravità e aggiorna posizione tramite classe base BeeEntity
        super.update(dt, input, engine);
    }

    draw(ctx, engine) {
        // 1. PRIMA DI TUTTO: Se ha uno sprite animato, disegna SOLO quello ed esci!
        if (this.sprite) {
            // Gestione opzionale della direzione (flipX)
            if (this.vx < 0) this.sprite.flipX = true;
            if (this.vx > 0) this.sprite.flipX = false;

            this.sprite.draw(ctx, this.x, this.y, { width: this.width, height: this.height });
            return; // Exit fondamentale: non disegna il pallino giallo!
        }

        // 2. Se ha una singola texture immagine standard
        const texture = (engine && this.textureKey) ? engine.getAsset(this.textureKey) : null;
        if (texture) {
            ctx.drawImage(texture, this.x, this.y, this.width, this.height);
            return;
        }

        // 3. FALLBACK VETTORIALE (Usato solo se NON ci sono sprite né immagini)
        ctx.fillStyle = "#FFD700"; // Giallo miele
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Strisce nere dell'ape
        ctx.fillStyle = "#000000";
        ctx.fillRect(this.x + 10, this.y + 8, 5, 24);
        ctx.fillRect(this.x + 22, this.y + 8, 5, 24);

        // Occhio
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(this.x + 30, this.y + 14, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

