import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { serializeUser } from '../utils/money.js';

const router = Router();

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Full name is too short'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().min(6, 'Enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { name, email, phone, password } = parsed.data;

  const existing = await query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
  if (existing.rows.length) {
    return res.status(409).json({ error: 'An account with this email or phone already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const initials = name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'EP';

  const result = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, avatar_initials, balance_cents, level, points, score)
     VALUES ($1,$2,$3,$4,$5, 250000, 'Bronze', 100, 700)
     RETURNING *`,
    [name, email, phone, passwordHash, initials]
  );
  const user = result.rows[0];

  await query(
    `INSERT INTO transactions (user_id, type, amount_cents, description, icon, status)
     VALUES ($1, 'receive', 250000, 'Welcome bonus', '🎉', 'done')`,
    [user.id]
  );
  await query(
    `INSERT INTO cards (user_id, type, color, label, last4) VALUES ($1, 'virtual', 'sunset', 'EuroPay Nature', $2)`,
    [user.id, String(Math.floor(1000 + Math.random() * 9000))]
  );

  const token = signToken(user.id);
  res.status(201).json({ token, user: serializeUser(user) });
});

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { email, password } = parsed.data;

  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  const token = signToken(user.id);
  res.json({ token, user: serializeUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await query('SELECT * FROM users WHERE id = $1', [req.userId]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: serializeUser(user) });
});

export default router;
