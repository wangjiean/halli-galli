import { socketAuthMiddleware } from '../auth/auth.middleware.js';
import RoomManager from './room.manager.js';
import { db } from '../db/store.js';
import validateBell from './bell.validator.js';
import generateDeck from './deck.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SocketHandler');

const BELL_COOLDOWN_MS = 200;
const MIN_REACTION_TIME_MS = 100;

const playerBellHistory = new Map();

function getPlayerBellHistory(playerId) {
  if (!playerBellHistory.has(playerId)) {
    playerBellHistory.set(playerId, []);
  }
  return playerBellHistory.get(playerId);
}

function checkBellRateLimit(playerId, timestamp) {
  const history = getPlayerBellHistory(playerId);
  const now = Date.now();
  
  history.push(timestamp);
  
  const recentBells = history.filter(t => now - t < BELL_COOLDOWN_MS);
  
  if (recentBells.length > 1) {
    history.filter(t => now - t < 1000);
    return {
      allowed: false,
      reason: '按铃过于频繁'
    };
  }
  
  history.filter(t => now - t < 1000);
  
  return { allowed: true };
}

function validateReactionTime(cardPlayedTime, bellTime) {
  const reactionTime = bellTime - cardPlayedTime;
  
  if (reactionTime < MIN_REACTION_TIME_MS) {
    return {
      valid: false,
      reason: '反应时间异常',
      reactionTime
    };
  }
  
  return {
    valid: true,
    reactionTime
  };
}

