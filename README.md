# EuroPay Backend

Node.js + Express + PostgreSQL API for the EuroPay web app. Fully tested end-to-end (signup, login, transfers, cards, chat) — this is real, running code, not a mock.

## Setup

1. **Install PostgreSQL** (if not already installed) and make sure it's running.
2. **Create the database and role:**
   ```sql
   CREATE ROLE europay WITH LOGIN PASSWORD 'europay_dev_pw';
   CREATE DATABASE europay OWNER europay;
   ```
3. **Apply the schema:**
   ```bash
   psql -h localhost -U europay -d europay -f src/db/schema.sql
   ```
4. **Configure environment** — copy `.env` and adjust if your Postgres credentials differ. **Change `JWT_SECRET` before deploying to production.**
5. **Install dependencies and run:**
   ```bash
   npm install
   node src/server.js
   ```
   Server starts on `http://localhost:4000` (health check at `/health`).

## API Reference

### Auth
| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/auth/signup` | `{ name, email, phone, password }` | Creates account, returns `{ token, user }`. Grants a €2500 welcome bonus + a starter virtual card. |
| POST | `/auth/login` | `{ email, password }` | Returns `{ token, user }` |
| GET | `/auth/me` | — (Bearer token) | Returns current user |

### Wallet
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/wallet/summary` | — | User + last 10 transactions |
| GET | `/wallet/transactions?limit=50` | — | Full transaction history |
| POST | `/wallet/topup` | `{ amount }` | Adds funds to balance |
| POST | `/wallet/send` | `{ recipientEmail, amount, note? }` | Transfers between two EuroPay users atomically |

### Cards
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/cards` | — | List user's cards |
| POST | `/cards` | `{ type: 'virtual'|'physical', color, label }` | Orders a new card |
| PATCH | `/cards/:id/freeze` | — | Toggles frozen state |

### Chat
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/chat/threads` | — | List conversations |
| POST | `/chat/threads` | `{ name, avatar }` | Start a new conversation |
| GET | `/chat/threads/:id/messages` | — | Messages in a thread |
| POST | `/chat/threads/:id/messages` | `{ body }` | Send a message |

All routes except `/auth/signup`, `/auth/login`, and `/health` require `Authorization: Bearer <token>`.

## Security notes for production
- Replace `JWT_SECRET` with a long random secret stored outside version control.
- Money is stored as integer cents (`*_cents` columns) to avoid floating-point rounding bugs — keep this convention if you extend the schema.
- `/wallet/send` runs inside a DB transaction, so a transfer can never debit one side without crediting the other.
- Passwords are hashed with bcrypt (cost factor 10); never store or log plaintext passwords.
- This is the first real backend milestone toward your planned Striga + AWS production setup — the schema and routes are structured so Striga can later sit behind the same `/wallet` and `/cards` endpoints without changing the frontend contract.
