-- EuroPay Backend Schema
-- Run with: psql -h localhost -U europay -d europay -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  pin_hash TEXT,
  avatar_initials TEXT NOT NULL DEFAULT 'EP',
  balance_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  level TEXT NOT NULL DEFAULT 'Bronze',
  points INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 650,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('virtual','physical')),
  color TEXT NOT NULL DEFAULT 'sunset',
  label TEXT NOT NULL DEFAULT 'EuroPay Card',
  last4 TEXT NOT NULL,
  frozen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('payment','receive','transfer_in','transfer_out')),
  amount_cents BIGINT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '💳',
  status TEXT NOT NULL DEFAULT 'done',
  counterparty_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT,
  avatar_initials TEXT NOT NULL DEFAULT '??',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  name TEXT NOT NULL,
  avatar_initials TEXT NOT NULL DEFAULT '??',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('me','them')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_owner ON chat_threads(owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON chat_messages(thread_id, created_at);
