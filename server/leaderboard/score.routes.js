import { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import { db } from '../db/store.js';

const router = Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ success: false, error: '无效分数' });
    }

    const user = await db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const isNewRecord = score > (user.highScore || 0);
    const updates = {
      highScore: isNewRecord ? score : user.highScore,
      gamesPlayed: (user.gamesPlayed || 0) + 1
    };

    await db.updateUser(req.user.userId, updates);
    res.json({ success: true, isNewRecord });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
