# Database Schema & Seed Data

## DDL

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  committee TEXT,
  role TEXT CHECK (role IN ('applicant', 'officer')) DEFAULT 'applicant',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE submissions (
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

CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  description TEXT,
  amount NUMERIC(10,2),
  hst NUMERIC(10,2)
);

CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES users(id),
  signature_order INT CHECK (signature_order IN (1,2)),
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, signature_order),
  UNIQUE(submission_id, officer_id)
);

-- Index for performance
CREATE INDEX idx_submissions_applicant ON submissions(applicant_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX idx_line_items_submission ON line_items(submission_id);
CREATE INDEX idx_signatures_submission ON signatures(submission_id);
```

---

## Seed Data

### Users

```sql
-- Officers (password: "officer123")
-- bcrypt hash of "officer123" with 12 rounds:
INSERT INTO users (id, name, email, password_hash, committee, role) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001',
   'Sarah Mitchell',
   'sarah.mitchell@utoronto.ca',
   '$2b$12$LQv3c1yqBwEHXXXXXXXXXeuGkF7R5b5zK2U4oX3vKJDtL7yZXXXXX',
   'VP Finance',
   'officer'),
  ('a1b2c3d4-0002-0002-0002-000000000002',
   'David Park',
   'david.park@utoronto.ca',
   '$2b$12$LQv3c1yqBwEHXXXXXXXXXeuGkF7R5b5zK2U4oX3vKJDtL7yZXXXXX',
   'Finance Committee',
   'officer');

-- Applicants (password: "applicant123")
INSERT INTO users (id, name, email, password_hash, committee, role) VALUES
  ('b1b2c3d4-0001-0001-0001-000000000001',
   'Alex Chen',
   'alex.chen@mail.utoronto.ca',
   '$2b$12$LQv3c1yqBwEHXXXXXXXXXeuGkF7R5b5zK2U4oX3vKJDtL7yZXXXXX',
   'ECE Club',
   'applicant'),
  ('b1b2c3d4-0002-0002-0002-000000000002',
   'Jamie Park',
   'jamie.park@mail.utoronto.ca',
   '$2b$12$LQv3c1yqBwEHXXXXXXXXXeuGkF7R5b5zK2U4oX3vKJDtL7yZXXXXX',
   'Hi-Skule',
   'applicant'),
  ('b1b2c3d4-0003-0003-0003-000000000003',
   'Liam Hartley',
   'liam.hartley@mail.utoronto.ca',
   '$2b$12$LQv3c1yqBwEHXXXXXXXXXeuGkF7R5b5zK2U4oX3vKJDtL7yZXXXXX',
   'Levy Funding',
   'applicant'),
  ('b1b2c3d4-0004-0004-0004-000000000004',
   'Priya Nair',
   'priya.nair@mail.utoronto.ca',
   '$2b$12$LQv3c1yqBwEHXXXXXXXXXeuGkF7R5b5zK2U4oX3vKJDtL7yZXXXXX',
   'Skule Nite',
   'applicant');
```

> **Note**: Replace the placeholder `$2b$12$LQv3c1yq...XXXXX` hashes with real bcrypt hashes generated at seed time. The `db/seed.ts` script will generate them dynamically.

### Submissions

```sql
INSERT INTO submissions (id, reference_number, applicant_id, vendor, purchase_date, use_of_funds,
  subtotal, hst, additional_expenses, total, status, submitted_at, review_started_at,
  review_completed_at, review_duration_seconds) VALUES
  -- Pending (Alex Chen / ECE Club / Staples Canada)
  ('c1b2c3d4-0001-0001-0001-000000000001',
   'CR-2026-0381',
   'b1b2c3d4-0001-0001-0001-000000000001',
   'Staples Canada', '2026-03-10', 'Office supplies for common room.',
   42.78, 4.94, 0, 47.72, 'pending',
   '2026-03-10 14:34:00+00', '2026-03-10 15:00:00+00', NULL, NULL),

  -- Awaiting VP (Jamie Park / Hi-Skule / Home Depot)
  ('c1b2c3d4-0002-0002-0002-000000000002',
   'CR-2026-0380',
   'b1b2c3d4-0002-0002-0002-000000000002',
   'Home Depot', '2026-03-06', 'Materials for Skule stage set.',
   256.35, 33.33, 0, 289.68, 'awaiting_vp',
   '2026-03-06 09:15:00+00', '2026-03-06 09:20:00+00', NULL, NULL),

  -- Approved (Liam Hartley / Levy Funding / Personal)
  ('c1b2c3d4-0003-0003-0003-000000000003',
   'CR-2026-0379',
   'b1b2c3d4-0003-0003-0003-000000000003',
   'Personal', '2026-03-02', 'Levy fund reimbursement.',
   9.65, 1.25, 0, 10.90, 'approved',
   '2026-03-02 11:00:00+00', '2026-03-02 11:05:00+00', '2026-03-02 11:14:00+00', 540),

  -- Rejected (Priya Nair / Skule Nite / Indigo Canada)
  ('c1b2c3d4-0004-0004-0004-000000000004',
   'CR-2026-0378',
   'b1b2c3d4-0004-0004-0004-000000000004',
   'Indigo Canada', '2026-02-29', 'Costumes for Skule Nite performance.',
   60.95, 7.92, 0, 68.87, 'rejected',
   '2026-02-29 16:20:00+00', '2026-02-29 16:22:00+00', '2026-02-29 16:28:00+00', 360);
