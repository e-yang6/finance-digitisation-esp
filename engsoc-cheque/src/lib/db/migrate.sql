-- EngSoc Cheque Requisition System — Database Migration
-- Run once on a fresh PostgreSQL database

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  committee TEXT,
  role TEXT CHECK (role IN ('applicant', 'officer')) DEFAULT 'applicant',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT UNIQUE NOT NULL,
  applicant_id UUID REFERENCES users(id),
  vendor TEXT,
  purchase_date DATE,
  use_of_funds TEXT,
  subtotal NUMERIC(10,2),
  hst NUMERIC(10,2),
  additional_expenses NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2),
  status TEXT CHECK (status IN ('pending','awaiting_vp','approved','rejected')) DEFAULT 'pending',
  receipt_image BYTEA,
  rejection_note TEXT,
  review_started_at TIMESTAMPTZ,
  review_completed_at TIMESTAMPTZ,
  review_duration_seconds INT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  description TEXT,
  amount NUMERIC(10,2),
  hst NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES users(id),
  signature_order INT CHECK (signature_order IN (1,2)),
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, signature_order),
  UNIQUE(submission_id, officer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_applicant ON submissions(applicant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_items_submission ON line_items(submission_id);
CREATE INDEX IF NOT EXISTS idx_signatures_submission ON signatures(submission_id);
