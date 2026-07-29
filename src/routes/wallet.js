import { Router } from 'express';
import { z } from 'zod';
import { query, pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeTx, serializeUser, toCents } from '../utils/money.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', async (req, res) => {
  const u = await query('SELECT * FROM users WHERE id = $1', [req.userId]);
  const txs = await query(
    'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
    [req.userId]
  );
  res.json({ user: serializeUser(u.rows[0]), recentTransactions: txs.rows.map(serializeTx) });
});

router.get('/transactions', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const txs = await query(
    'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [req.userId, limit]
  );
  res.json({ transactions: txs.rows.map(serializeTx) });
});

const topupSchema = z.object({ amount: z.number().positive().max(50000) });

router.post('/topup', async (req, res) => {
  const parsed = topupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid amount' });
  const cents = toCents(parsed.data.amount);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET balance_cents = balance_cents + $1 WHERE id = $2', [cents, req.userId]);
    const tx = await client.query(
      `INSERT INTO transactions (user_id, type, amount_cents, description, icon, status)
       VALUES ($1,'receive',$2,'Top up','💰','done') RETURNING *`,
      [req.userId, cents]
    );
    await client.query('COMMIT');
    res.status(201).json({ transaction: serializeTx(tx.rows[0]) });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Top up failed' });
  } finally {
    client.release();
  }
});

const sendSchema = z.object({
  recipientEmail: z.string().trim().email('Enter a valid recipient email'),
  amount: z.number().positive().max(50000),
  note: z.string().max(140).optional(),
});

router.post('/send', async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { recipientEmail, amount, note } = parsed.data;
  const cents = toCents(amount);

  const recipientRes = await query('SELECT * FROM users WHERE email = $1', [recipientEmail]);
  const recipient = recipientRes.rows[0];
  if (!recipient) return res.status(404).json({ error: 'No EuroPay user found with that email' });
  if (recipient.id === req.userId) return res.status(400).json({ error: "You can't send money to yourself" });

  const senderRes = await query('SELECT balance_cents FROM users WHERE id = $1', [req.userId]);
  if (senderRes.rows[0].balance_cents < cents) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET balance_cents = balance_cents - $1 WHERE id = $2', [cents, req.userId]);
    await client.query('UPDATE users SET balance_cents = balance_cents + $1 WHERE id = $2', [cents, recipient.id]);

    const desc = note?.trim() || `Transfer to ${recipient.full_name}`;
    const outTx = await client.query(
      `INSERT INTO transactions (user_id, type, amount_cents, description, icon, status, counterparty_user_id)
       VALUES ($1,'transfer_out',$2,$3,'↗️','done',$4) RETURNING *`,
      [req.userId, cents, desc, recipient.id]
    );
    await client.query(
      `INSERT INTO transactions (user_id, type, amount_cents, description, icon, status, counterparty_user_id)
       VALUES ($1,'transfer_in',$2,$3,'↙️','done',$4)`,
      [recipient.id, cents, note?.trim() || 'Transfer received', req.userId]
    );
    await client.query('COMMIT');
    res.status(201).json({ transaction: serializeTx(outTx.rows[0]) });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Transfer failed' });
  } finally {
    client.release();
  }
});

export default router;