```

### Line Items

```sql
-- CR-2026-0381 (Staples Canada)
INSERT INTO line_items (submission_id, description, amount, hst) VALUES
  ('c1b2c3d4-0001-0001-0001-000000000001', 'Binders (x2)', 15.76, 1.82),
  ('c1b2c3d4-0001-0001-0001-000000000001', 'Dry-erase Markers', 12.39, 1.43),
  ('c1b2c3d4-0001-0001-0001-000000000001', 'Lined paper', 14.63, 1.69);

-- CR-2026-0380 (Home Depot)
INSERT INTO line_items (submission_id, description, amount, hst) VALUES
  ('c1b2c3d4-0002-0002-0002-000000000002', 'Lumber (8ft 2x4, x6)', 89.94, 11.69),
  ('c1b2c3d4-0002-0002-0002-000000000002', 'Wood screws (box)', 18.99, 2.47),
  ('c1b2c3d4-0002-0002-0002-000000000002', 'Paint (2L, black)', 34.99, 4.55),
  ('c1b2c3d4-0002-0002-0002-000000000002', 'Paint brushes (set)', 22.99, 2.99),
  ('c1b2c3d4-0002-0002-0002-000000000002', 'Drop cloth', 89.45, 11.63);

-- CR-2026-0379 (Personal reimbursement)
INSERT INTO line_items (submission_id, description, amount, hst) VALUES
  ('c1b2c3d4-0003-0003-0003-000000000003', 'Levy fund reimbursement', 9.65, 1.25);

-- CR-2026-0378 (Indigo Canada)
INSERT INTO line_items (submission_id, description, amount, hst) VALUES
  ('c1b2c3d4-0004-0004-0004-000000000004', 'Costume accessories', 35.99, 4.68),
  ('c1b2c3d4-0004-0004-0004-000000000004', 'Fabric (2m)', 24.96, 3.24);
```

### Signatures

```sql
-- CR-2026-0380 (awaiting_vp): 1 signature from Finance Committee officer
INSERT INTO signatures (submission_id, officer_id, signature_order, signed_at) VALUES
  ('c1b2c3d4-0002-0002-0002-000000000002',
   'a1b2c3d4-0002-0002-0002-000000000002',
   1,
   '2026-03-06 09:30:00+00');

-- CR-2026-0379 (approved): 2 signatures
INSERT INTO signatures (submission_id, officer_id, signature_order, signed_at) VALUES
  ('c1b2c3d4-0003-0003-0003-000000000003',
   'a1b2c3d4-0002-0002-0002-000000000002',
   1,
   '2026-03-02 11:08:00+00'),
  ('c1b2c3d4-0003-0003-0003-000000000003',
   'a1b2c3d4-0001-0001-0001-000000000001',
   2,
   '2026-03-02 11:13:00+00');
```

---

## Migration File

Location: `src/lib/db/migrate.sql` — run once on fresh database.

## Seed Script

Location: `src/lib/db/seed.ts` — generates real bcrypt hashes and runs all INSERT statements above. Run with `npx ts-node src/lib/db/seed.ts`.
