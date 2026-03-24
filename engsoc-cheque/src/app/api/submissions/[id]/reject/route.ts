import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';
import { sendRejectionNotification } from '@/lib/email';

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'officer') {
    return Response.json({ error: 'Forbidden. Officers only.' }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const note: string | null = body.note || null;

    // Check submission exists
    const { rows } = await pool.query(
      `SELECT s.id, s.review_started_at, u.email, u.name
       FROM submissions s
       JOIN users u ON s.applicant_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Submission not found.' }, { status: 404 });
    }

    const { review_started_at, email, name } = rows[0];

    await pool.query(
      `UPDATE submissions
       SET status = 'rejected',
           rejection_note = $1,
           review_completed_at = NOW(),
           review_duration_seconds = CASE
             WHEN $2::timestamptz IS NOT NULL
             THEN EXTRACT(EPOCH FROM (NOW() - $2::timestamptz))::INT
             ELSE NULL
           END,
           updated_at = NOW()
       WHERE id = $3`,
      [note, review_started_at, id]
    );

    // Send rejection email (non-blocking)
    const { rows: subRows } = await pool.query(
      'SELECT reference_number FROM submissions WHERE id = $1',
      [id]
    );
    const referenceNumber = subRows[0]?.reference_number;

    sendRejectionNotification({
      to: email,
      name,
      referenceNumber,
      note,
    }).catch((err) => console.error('Rejection email error:', err));

    return Response.json({ message: 'Submission rejected.' });
  } catch (error) {
    console.error('Reject error:', error);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
