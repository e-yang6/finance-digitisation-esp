/**
 * Server-only utilities — not safe to import in client components.
 * These functions use Node.js APIs (pg, etc).
 */
import { pool } from '@/lib/db';

export async function generateReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CR-${year}-`;

  const { rows } = await pool.query(
    `SELECT reference_number FROM submissions
     WHERE reference_number LIKE $1
     ORDER BY reference_number DESC
     LIMIT 1`,
    [`CR-${year}-%`]
  );

  let nextNum = 1;
  if (rows.length > 0) {
    const lastRef = rows[0].reference_number as string;
    const lastNum = parseInt(lastRef.split('-')[2], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}
