import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'europay',
  password: process.env.PGPASSWORD || 'europay_dev_pw',
  database: process.env.PGDATABASE || 'europay',
  max: 10,
});

export const query = (text, params) => pool.query(text, params);
