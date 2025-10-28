import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const TOKEN_NAME = 'session';

export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '30d' });
}

export function parseToken(req, res, next) {
  const token = req.cookies[TOKEN_NAME];
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    res.clearCookie(TOKEN_NAME);
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'Forbidden' });
  next();
}

export async function ensureAdminSeed() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM users WHERE is_admin = TRUE');
  if (rows[0].c > 0) return;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const pass = process.env.ADMIN_PASSWORD || 'adminpass123';
  const hash = await bcrypt.hash(pass, 12);

  const { rows: created } = await pool.query(
    'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, TRUE) RETURNING id',
    [username, hash]
  );
  await pool.query('INSERT INTO wallets (user_id, coins) VALUES ($1, 0)', [created[0].id]);
  console.log(`[seed] admin user created: ${username}`);
}

export async function login(username, password, { ip, ua }) {
  const { rows: found } = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
  if (found.length === 0) {
    await pool.query('INSERT INTO login_audit (username, ok, ip, ua) VALUES ($1, FALSE, $2, $3)', [username, ip, ua]);
    return null;
  }
  const u = found[0];
  const ok = await bcrypt.compare(password, u.password_hash);
  await pool.query('INSERT INTO login_audit (user_id, username, ok, ip, ua) VALUES ($1, $2, $3, $4, $5)', [u.id, username, ok, ip, ua]);
  if (!ok) return null;
  return { id: u.id, username: u.username, is_admin: u.is_admin };
}
