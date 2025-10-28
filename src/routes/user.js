import express from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../middleware.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT username, is_admin FROM users WHERE id=$1', [req.user.id]);
  res.json({ id: req.user.id, ...rows[0] });
}));

router.get('/coins', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT coins FROM wallets WHERE user_id=$1', [req.user.id]);
  res.json({ coins: (rows[0]?.coins ?? 0).toString() });
}));

export default router;