export function setupSocketHandlers(io, roomManager) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info(`用户连接：${socket.user.username} (${socket.id})`);

    socket.on('disconnect', () => {
      logger.info(`用户断开：${socket.user.username}`);
      playerBellHistory.delete(socket.user.userId);
      handleDisconnect(socket, roomManager);
    });

    socket.on('room:create', async (options, callback) => {
      logger.socket('room:create', { userId: socket.user.userId, options });
      try {
        const room = await roomManager.createRoom(socket.user.userId, options);
        socket.join(room.id);
        logger.info(`房间创建成功：${room.id} by ${socket.user.username}`);
        callback({ success: true, room });
      } catch (err) {
        logger.error('房间创建失败', err.message);
        callback({ success: false, error: err.message });
      }
    });

    socket.on('room:join', async (roomId, playerName, callback) => {
      logger.socket('room:join', { userId: socket.user.userId, roomId });
      try {
        const room = await roomManager.joinRoom(roomId, socket.user.userId, playerName);
        socket.join(roomId);
        io.to(roomId).emit('room:updated', room);
        logger.info(`用户加入房间：${socket.user.username} -> ${roomId}`);
        callback({ success: true, room });
      } catch (err) {
        logger.error('加入房间失败', err.message);
        callback({ success: false, error: err.message });
      }
    });

    socket.on('room:leave', async (callback) => {
      logger.socket('room:leave', { userId: socket.user.userId });
      try {
        const result = await roomManager.leaveRoom(socket.user.userId);
        if (result) {
          const roomId = result.room.id;
          socket.leave(roomId);
          if (result.action === 'deleted') {
            io.to(roomId).emit('room:deleted', roomId);
            logger.info(`房间已解散：${roomId}`);
          } else {
            io.to(roomId).emit('room:updated', result.room);
            logger.info(`用户离开房间：${socket.user.username} 离开 ${roomId}`);
          }
        }
        if (typeof callback === 'function') callback({ success: true });
      } catch (err) {
        logger.error('离开房间失败', err.message);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('room:ready', async (callback) => {
      logger.socket('room:ready', { userId: socket.user.userId });
      try {
        const room = await roomManager.toggleReady(socket.user.userId);
        io.to(room.id).emit('room:updated', room);
        logger.info(`用户准备状态切换：${socket.user.username}`);
        if (typeof callback === 'function') callback({ success: true, room });
      } catch (err) {
        logger.error('准备状态切换失败', err.message);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('room:start', async (callback) => {
      logger.socket('room:start', { userId: socket.user.userId });
      try {
        const roomId = roomManager.getPlayerRoom(socket.user.userId);
        if (!roomId) throw new Error('不在房间中');
        
        const room = await roomManager.getRoom(roomId);
        if (room.hostId !== socket.user.userId) {
          throw new Error('只有房主可以开始游戏');
        }

        const deck = generateDeck(room.enableAnimals);
        const startedRoom = await roomManager.startGame(roomId, deck);
        
        logger.info(`游戏开始：房间 ${roomId}，模式：${room.enableAnimals ? '极限' : '经典'}`);
        
        io.to(roomId).emit('room:updated', startedRoom);
        io.to(roomId).emit('game:start', {
          roomId: startedRoom.id,
          enableAnimals: startedRoom.enableAnimals,
          players: startedRoom.players,
          currentPlayerIndex: startedRoom.currentPlayerIndex
        });
        callback({ success: true, room: startedRoom });
      } catch (err) {
        logger.error('开始游戏失败', err.message);
        callback({ success: false, error: err.message });
      }
    });

    socket.on('rooms:list', async (callback) => {
      logger.socket('rooms:list', { userId: socket.user.userId });
      try {
        const rooms = await roomManager.getRooms();
        const availableRooms = rooms.filter(r => 
          r.status === 'waiting' && 
          r.players.length < r.maxPlayers
        );
        logger.debug(`返回房间列表：${availableRooms.length} 个可用房间`);
        callback({ success: true, rooms: availableRooms });
      } catch (err) {
        logger.error('获取房间列表失败', err.message);
        callback({ success: false, error: err.message });
      }
    });

    socket.on('game:play-card', async (callback) => {
      try {
        const roomId = roomManager.getPlayerRoom(socket.user.userId);
        if (!roomId) throw new Error('不在房间中');

        const room = await roomManager.getRoom(roomId);
        if (!room || room.status !== 'playing') throw new Error('游戏未开始');

        const player = room.players.find(p => p.userId === socket.user.userId);
        if (!player) throw new Error('玩家不存在');

        if (player.hand.length === 0) throw new Error('没有手牌');

        const card = player.hand.shift();
        player.cards = player.hand.length;
        room.centerPile.push(card);

        await roomManager.nextTurn(roomId);
        await db.updateRoom(roomId, room);
        roomManager.rooms.set(roomId, room);

        io.to(roomId).emit('game:card-played', {
          playerId: socket.user.userId,
          card,
          centerPile: room.centerPile,
          nextPlayerIndex: room.currentPlayerIndex
        });

        callback({ success: true, room });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    socket.on('game:bell', async (bellData, callback) => {
      try {
        const roomId = roomManager.getPlayerRoom(socket.user.userId);
        if (!roomId) throw new Error('不在房间中');

        const room = await roomManager.getRoom(roomId);
        if (!room || room.status !== 'playing') throw new Error('游戏未开始');

        const playerId = socket.user.userId;
        const bellTimestamp = Date.now();
        
        const rateLimitResult = checkBellRateLimit(playerId, bellTimestamp);
        if (!rateLimitResult.allowed) {
          return callback({ 
            success: false, 
            error: rateLimitResult.reason 
          });
        }

        let reactionTimeValidation = { valid: true };
        if (bellData?.cardPlayedTime && room.centerPile.length > 0) {
          reactionTimeValidation = validateReactionTime(bellData.cardPlayedTime, bellTimestamp);
          if (!reactionTimeValidation.valid) {
            return callback({ 
              success: false, 
              error: reactionTimeValidation.reason 
            });
          }
        }

        const bellValidation = validateBell(room.centerPile, room.enableAnimals);

        io.to(roomId).emit('game:bell-rung', {
          playerId,
          timestamp: bellTimestamp,
          centerPile: room.centerPile,
          bellValidation,
          reactionTime: reactionTimeValidation.reactionTime
        });

        callback({ 
          success: true, 
          bellData,
          bellValidation,
          reactionTime: reactionTimeValidation.reactionTime
        });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    socket.on('game:bell-result', async (result, callback) => {
      try {
        const roomId = roomManager.getPlayerRoom(socket.user.userId);
        if (!roomId) throw new Error('不在房间中');

        const room = await roomManager.getRoom(roomId);
        if (!room || room.status !== 'playing') throw new Error('游戏未开始');

        if (result.valid && result.winnerId) {
          const winner = room.players.find(p => p.userId === result.winnerId);
          if (winner) {
            winner.hand.push(...room.centerPile);
            winner.cards = winner.hand.length;
            room.centerPile = [];
            
            const totalCards = room.players.reduce((sum, p) => sum + p.cards, 0);
            if (winner.cards >= totalCards) {
              await roomManager.endGame(roomId, result.winnerId);
              
              const winnerId = result.winnerId;
              const loserId = room.players.find(p => p.userId !== winnerId)?.userId;
              
              io.to(roomId).emit('game:over', {
                roomId,
                winnerId,
                winner: winner.name
              });
            } else {
              await db.updateRoom(roomId, room);
              roomManager.rooms.set(roomId, room);
              io.to(roomId).emit('game:bell-success', {
                winnerId: result.winnerId,
                cardsCollected: room.centerPile.length,
                players: room.players
              });
            }
          }
        } else if (!result.valid) {
          const penalizedPlayer = room.players.find(p => p.userId === result.winnerId);
          if (penalizedPlayer && penalizedPlayer.hand.length > 0) {
            const otherPlayers = room.players.filter(p => p.userId !== result.winnerId);
            otherPlayers.forEach(player => {
              if (penalizedPlayer.hand.length > 0) {
                const card = penalizedPlayer.hand.pop();
                player.hand.push(card);
                player.cards = player.hand.length;
              }
            });
            penalizedPlayer.cards = penalizedPlayer.hand.length;
            
            await db.updateRoom(roomId, room);
            roomManager.rooms.set(roomId, room);
          }
          
          io.to(roomId).emit('game:bell-penalty', {
            playerId: result.winnerId,
            players: room.players
          });
        }

        callback({ success: true });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });
  });
}

async function handleDisconnect(socket, roomManager) {
  const result = await roomManager.leaveRoom(socket.user.userId);
  if (result) {
    const roomId = result.room.id;
    if (result.action === 'deleted') {
      socket.to(roomId).emit('room:deleted', roomId);
    } else {
      socket.to(roomId).emit('room:updated', result.room);
    }
  }
}

export default setupSocketHandlers;
