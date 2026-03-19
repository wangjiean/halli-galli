import { Router } from 'express';
import { db } from '../db/store.js';

const router = Router();

router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const leaderboard = await db.getLeaderboard(limit);
    res.json({ success: true, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
