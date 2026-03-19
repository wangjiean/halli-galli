import { socketAuthMiddleware } from '../auth/auth.middleware.js';
import RoomManager from './room.manager.js';
import { db } from '../db/store.js';

export function setupSocketHandlers(io, roomManager) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`用户连接：${socket.user.username} (${socket.id})`);

    socket.on('disconnect', () => {
      console.log(`用户断开：${socket.user.username}`);
      handleDisconnect(socket, roomManager);
    });

    socket.on('room:create', async (options, callback) => {
      try {
        const room = await roomManager.createRoom(socket.user.userId, options);
        socket.join(room.id);
        callback({ success: true, room });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    socket.on('room:join', async (roomId, playerName, callback) => {
      try {
        const room = await roomManager.joinRoom(roomId, socket.user.userId, playerName);
        socket.join(roomId);
        io.to(roomId).emit('room:updated', room);
        callback({ success: true, room });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    socket.on('room:leave', async (callback) => {
      try {
        const result = await roomManager.leaveRoom(socket.user.userId);
        if (result) {
          const roomId = result.room.id;
          socket.leave(roomId);
          if (result.action === 'deleted') {
            io.to(roomId).emit('room:deleted', roomId);
          } else {
            io.to(roomId).emit('room:updated', result.room);
          }
        }
        if (typeof callback === 'function') callback({ success: true });
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('room:ready', async (callback) => {
      try {
        const room = await roomManager.toggleReady(socket.user.userId);
        io.to(room.id).emit('room:updated', room);
        if (typeof callback === 'function') callback({ success: true, room });
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('room:start', async (callback) => {
      try {
        const roomId = roomManager.getPlayerRoom(socket.user.userId);
        if (!roomId) throw new Error('不在房间中');
        
        const room = await roomManager.getRoom(roomId);
        if (room.hostId !== socket.user.userId) {
          throw new Error('只有房主可以开始游戏');
        }

        const updatedRoom = await roomManager.startGame(roomId, updatedRoom.deck);
        io.to(roomId).emit('room:updated', updatedRoom);
        io.to(roomId).emit('game:start', {
          roomId: updatedRoom.id,
          enableAnimals: updatedRoom.enableAnimals,
          players: updatedRoom.players,
          currentPlayerIndex: updatedRoom.currentPlayerIndex
        });
        callback({ success: true, room: updatedRoom });
      } catch (err) {
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

        io.to(roomId).emit('game:bell-rung', {
          playerId: socket.user.userId,
          timestamp: Date.now(),
          centerPile: room.centerPile
        });

        callback({ success: true, bellData });
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
              io.to(roomId).emit('game:over', {
                roomId,
                winnerId: result.winnerId,
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

    socket.on('rooms:list', async (callback) => {
      try {
        const rooms = await roomManager.getRooms();
        const availableRooms = rooms.filter(r => 
          r.status === 'waiting' && 
          r.players.length < r.maxPlayers
        );
        callback({ success: true, rooms: availableRooms });
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
