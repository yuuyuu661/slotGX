import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { asyncHandler } from '../middleware.js';
import { requireAdmin } from '../auth.js';

const router = express.Router();

router.post('/users', requireAdmin, asyncHandler(async (req, res) => {
  const { username, password, initial_coins = 0 } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: u } = await client.query(
      'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, FALSE) RETURNING id, username, is_admin',
      [username, hash]
    );
    await client.query('INSERT INTO wallets (user_id, coins) VALUES ($1, $2)', [u[0].id, initial_coins]);
    await client.query('COMMIT');
    res.json(u[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return res.status(409).json({ error: 'username already exists' });
    throw e;
  } finally {
    client.release();
  }
}));

router.post('/coins/adjust', requireAdmin, asyncHandler(async (req, res) => {
  const { username, delta, reason } = req.body;
  if (!username || !Number.isInteger(delta)) return res.status(400).json({ error: 'username and integer delta required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: users } = await client.query('SELECT id FROM users WHERE username=$1', [username]);
    if (users.length === 0) return res.status(404).json({ error: 'user not found' });
    const uid = users[0].id;

    const { rows: w } = await client.query('SELECT coins FROM wallets WHERE user_id=$1 FOR UPDATE', [uid]);
    if (w.length === 0) await client.query('INSERT INTO wallets (user_id, coins) VALUES ($1, 0)', [uid]);

    const newCoins = (w[0]?.coins ?? 0) + BigInt(delta);
    if (newCoins < 0n) return res.status(400).json({ error: 'insufficient coins' });

    await client.query('UPDATE wallets SET coins=$2, updated_at=NOW() WHERE user_id=$1', [uid, newCoins]);
    await client.query('INSERT INTO coin_transactions (user_id, delta, reason) VALUES ($1, $2, $3)', [uid, delta, reason || 'admin adjust']);

    await client.query('COMMIT');
    res.json({ username, coins: newCoins.toString() });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

export default router;
