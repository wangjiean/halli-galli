import { BOARD_WIDTH, BOARD_HEIGHT, PIECES, SCORES } from './constants.js';

const PIECE_TYPES = Object.keys(PIECES);

// 基于种子的伪随机数生成器 (Mulberry32)
function createSeededRandom(seed) {
  let state = seed;
  return function () {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class TetrisEngine {
  constructor(seed) {
    this.seed = seed;
    this.random = seed != null ? createSeededRandom(seed) : Math.random;
    this.reset();
  }

  reset() {
    if (this.seed != null) {
      this.random = createSeededRandom(this.seed);
    }
    this.board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.bag = [];
    this.nextPieces = [];
    this.currentPiece = null;
    this.spawnPiece();
  }

  getDropSpeed() {
    return Math.max(100, 1000 - (this.level - 1) * 100);
  }

  refillBag() {
    const newBag = [...PIECE_TYPES];
    for (let i = newBag.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
    }
    this.bag.push(...newBag);
  }

  getNextPieceType() {
    if (this.bag.length === 0) {
      this.refillBag();
    }
    return this.bag.shift();
  }

  spawnPiece() {
    while (this.nextPieces.length < 3) {
      this.nextPieces.push(this.getNextPieceType());
    }

    const type = this.nextPieces.shift();
    const pieceDef = PIECES[type];
    this.currentPiece = {
      type,
      shape: pieceDef.shape.map(row => [...row]),
      x: Math.floor(BOARD_WIDTH / 2) - Math.ceil(pieceDef.shape[0].length / 2),
      y: 0,
      color: pieceDef.color
    };

    if (this.collides(0, 0, this.currentPiece.shape)) {
      this.isGameOver = true;
    }
  }

  collides(offsetX, offsetY, shape) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const newX = this.currentPiece.x + x + offsetX;
          const newY = this.currentPiece.y + y + offsetY;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true;
          }
          if (newY >= 0 && this.board[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  rotateClockwise() {
    const shape = this.currentPiece.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        rotated[x][rows - 1 - y] = shape[y][x];
      }
    }

    if (!this.collides(0, 0, rotated)) {
      this.currentPiece.shape = rotated;
      return true;
    }

    const kicks = [-1, 1, -2, 2];
    for (const kick of kicks) {
      if (!this.collides(kick, 0, rotated)) {
        this.currentPiece.x += kick;
        this.currentPiece.shape = rotated;
        return true;
      }
    }
    return false;
  }

  moveLeft() {
    if (!this.collides(-1, 0, this.currentPiece.shape)) {
      this.currentPiece.x--;
      return true;
    }
    return false;
  }

  moveRight() {
    if (!this.collides(1, 0, this.currentPiece.shape)) {
      this.currentPiece.x++;
      return true;
    }
    return false;
  }

  softDrop() {
    if (!this.collides(0, 1, this.currentPiece.shape)) {
      this.currentPiece.y++;
      this.score += SCORES.SOFT_DROP;
      return true;
    }
    return false;
  }

  hardDrop() {
    let dropDistance = 0;
    while (!this.collides(0, 1, this.currentPiece.shape)) {
      this.currentPiece.y++;
      dropDistance++;
    }
    this.score += dropDistance * SCORES.HARD_DROP;
    this.lock();
  }

  tick() {
    if (this.isPaused || this.isGameOver) return false;

    if (!this.softDrop()) {
      this.lock();
      return true;
    }
    return false;
  }

  lock() {
    const { shape, x, y, color } = this.currentPiece;
    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px]) {
          const boardY = y + py;
          const boardX = x + px;
          if (boardY >= 0) {
            this.board[boardY][boardX] = color;
          }
        }
      }
    }

    this.clearLines();
    this.spawnPiece();
  }

  clearLines() {
    let linesCleared = 0;
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (this.board[y].every(cell => cell !== 0)) {
        this.board.splice(y, 1);
        this.board.unshift(Array(BOARD_WIDTH).fill(0));
        linesCleared++;
        y++;
      }
    }

    if (linesCleared > 0) {
      this.lines += linesCleared;
      const baseScores = [0, SCORES.SINGLE, SCORES.DOUBLE, SCORES.TRIPLE, SCORES.TETRIS];
      this.score += baseScores[linesCleared] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
    }

    return linesCleared;
  }

  addGarbageLines(lines) {
    for (let i = 0; i < lines; i++) {
      this.board.shift();
      const garbageLine = Array(BOARD_WIDTH).fill('#888');
      const hole = Math.floor(Math.random() * BOARD_WIDTH);
      garbageLine[hole] = 0;
      this.board.push(garbageLine);
    }
  }

  getState() {
    return {
      board: this.board,
      currentPiece: this.currentPiece,
      nextPieces: this.nextPieces,
      score: this.score,
      level: this.level,
      lines: this.lines,
      isGameOver: this.isGameOver,
      isPaused: this.isPaused
    };
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }
}

export default TetrisEngine;
