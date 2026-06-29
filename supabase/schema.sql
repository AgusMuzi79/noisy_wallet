-- ============================================================
-- Billetera Compartida — database schema
-- ============================================================

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '📦',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recurring income sources (each credited separately on the 1st)
CREATE TABLE IF NOT EXISTS recurring_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- All money movements: expenses, manual income, auto monthly credits
CREATE TABLE IF NOT EXISTS transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                 TEXT NOT NULL CHECK (type IN ('expense', 'income', 'recurring_credit')),
  amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category_id          UUID REFERENCES categories(id) ON DELETE SET NULL,
  author               TEXT CHECK (author IN ('agus', 'novia')),
  note                 TEXT,
  date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring_source_id  UUID REFERENCES recurring_sources(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevents double-crediting recurring sources on the 1st of each month
CREATE TABLE IF NOT EXISTS monthly_credits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year          INTEGER NOT NULL,
  month         INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_amount  NUMERIC(12,2) NOT NULL,
  credited_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

-- Singleton: app-wide settings (always 1 row, id=1)
CREATE TABLE IF NOT EXISTS settings (
  id                    INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  notification_enabled  BOOLEAN NOT NULL DEFAULT true,
  notification_hour     INTEGER NOT NULL DEFAULT 21 CHECK (notification_hour BETWEEN 0 AND 23),
  notification_minute   INTEGER NOT NULL DEFAULT 0  CHECK (notification_minute BETWEEN 0 AND 59),
  initial_balance       NUMERIC(12,2) NOT NULL DEFAULT 0,
  lock_enabled          BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- Row Level Security
-- No individual user accounts exist — both devices share the anon key.
-- RLS is enabled so the tables aren't open without credentials, and
-- policies grant full access to the anon role (the shared app key).
-- monthly_credits is write-guarded: only the Edge Function (service role)
-- can insert; the app only reads it.
-- ============================================================
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_credits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON categories        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON recurring_sources  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON transactions       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_read" ON monthly_credits   FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all" ON settings           FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- Helper view: current balance
-- ============================================================
CREATE OR REPLACE VIEW current_balance AS
SELECT
  s.initial_balance
  + COALESCE(SUM(CASE WHEN t.type IN ('income', 'recurring_credit') THEN t.amount ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN t.type = 'expense'                       THEN t.amount ELSE 0 END), 0)
  AS balance
FROM settings s
LEFT JOIN transactions t ON true
GROUP BY s.initial_balance;

-- ============================================================
-- Enable Realtime on tables synced between devices
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE recurring_sources;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- ============================================================
-- Default categories (Spanish)
-- ============================================================
INSERT INTO categories (name, icon, is_default) VALUES
  ('Supermercado',    '🛒', true),
  ('Restaurante',     '🍽️', true),
  ('Transporte',      '🚗', true),
  ('Salud',           '💊', true),
  ('Ropa',            '👕', true),
  ('Entretenimiento', '🎬', true),
  ('Servicios',       '💡', true),
  ('Alquiler',        '🏠', true),
  ('Mascotas',        '🐾', true),
  ('Otros',           '📦', true)
ON CONFLICT DO NOTHING;

-- Initial settings row
INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- Cron: credit recurring income on the 1st of each month
-- Runs at 03:05 UTC = 00:05 ART (UTC-3)
-- Requires pg_cron + pg_net extensions enabled in Supabase dashboard
-- ============================================================
-- SELECT cron.schedule(
--   'credit-monthly-income',
--   '5 3 1 * *',
--   $$
--     SELECT net.http_post(
--       url := current_setting('app.supabase_url') || '/functions/v1/credit-monthly-income',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--         'Content-Type',  'application/json'
--       ),
--       body := '{}'::jsonb
--     );
--   $$
-- );
