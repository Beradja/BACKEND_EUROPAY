import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/threads', async (req, res) => {
  const threads = await query(
    `SELECT t.*, 
       (SELECT body FROM chat_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_msg,
       (SELECT created_at FROM chat_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_at
     FROM chat_threads t WHERE t.owner_id = $1 ORDER BY last_at DESC NULLS LAST`,
    [req.userId]
  );
  res.json({
    threads: threads.rows.map((t) => ({
      id: t.id,
      name: t.name,
      avatar: t.avatar_initials,
      lastMsg: t.last_msg || '',
      time: t.last_at,
    })),
  });
});

const startSchema = z.object({
  name: z.string().trim().min(1),
  avatar: z.string().trim().min(1).max(4).default('??'),
});

router.post('/threads', async (req, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a contact name' });
  const { name, avatar } = parsed.data;
  const result = await query(
    `INSERT INTO chat_threads (owner_id, name, avatar_initials) VALUES ($1,$2,$3) RETURNING *`,
    [req.userId, name, avatar]
  );
  res.status(201).json({ thread: { id: result.rows[0].id, name, avatar, lastMsg: '', time: null } });
});

router.get('/threads/:id/messages', async (req, res) => {
  const thread = await query('SELECT id FROM chat_threads WHERE id = $1 AND owner_id = $2', [
    req.params.id,
    req.userId,
  ]);
  if (!thread.rows.length) return res.status(404).json({ error: 'Thread not found' });

  const messages = await query(
    'SELECT * FROM chat_messages WHERE thread_id = $1 ORDER BY created_at ASC',
    [req.params.id]
  );
  res.json({
    messages: messages.rows.map((m) => ({ id: m.id, sender: m.sender, body: m.body, time: m.created_at })),
  });
});

const msgSchema = z.object({ body: z.string().trim().min(1).max(2000) });

router.post('/threads/:id/messages', async (req, res) => {
  const parsed = msgSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Message cannot be empty' });

  const thread = await query('SELECT id FROM chat_threads WHERE id = $1 AND owner_id = $2', [
    req.params.id,
    req.userId,
  ]);
  if (!thread.rows.length) return res.status(404).json({ error: 'Thread not found' });

  const result = await query(
    `INSERT INTO chat_messages (thread_id, sender, body) VALUES ($1,'me',$2) RETURNING *`,
    [req.params.id, parsed.data.body]
  );
  const m = result.rows[0];
  res.status(201).json({ message: { id: m.id, sender: m.sender, body: m.body, time: m.created_at } });
});

export default router;
