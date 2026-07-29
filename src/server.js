import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import cardsRoutes from './routes/cards.js';
import chatRoutes from './routes/chat.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ ok: true, service: 'europay-backend' }));

app.use('/auth', authRoutes);
app.use('/wallet', walletRoutes);
app.use('/cards', cardsRoutes);
app.use('/chat', chatRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler — never leak internals to the client
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`EuroPay backend listening on http://localhost:${port}`));
