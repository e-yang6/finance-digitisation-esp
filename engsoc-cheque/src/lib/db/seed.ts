/**
 * Seed script — generates real bcrypt hashes and inserts sample data.
 * Run with: npx ts-node --project tsconfig.json src/lib/db/seed.ts
 * (requires DATABASE_URL env var)
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  console.log('🌱 Seeding database...');

  // Read and run migration
  const migrateSql = fs.readFileSync(
    path.join(__dirname, 'migrate.sql'),
    'utf8'
  );
  await pool.query(migrateSql);
  console.log('✅ Schema created');

  // Generate password hashes
  const officerHash = await bcrypt.hash('officer123', 12);
  const applicantHash = await bcrypt.hash('applicant123', 12);

  // Clear existing seed data (idempotent)
  await pool.query(`
    DELETE FROM signatures WHERE submission_id IN (
      SELECT id FROM submissions WHERE reference_number LIKE 'CR-2026-%'
    );
    DELETE FROM line_items WHERE submission_id IN (
      SELECT id FROM submissions WHERE reference_number LIKE 'CR-2026-%'
    );
    DELETE FROM submissions WHERE reference_number LIKE 'CR-2026-%';
    DELETE FROM users WHERE email IN (
      'sarah.mitchell@gmail.com',
      'david.park@gmail.com',
      'alex.chen@gmail.com',
      'jamie.park@gmail.com',
      'liam.hartley@gmail.com',
      'priya.nair@gmail.com'
    );
  `);

  // Insert users
  await pool.query(`
    INSERT INTO users (id, name, email, password_hash, committee, role) VALUES
    ('a1b2c3d4-0001-0001-0001-000000000001', 'Sarah Mitchell', 'sarah.mitchell@gmail.com', $1, 'VP Finance', 'officer'),
    ('a1b2c3d4-0002-0002-0002-000000000002', 'David Park', 'david.park@gmail.com', $1, 'Finance Committee', 'officer'),
    ('b1b2c3d4-0001-0001-0001-000000000001', 'Alex Chen', 'alex.chen@gmail.com', $2, 'ECE Club', 'applicant'),
    ('b1b2c3d4-0002-0002-0002-000000000002', 'Jamie Park', 'jamie.park@gmail.com', $2, 'Hi-Skule', 'applicant'),
    ('b1b2c3d4-0003-0003-0003-000000000003', 'Liam Hartley', 'liam.hartley@gmail.com', $2, 'Levy Funding', 'applicant'),
    ('b1b2c3d4-0004-0004-0004-000000000004', 'Priya Nair', 'priya.nair@gmail.com', $2, 'Skule Nite', 'applicant')
  `, [officerHash, applicantHash]);
  console.log('✅ Users inserted');

  // Insert submissions
  await pool.query(`
    INSERT INTO submissions (id, reference_number, applicant_id, vendor, purchase_date,
      use_of_funds, subtotal, hst, additional_expenses, total, status,
      submitted_at, review_started_at, review_completed_at, review_duration_seconds) VALUES
    ('c1b2c3d4-0001-0001-0001-000000000001', 'CR-2026-0381',
      'b1b2c3d4-0001-0001-0001-000000000001',
      'Staples Canada', '2026-03-10', 'Office supplies for common room.',
      42.78, 4.94, 0, 47.72, 'pending',
      '2026-03-10 14:34:00+00', '2026-03-10 15:00:00+00', NULL, NULL),

    ('c1b2c3d4-0002-0002-0002-000000000002', 'CR-2026-0380',
      'b1b2c3d4-0002-0002-0002-000000000002',
      'Home Depot', '2026-03-06', 'Materials for Skule stage set.',
      256.35, 33.33, 0, 289.68, 'awaiting_vp',
      '2026-03-06 09:15:00+00', '2026-03-06 09:20:00+00', NULL, NULL),

    ('c1b2c3d4-0003-0003-0003-000000000003', 'CR-2026-0379',
      'b1b2c3d4-0003-0003-0003-000000000003',
      'Personal', '2026-03-02', 'Levy fund reimbursement.',
      9.65, 1.25, 0, 10.90, 'approved',
      '2026-03-02 11:00:00+00', '2026-03-02 11:05:00+00', '2026-03-02 11:14:00+00', 540),

    ('c1b2c3d4-0004-0004-0004-000000000004', 'CR-2026-0378',
      'b1b2c3d4-0004-0004-0004-000000000004',
      'Indigo Canada', '2026-02-28', 'Costumes for Skule Nite performance.',
      60.95, 7.92, 0, 68.87, 'rejected',
      '2026-02-28 16:20:00+00', '2026-02-28 16:22:00+00', '2026-02-28 16:28:00+00', 360)
  `);
  console.log('✅ Submissions inserted');

  // Insert line items
  await pool.query(`
    INSERT INTO line_items (submission_id, description, amount, hst) VALUES
    ('c1b2c3d4-0001-0001-0001-000000000001', 'Binders (x2)', 15.76, 1.82),
    ('c1b2c3d4-0001-0001-0001-000000000001', 'Dry-erase Markers', 12.39, 1.43),
    ('c1b2c3d4-0001-0001-0001-000000000001', 'Lined paper', 14.63, 1.69),
    ('c1b2c3d4-0002-0002-0002-000000000002', 'Lumber (8ft 2x4, x6)', 89.94, 11.69),
    ('c1b2c3d4-0002-0002-0002-000000000002', 'Wood screws (box)', 18.99, 2.47),
    ('c1b2c3d4-0002-0002-0002-000000000002', 'Paint (2L, black)', 34.99, 4.55),
    ('c1b2c3d4-0002-0002-0002-000000000002', 'Paint brushes (set)', 22.99, 2.99),
    ('c1b2c3d4-0002-0002-0002-000000000002', 'Drop cloth', 89.44, 11.63),
    ('c1b2c3d4-0003-0003-0003-000000000003', 'Levy fund reimbursement', 9.65, 1.25),
    ('c1b2c3d4-0004-0004-0004-000000000004', 'Costume accessories', 35.99, 4.68),
    ('c1b2c3d4-0004-0004-0004-000000000004', 'Fabric (2m)', 24.96, 3.24)
  `);
  console.log('✅ Line items inserted');

  // Insert signatures
  await pool.query(`
    INSERT INTO signatures (submission_id, officer_id, signature_order, signed_at) VALUES
    ('c1b2c3d4-0002-0002-0002-000000000002', 'a1b2c3d4-0002-0002-0002-000000000002', 1, '2026-03-06 09:30:00+00'),
    ('c1b2c3d4-0003-0003-0003-000000000003', 'a1b2c3d4-0002-0002-0002-000000000002', 1, '2026-03-02 11:08:00+00'),
    ('c1b2c3d4-0003-0003-0003-000000000003', 'a1b2c3d4-0001-0001-0001-000000000001', 2, '2026-03-02 11:13:00+00')
  `);
  console.log('✅ Signatures inserted');

  await pool.end();
  console.log('\n🎉 Seeding complete!');
  console.log('\nTest accounts:');
  console.log('  Officer:   sarah.mitchell@gmail.com / officer123');
  console.log('  Officer:   david.park@gmail.com / officer123');
  console.log('  Applicant: alex.chen@gmail.com / applicant123');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
