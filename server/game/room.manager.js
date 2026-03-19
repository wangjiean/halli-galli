import { db } from '../db/store.js';

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.playerRooms = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async createRoom(hostId, options) {
    const roomId = crypto.randomUUID();
    const room = {
      id: roomId,
      name: options.name || '房间',
      hostId,
      players: [{ userId: hostId, ready: false, score: 0, cards: 0 }],
      maxPlayers: Math.min(options.maxPlayers || 6, 6),
      enableAnimals: options.enableAnimals !== false,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      deck: [],
      centerPile: [],
      currentPlayerIndex: 0
    };

    await db.addRoom(room);
    this.rooms.set(roomId, room);
    this.playerRooms.set(hostId, roomId);

    return room;
  }

  async joinRoom(roomId, userId, playerName) {
    const room = await db.getRoomById(roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    if (room.status !== 'waiting') {
      throw new Error('房间已开始游戏');
    }
    if (room.players.length >= room.maxPlayers) {
      throw new Error(`房间已满 (最大${room.maxPlayers}人)`);
    }
    if (room.players.find(p => p.userId === userId)) {
      throw new Error('已在房间中');
    }

    room.players.push({ 
      userId, 
      name: playerName || `Player${room.players.length + 1}`,
      ready: false, 
      score: 0,
      cards: 0,
      hand: []
    });
    await db.updateRoom(roomId, room);
    this.rooms.set(roomId, room);
    this.playerRooms.set(userId, roomId);

    return room;
  }

  async leaveRoom(userId) {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) return null;

    const room = await db.getRoomById(roomId);
    if (!room) {
      this.playerRooms.delete(userId);
      return null;
    }

    const isHost = room.hostId === userId;
    room.players = room.players.filter(p => p.userId !== userId);
    this.playerRooms.delete(userId);

    if (room.players.length === 0) {
      await db.deleteRoom(roomId);
      this.rooms.delete(roomId);
      return { room, action: 'deleted' };
    }

    if (isHost) {
      room.hostId = room.players[0].userId;
    }

    await db.updateRoom(roomId, room);
    this.rooms.set(roomId, room);
    return { room, action: 'updated' };
  }

  async toggleReady(userId) {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) throw new Error('不在房间中');

    const room = await db.getRoomById(roomId);
    if (!room) throw new Error('房间不存在');

    const player = room.players.find(p => p.userId === userId);
    if (player) {
      player.ready = !player.ready;
      await db.updateRoom(roomId, room);
      this.rooms.set(roomId, room);
    }

    return room;
  }

  async startGame(roomId, deck) {
    const room = await db.getRoomById(roomId);
    if (!room) throw new Error('房间不存在');
    if (room.players.length < 2) throw new Error('人数不足');
    if (!room.players.every(p => p.ready)) throw new Error('有玩家未准备');

    room.status = 'playing';
    room.startedAt = new Date().toISOString();
    room.deck = deck;
    room.centerPile = [];
    room.currentPlayerIndex = 0;
    
    const cardsPerPlayer = Math.floor(deck.length / room.players.length);
    let cardIndex = 0;
    
    room.players.forEach((player) => {
      player.hand = deck.slice(cardIndex, cardIndex + cardsPerPlayer);
      player.cards = player.hand.length;
      cardIndex += cardsPerPlayer;
    });
    
    room.deck = deck.slice(cardIndex);

    await db.updateRoom(roomId, room);
    this.rooms.set(roomId, room);

    return room;
  }

  async updatePlayerCards(roomId, userId, cards) {
    const room = await db.getRoomById(roomId);
    if (!room) return null;

    const player = room.players.find(p => p.userId === userId);
    if (player) {
      player.cards = cards;
      player.hand = cards;
      await db.updateRoom(roomId, room);
      this.rooms.set(roomId, room);
    }

    return room;
  }

  async nextTurn(roomId) {
    const room = await db.getRoomById(roomId);
    if (!room || room.status !== 'playing') return null;

    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    await db.updateRoom(roomId, room);
    this.rooms.set(roomId, room);
    return room;
  }

  async endGame(roomId, winnerId) {
    const room = await db.getRoomById(roomId);
    if (!room) return null;

    room.status = 'finished';
    room.winnerId = winnerId;
    room.endedAt = new Date().toISOString();

    await db.updateRoom(roomId, room);
    this.rooms.set(roomId, room);
    return room;
  }

  async resetGame(roomId) {
    const room = await db.getRoomById(roomId);
    if (!room) return null;

    room.status = 'waiting';
    room.deck = [];
    room.centerPile = [];
    room.currentPlayerIndex = 0;
    room.winnerId = null;
    
    for (const player of room.players) {
      player.ready = false;
      player.hand = [];
      player.cards = 0;
    }

    await db.updateRoom(roomId, room);
    this.rooms.set(roomId, room);
    return room;
  }

  getPlayerRoom(userId) {
    return this.playerRooms.get(userId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  async getRooms() {
    return await db.getRooms();
  }

  cleanup() {
    const now = Date.now();
    for (const [roomId, room] of this.rooms) {
      const createdAt = new Date(room.createdAt).getTime();
      if (now - createdAt > 5 * 60 * 1000) {
        for (const player of room.players) {
          this.playerRooms.delete(player.userId);
        }
        this.rooms.delete(roomId);
        db.deleteRoom(roomId);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

export default RoomManager;
