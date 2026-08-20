export class BeeGrid {
    constructor(cols, rows, cellSize) {
        this.cols = cols;
        this.rows = rows;
        this.cellSize = cellSize;
        this.data = Array(rows).fill().map(() => Array(cols).fill(0));
    }
    // Questa è quella nuova e sicura che hai appena cambiato:
    setCell(c, r, val) {
        if (this.data[r] && c >= 0 && c < this.cols) {
            this.data[r][c] = val;
        }
    }

    // Ti consiglio di proteggere anche questa nello stesso modo:
    getCell(c, r) {
        return (this.data[r] && c >= 0 && c < this.cols) ? this.data[r][c] : null;
    }

    // Questa è la chiusura corretta del metodo draw della classe BeeGrid
    draw(ctx, drawFunction) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                drawFunction(ctx, c * this.cellSize, r * this.cellSize, this.data[r][c]);
            }
        }
    }
}
/** 🌟  * Classe BeeGrid: Rappresenta la griglia logica per la gestione dello spazio di gioco.
 * Suddivide lo schermo in celle quadrate, ognuna delle quali memorizza uno stato 
 * specifico per gestire ostacoli, coordinate o algoritmi di posizionamento.
 */

