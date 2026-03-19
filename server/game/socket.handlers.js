import { socketAuthMiddleware } from '../auth/auth.middleware.js';
import RoomManager from './room.manager.js';

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

    socket.on('room:join', async (roomId, callback) => {
      try {
        const room = await roomManager.joinRoom(roomId, socket.user.userId);
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

        const updatedRoom = await roomManager.startGame(roomId);
        io.to(roomId).emit('room:updated', updatedRoom);
        io.to(roomId).emit('room:countdown', {
          roomId: updatedRoom.id,
          timeLimit: updatedRoom.timeLimit,
          seed: updatedRoom.seed,
          attackRule: updatedRoom.attackRule,
        });
        callback({ success: true, room: updatedRoom });

        // 限时模式：服务端权威计时器
        if (updatedRoom.mode === 'timed' && updatedRoom.timeLimit > 0) {
          const totalDelay = (3 + updatedRoom.timeLimit) * 1000; // 3秒倒计时 + 游戏时长
          setTimeout(async () => {
            const currentRoom = roomManager.getRoom(roomId);
            if (currentRoom && currentRoom.status === 'playing') {
              io.to(roomId).emit('game:time-up', { roomId });
            }
          }, totalDelay);
        }
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    socket.on('game:state', async (data) => {
      const roomId = roomManager.getPlayerRoom(socket.user.userId);
      if (!roomId) return;

      const room = await roomManager.getRoom(roomId);
      if (!room || room.status !== 'playing') return;

      const opponent = room.players.find(p => p.userId !== socket.user.userId);
      if (!opponent) return;

      const opponentSocket = [...io.sockets.sockets.values()].find(
        s => s.user.userId === opponent.userId
      );

      if (opponentSocket) {
        opponentSocket.emit('game:opponent-state', {
          board: data.board,
          currentPiece: data.currentPiece,
          score: data.score,
          level: data.level,
          lines: data.lines
        });
      }
    });

    socket.on('game:attack', async (data) => {
      const roomId = roomManager.getPlayerRoom(socket.user.userId);
      if (!roomId) return;

      const room = await roomManager.getRoom(roomId);
      if (!room || room.status !== 'playing' || !room.enableAttack) return;

      const opponent = room.players.find(p => p.userId !== socket.user.userId);
      if (!opponent) return;

      const opponentSocket = [...io.sockets.sockets.values()].find(
        s => s.user.userId === opponent.userId
      );

      if (opponentSocket) {
        opponentSocket.emit('game:attack-received', {
          lines: data.lines
        });
      }
    });

    socket.on('game:over', async (data) => {
      const roomId = roomManager.getPlayerRoom(socket.user.userId);
      if (!roomId) return;

      const room = await roomManager.getRoom(roomId);
      if (!room || room.status !== 'playing') return;

      // 先保存分数
      await roomManager.updatePlayerScore(roomId, socket.user.userId, data.score);
      // 获取更新后的房间（分数已写入但状态还是 playing）
      const roomWithScores = await roomManager.getRoom(roomId);
      // 构建结果：标记谁输了
      const results = roomWithScores.players.map(p => ({
        ...p,
        isLoser: p.userId === socket.user.userId,
      }));

      // 再重置房间状态
      const updatedRoom = await roomManager.endGame(roomId);
      io.to(roomId).emit('game:over', {
        roomId: updatedRoom.id,
        results,
        loserId: socket.user.userId,
      });
    });

    socket.on('rooms:list', async (callback) => {
      try {
        const rooms = await roomManager.getRooms();
        const availableRooms = rooms.filter(r => r.status === 'waiting' && r.players.length < 2);
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
