-- Migration: 003_create_deadlines
-- Description: Create deadlines table supporting explicit time, date-only, and undated tasks

CREATE TABLE IF NOT EXISTS deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100) NULL,
  due_at TIMESTAMPTZ NULL,
  has_due_time BOOLEAN NOT NULL DEFAULT true,
  effort_hours NUMERIC(4, 1) NULL CHECK (effort_hours > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deadlines_user_status ON deadlines(user_id, status);
CREATE INDEX IF NOT EXISTS idx_deadlines_user_due_at ON deadlines(user_id, due_at);

