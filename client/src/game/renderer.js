import { BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE } from './constants.js';

export class TetrisRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = BOARD_WIDTH * CELL_SIZE;
    this.canvas.height = BOARD_HEIGHT * CELL_SIZE;
  }

  clear() {
    this.ctx.fillStyle = '#2a2a3e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBoard(board) {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = board[y][x];
        if (cell) {
          this.drawCell(x, y, cell);
        } else {
          this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          this.ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }

  drawCell(x, y, color) {
    const px = x * CELL_SIZE;
    const py = y * CELL_SIZE;
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, 4);
    
    this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this.ctx.fillRect(px + 1, py + CELL_SIZE - 5, CELL_SIZE - 2, 4);
  }

  drawPiece(piece) {
    if (!piece) return;
    const { shape, x, y, color } = piece;
    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px]) {
          this.drawCell(x + px, y + py, color);
        }
      }
    }
  }

  drawGhost(piece, board) {
    if (!piece) return;
    
    let ghostY = piece.y;
    while (this.canPlace(piece.x, ghostY + 1, piece.shape, board)) {
      ghostY++;
    }
    
    this.ctx.globalAlpha = 0.3;
    const originalY = piece.y;
    const originalColor = piece.color;
    piece.color = '#ffffff';
    piece.y = ghostY;
    this.drawPiece(piece);
    piece.y = originalY;
    piece.color = originalColor;
    this.ctx.globalAlpha = 1;
  }

  canPlace(x, y, shape, board) {
    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px]) {
          const boardX = x + px;
          const boardY = y + py;
          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
            return false;
          }
          if (boardY >= 0 && board[boardY][boardX]) {
            return false;
          }
        }
      }
    }
    return true;
  }

  drawNextPieces(pieces) {
    const previewSize = 4;
    const cellSize = 20;
    let offsetX = 10;
    
    for (const type of pieces.slice(0, 3)) {
      const pieceDef = { shape: window.PIECES[type].shape, color: window.PIECES[type].color };
      const shape = pieceDef.shape;
      
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            this.ctx.fillStyle = pieceDef.color;
            this.ctx.fillRect(offsetX + x * cellSize, 10 + y * cellSize, cellSize - 2, cellSize - 2);
          }
        }
      }
      offsetX += shape[0].length * cellSize + 15;
    }
  }

  render(state, { showGhost = true } = {}) {
    this.clear();
    this.drawBoard(state.board);
    if (state.currentPiece) {
      if (showGhost) {
        this.drawGhost(state.currentPiece, state.board);
      }
      this.drawPiece(state.currentPiece);
    }
  }
}

export default TetrisRenderer;
