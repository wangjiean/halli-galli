import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PORT, HOST } from './config.js';
import { db } from './db/store.js';
import authRoutes from './auth/auth.routes.js';
import scoreRoutes from './leaderboard/score.routes.js';
import leaderboardRoutes from './leaderboard/leaderboard.routes.js';
import RoomManager from './game/room.manager.js';
import setupSocketHandlers from './game/socket.handlers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api', leaderboardRoutes);

const roomManager = new RoomManager(io);
setupSocketHandlers(io, roomManager);

const clientDist = join(__dirname, '../client/dist');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

async function start() {
  try {
    await db.init();
    console.log('数据库初始化完成');

    httpServer.listen(PORT, HOST, () => {
      console.log(`服务器运行在 http://${HOST}:${PORT}`);
      console.log(`局域网访问地址：http://<你的 IP>:${PORT}`);
    });
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  roomManager.destroy();
  httpServer.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

start();
