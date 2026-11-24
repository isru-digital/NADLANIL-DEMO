-- The community's sign-up. Brokers' details live here only, and only staff (the approvers) can read them.

-- a broker who asked to join
CREATE TABLE IF NOT EXISTS members (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,      -- lower case
  license     TEXT NOT NULL,             -- the broker's licence number
  work        TEXT NOT NULL,             -- 'office' | 'solo'
  office_name TEXT NOT NULL DEFAULT '',
  cities      TEXT NOT NULL DEFAULT '[]',-- JSON list
  areas       TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  reason      TEXT NOT NULL DEFAULT '',  -- why it was rejected
  is_test     INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  decided_at  INTEGER,
  decided_by  TEXT,                      -- the approver's name
  license_status TEXT NOT NULL DEFAULT '', -- 'verified' | 'not_found' | 'unavailable' (migrations/0002)
  registry_name  TEXT NOT NULL DEFAULT ''  -- the name in the Registrar of Real Estate Brokers
);
CREATE INDEX IF NOT EXISTS members_status ON members (status, created_at);

-- who may approve and who may open the approvers' screen. THE one list of approvers:
-- approver = 1 gets the approval e-mails; approver = 0 can only use the screen.
CREATE TABLE IF NOT EXISTS staff (
  email      TEXT PRIMARY KEY,           -- lower case
  name       TEXT NOT NULL,
  approver   INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  gets_leads INTEGER NOT NULL DEFAULT 0,  -- gets an e-mail on a new lead (migrations/0002)
  test_inbox INTEGER NOT NULL DEFAULT 0   -- while LEADS_MAIL is not 'live', lead e-mails go only here
);

-- one-time links. Only the SHA-256 of the token is kept, never the token.
--   decide: the two buttons of an approval e-mail (one token per approver per request)
--   login : a sign-in link
CREATE TABLE IF NOT EXISTS tokens (
  hash        TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  member_id   TEXT,
  staff_email TEXT,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER
);
CREATE INDEX IF NOT EXISTS tokens_member ON tokens (member_id);

-- signed-in devices. Only the SHA-256 of the session token is kept.
CREATE TABLE IF NOT EXISTS sessions (
  hash        TEXT PRIMARY KEY,
  member_id   TEXT,
  staff_email TEXT,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);

-- what was sent, to whom and whether it went out. No bodies are kept.
CREATE TABLE IF NOT EXISTS mail_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email   TEXT NOT NULL,
  kind       TEXT NOT NULL,
  status     TEXT NOT NULL,              -- 'sent' | 'no_password' | 'failed' | 'test'
  error      TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

-- a simple brake on repeated requests
CREATE TABLE IF NOT EXISTS rate (
  key      TEXT PRIMARY KEY,
  n        INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

-- when an approved broker opens the community (kept since 15.11.2026): first and last time, and sign-ins by link
CREATE TABLE IF NOT EXISTS activity (
  member_id TEXT PRIMARY KEY,
  first_at  INTEGER NOT NULL,
  last_at   INTEGER NOT NULL,
  signins   INTEGER NOT NULL DEFAULT 0
);
-- one row per broker per day (Israel time) he opened the community: "active this week"
CREATE TABLE IF NOT EXISTS visits (
  member_id TEXT NOT NULL,
  day       TEXT NOT NULL,             -- YYYY-MM-DD
  first_at  INTEGER NOT NULL,
  PRIMARY KEY (member_id, day)
);
CREATE INDEX IF NOT EXISTS visits_day ON visits (day);

-- local testing only (TEST_MODE): the e-mails that would have been sent, so a test can follow their links
CREATE TABLE IF NOT EXISTS outbox (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  html       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- the leads form of the office page (migrations/0002). Staff only: never shown anywhere public
CREATE TABLE IF NOT EXISTS leads (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  city       TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'new', -- 'new' | 'working' | 'closed'
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS leads_created ON leads (created_at);
