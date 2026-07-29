export const toCents = (eur) => Math.round(Number(eur) * 100);
export const toEur = (cents) => Number(cents) / 100;

export const serializeUser = (u) => ({
  id: u.id,
  name: u.full_name,
  email: u.email,
  phone: u.phone,
  avatar: u.avatar_initials,
  balance: toEur(u.balance_cents),
  currency: u.currency,
  level: u.level,
  points: u.points,
  score: u.score,
  verified: u.verified,
});

export const serializeTx = (t) => ({
  id: t.id,
  type: t.type,
  amount: toEur(t.amount_cents),
  desc: t.description,
  icon: t.icon,
  status: t.status,
  date: t.created_at,
});

export const serializeCard = (c) => ({
  id: c.id,
  type: c.type,
  color: c.color,
  label: c.label,
  last4: c.last4,
  frozen: c.frozen,
});
