-- Migration: 004_create_reminders
-- Description: Create reminders table with lifecycle status, attempts tracking, and claim index

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline_id UUID NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('48h', '24h', '6h', 'night_before', 'morning_of')),
  send_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NULL,
  error_details TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_claimable ON reminders(send_at, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_deadline_id ON reminders(deadline_id);

