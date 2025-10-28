import express from 'express';
import { asyncHandler } from '../middleware.js';
import { requireAuth } from '../auth.js';
import { withTx } from '../db.js';

const router = express.Router();

router.post('/credit', requireAuth, asyncHandler(async (req, res) => {
  const { amount, reason } = req.body;
  if (!Number.isInteger(amount) || amount <= 0) return res.status(400).json({ error: 'positive integer amount required' });

  const result = await withTx(async (client) => {
    const { rows: w } = await client.query('SELECT coins FROM wallets WHERE user_id=$1 FOR UPDATE', [req.user.id]);
    const coins = BigInt(w[0]?.coins ?? 0);
    const next = coins + BigInt(amount);
    await client.query('UPDATE wallets SET coins=$2, updated_at=NOW() WHERE user_id=$1', [req.user.id, next]);
    await client.query('INSERT INTO coin_transactions (user_id, delta, reason) VALUES ($1, $2, $3)', [req.user.id, amount, reason || 'credit']);
    return next;
  });
  res.json({ coins: result.toString() });
}));

router.post('/debit', requireAuth, asyncHandler(async (req, res) => {
  const { amount, reason } = req.body;
  if (!Number.isInteger(amount) || amount <= 0) return res.status(400).json({ error: 'positive integer amount required' });

  const result = await withTx(async (client) => {
    const { rows: w } = await client.query('SELECT coins FROM wallets WHERE user_id=$1 FOR UPDATE', [req.user.id]);
    const coins = BigInt(w[0]?.coins ?? 0);
    const next = coins - BigInt(amount);
    if (next < 0n) throw Object.assign(new Error('insufficient coins'), { status: 400 });
    await client.query('UPDATE wallets SET coins=$2, updated_at=NOW() WHERE user_id=$1', [req.user.id, next]);
    await client.query('INSERT INTO coin_transactions (user_id, delta, reason) VALUES ($1, $2, $3)', [req.user.id, -amount, reason || 'debit']);
    return next;
  });
  res.json({ coins: result.toString() });
}));

export default router;
