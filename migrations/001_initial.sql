-- contestador-ai initial schema
-- Run with: npm run migrate

CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',   -- active | paused | cancelled
  plan          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ml_accounts (
  id              SERIAL PRIMARY KEY,
  customer_id     INT NOT NULL REFERENCES customers(id),
  ml_user_id      BIGINT UNIQUE NOT NULL,
  access_token    TEXT NOT NULL,            -- ENCRYPTED at rest
  refresh_token   TEXT NOT NULL,            -- ENCRYPTED at rest
  expires_at      TIMESTAMPTZ NOT NULL,
  connection      TEXT NOT NULL DEFAULT 'connected', -- connected | token_error | revoked
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_settings (
  customer_id     INT PRIMARY KEY REFERENCES customers(id),
  mode            TEXT NOT NULL DEFAULT 'draft',     -- draft | auto
  tone            TEXT,                              -- e.g. "cordial, voseo, breve"
  shipping_policy TEXT,
  returns_policy  TEXT,
  business_hours  TEXT,
  extra_rules     TEXT,                              -- free-form seller rules
  escalate_topics TEXT[],                            -- topics that ALWAYS escalate
  monthly_token_cap BIGINT NOT NULL DEFAULT 2000000
);

CREATE TABLE IF NOT EXISTS questions (
  id               SERIAL PRIMARY KEY,
  customer_id      INT NOT NULL REFERENCES customers(id),
  ml_question_id   BIGINT UNIQUE NOT NULL,
  item_id          TEXT NOT NULL,
  question_text    TEXT NOT NULL,
  answer_text      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
    -- pending | draft | answered | escalated | error | skipped
  llm_provider     TEXT,
  tokens_in        INT,
  tokens_out       INT,
  cost_usd         NUMERIC(10,6),
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS usage_monthly (
  customer_id  INT NOT NULL REFERENCES customers(id),
  month        DATE NOT NULL,
  questions    INT NOT NULL DEFAULT 0,
  tokens_in    BIGINT NOT NULL DEFAULT 0,
  tokens_out   BIGINT NOT NULL DEFAULT 0,
  cost_usd     NUMERIC(10,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (customer_id, month)
);

CREATE TABLE IF NOT EXISTS jobs (
  id           SERIAL PRIMARY KEY,
  type         TEXT NOT NULL,
  payload      JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'queued',  -- queued | running | done | failed
  attempts     INT NOT NULL DEFAULT 0,
  run_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  error        TEXT
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_jobs_status_run_at ON jobs (status, run_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_questions_customer_status ON questions (customer_id, status);

CREATE INDEX IF NOT EXISTS idx_ml_accounts_ml_user_id ON ml_accounts (ml_user_id);

-- Track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  id          SERIAL PRIMARY KEY,
  filename    TEXT UNIQUE NOT NULL,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
