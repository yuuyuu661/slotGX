import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { migrate } from './db.js';
import { ensureAdminSeed, parseToken, signToken, requireAuth } from './auth.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';
import coinRoutes from './routes/coins.js';
import { asyncHandler } from './middleware.js';
import { login } from './auth.js';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(parseToken);

app.get('/healthz', (req, res) => res.json({ ok: true }));
app.get('/debug/db', async (req, res) => {
  try {
    const { pool } = await import('./db.js');
    const r = await pool.query('SELECT NOW() as now');
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    console.error('[debug/db] error', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});


if (process.argv[2] === 'migrate') {
  (async () => { await migrate(); process.exit(0); })();
} else {
  (async () => {
    try {
      await migrate();
      console.log('[migrate] done');
      await ensureAdminSeed();
      console.log('[seed] checked');
    } catch (e) {
      console.error('[startup] migrate/seed failed', e);
    }
  })();
}

app.post('/api/login', asyncHandler(async (req, res) => {
  console.log('[login] attempt', req.body?.username);
  const { username, password } = req.body;
  const u = await login(username, password, { ip: req.ip, ua: req.headers['user-agent'] });
  if (!u) return res.status(401).json({ error: 'invalid credentials' });
  const token = signToken(u);
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30
  });
  res.json(u);
}));

app.post('/api/logout', requireAuth, (req, res) => {
  res.clearCookie('session');
  res.json({ ok: true });
});

app.use('/api/admin', adminRoutes);
app.use('/api', userRoutes);
app.use('/api/coins', coinRoutes);

app.use(express.static('public'));

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
