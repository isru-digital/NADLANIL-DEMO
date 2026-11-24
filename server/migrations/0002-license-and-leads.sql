-- 24.11.2026: the licence number checked against the Registrar of Real Estate Brokers (data.gov.il), and the leads
-- form of the office page. Only adds: no table or column is dropped or changed.
-- Local:  npx wrangler d1 execute nadlanup-db --local --file migrations/0002-license-and-leads.sql
-- Live (only with Itzik's yes): the same with --remote instead of --local.

-- 'verified': found in the registry, and the name is the registry's | 'not_found' | 'unavailable': the registry did
-- not answer | '' : asked before this check existed
ALTER TABLE members ADD COLUMN license_status TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN registry_name TEXT NOT NULL DEFAULT '';

-- who gets an e-mail on a new lead, and the one inbox every e-mail of a test goes to instead
ALTER TABLE staff ADD COLUMN gets_leads INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff ADD COLUMN test_inbox INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS leads (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  city       TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'new', -- 'new' | 'working' | 'closed'
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  updated_by TEXT                         -- the staff member's name
);
CREATE INDEX IF NOT EXISTS leads_created ON leads (created_at);
