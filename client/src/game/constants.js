export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const CELL_SIZE = 30;

export const PIECES = {
  I: { shape: [[1,1,1,1]], color: '#00f0f0' },
  J: { shape: [[1,0,0],[1,1,1]], color: '#0000f0' },
  L: { shape: [[0,0,1],[1,1,1]], color: '#f0a000' },
  O: { shape: [[1,1],[1,1]], color: '#f0f000' },
  S: { shape: [[0,1,1],[1,1,0]], color: '#00f000' },
  T: { shape: [[0,1,0],[1,1,1]], color: '#a000f0' },
  Z: { shape: [[1,1,0],[0,1,1]], color: '#f00000' }
};

export const SCORES = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  SOFT_DROP: 1,
  HARD_DROP: 2
};
