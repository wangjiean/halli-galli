import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DATA_FILE } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const defaultData = {
  users: [],
  rooms: []
};

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    const adapter = new JSONFile(DATA_FILE);
    const { Low } = await import('lowdb');
    this.db = new Low(adapter, defaultData);
    await this.db.read();
    this.db.data ||= defaultData;
    await this.db.write();
    return this.db;
  }

  async getUsers() {
    await this.db.read();
    return this.db.data.users || [];
  }

  async getUserById(id) {
    const users = await this.getUsers();
    return users.find(u => u.id === id);
  }

  async getUserByUsername(username) {
    const users = await this.getUsers();
    return users.find(u => u.username === username);
  }

  async addUser(user) {
    const users = await this.getUsers();
    users.push(user);
    this.db.data.users = users;
    await this.db.write();
    return user;
  }

  async updateUser(id, updates) {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      this.db.data.users = users;
      await this.db.write();
      return users[index];
    }
    return null;
  }

  async getRooms() {
    await this.db.read();
    return this.db.data.rooms || [];
  }

  async getRoomById(id) {
    const rooms = await this.getRooms();
    return rooms.find(r => r.id === id);
  }

  async addRoom(room) {
    const rooms = await this.getRooms();
    rooms.push(room);
    this.db.data.rooms = rooms;
    await this.db.write();
    return room;
  }

  async updateRoom(id, updates) {
    const rooms = await this.getRooms();
    const index = rooms.findIndex(r => r.id === id);
    if (index !== -1) {
      rooms[index] = { ...rooms[index], ...updates };
      this.db.data.rooms = rooms;
      await this.db.write();
      return rooms[index];
    }
    return null;
  }

  async deleteRoom(id) {
    const rooms = await this.getRooms();
    const filtered = rooms.filter(r => r.id !== id);
    this.db.data.rooms = filtered;
    await this.db.write();
  }

  async getLeaderboard(limit = 50) {
    const users = await this.getUsers();
    return users
      .filter(u => u.highScore !== undefined)
      .sort((a, b) => (b.highScore || 0) - (a.highScore || 0))
      .slice(0, limit)
      .map((u, i) => ({
        rank: i + 1,
        username: u.username,
        highScore: u.highScore || 0,
        gamesPlayed: u.gamesPlayed || 0
      }));
  }
}

export const db = new Database();
export default db;
