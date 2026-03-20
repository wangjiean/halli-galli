import { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import { db } from '../db/store.js';

const router = Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { result } = req.body;
    
    if (!result || !['win', 'loss'].includes(result)) {
      return res.status(400).json({ success: false, error: '无效结果' });
    }

    const user = await db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const updates = {
      gamesPlayed: (user.gamesPlayed || 0) + 1,
      wins: (user.wins || 0) + (result === 'win' ? 1 : 0)
    };

    await db.updateUser(req.user.userId, updates);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
