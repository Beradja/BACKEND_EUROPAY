import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeCard } from '../utils/money.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const cards = await query('SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at ASC', [req.userId]);
  res.json({ cards: cards.rows.map(serializeCard) });
});

const orderSchema = z.object({
  type: z.enum(['virtual', 'physical']),
  color: z.enum(['graphite', 'sunset', 'forest']).default('sunset'),
  label: z.string().trim().min(1).max(40).default('EuroPay Card'),
});

router.post('/', async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { type, color, label } = parsed.data;
  const last4 = String(Math.floor(1000 + Math.random() * 9000));

  const result = await query(
    `INSERT INTO cards (user_id, type, color, label, last4) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.userId, type, color, label, last4]
  );
  res.status(201).json({ card: serializeCard(result.rows[0]) });
});

router.patch('/:id/freeze', async (req, res) => {
  const result = await query(
    'UPDATE cards SET frozen = NOT frozen WHERE id = $1 AND user_id = $2 RETURNING *',
    [req.params.id, req.userId]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Card not found' });
  res.json({ card: serializeCard(result.rows[0]) });
});

export default router;
