import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config.js';
import { db } from '../db/store.js';

export async function register(username, password) {
  if (!username || !password) {
    throw new Error('用户名和密码不能为空');
  }

  if (username.length < 3 || username.length > 20) {
    throw new Error('用户名长度必须在 3-20 字符之间');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('用户名只能包含字母、数字和下划线');
  }

  if (password.length < 6 || password.length > 20) {
    throw new Error('密码长度必须在 6-20 字符之间');
  }

  const existingUser = await db.getUserByUsername(username);
  if (existingUser) {
    throw new Error('用户名已存在');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    username,
    passwordHash,
    highScore: 0,
    gamesPlayed: 0,
    battlesWon: 0,
    battlesLost: 0,
    createdAt: new Date().toISOString()
  };

  await db.addUser(user);
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function login(username, password) {
  if (!username || !password) {
    throw new Error('用户名和密码不能为空');
  }

  const user = await db.getUserByUsername(username);
  if (!user) {
    throw new Error('用户名或密码错误');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('用户名或密码错误');
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });

  const { passwordHash: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未授权' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Token 无效或已过期' });
  }

  req.user = decoded;
  next();
}

export function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('未授权'));
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error('Token 无效或已过期'));
  }

  socket.user = decoded;
  next();
}
