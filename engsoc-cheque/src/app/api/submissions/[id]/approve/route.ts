import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';
import { sendApprovalNotification } from '@/lib/email';

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
    const signatureOrder: 1 | 2 = body.signatureOrder;

    if (signatureOrder !== 1 && signatureOrder !== 2) {
      return Response.json({ error: 'Invalid signature order.' }, { status: 400 });
    }

    // Check submission exists
    const { rows: subRows } = await pool.query(
      `SELECT s.id, s.status, s.review_started_at, s.reference_number, s.vendor, s.total,
              u.email, u.name
       FROM submissions s
       JOIN users u ON s.applicant_id = u.id
       WHERE s.id = $1`,
      [id]
    );
    if (subRows.length === 0) {
      return Response.json({ error: 'Submission not found.' }, { status: 404 });
    }

    const submission = subRows[0];

    // If adding sig 2, ensure sig 1 exists
    if (signatureOrder === 2) {
      const { rows: sig1Rows } = await pool.query(
        'SELECT id FROM signatures WHERE submission_id = $1 AND signature_order = 1',
        [id]
      );
      if (sig1Rows.length === 0) {
        return Response.json(
          { error: 'Signature 1 must be added before Signature 2.' },
          { status: 400 }
        );
      }
    }

    // Insert signature (UNIQUE constraints will enforce same-officer and same-order rules)
    try {
      await pool.query(
        'INSERT INTO signatures (submission_id, officer_id, signature_order) VALUES ($1, $2, $3)',
        [id, session.user.id, signatureOrder]
      );
    } catch (pgError: unknown) {
      const e = pgError as { code?: string; constraint?: string };
      if (e.code === '23505') {
        if (e.constraint === 'signatures_submission_id_officer_id_key') {
          return Response.json(
            { error: 'You have already signed this submission.' },
            { status: 400 }
          );
        }
        if (e.constraint === 'signatures_submission_id_signature_order_key') {
          return Response.json(
            { error: 'This signature position has already been filled.' },
            { status: 400 }
          );
        }
      }
      throw pgError;
    }

    // Update status
    if (signatureOrder === 1) {
      await pool.query(
        'UPDATE submissions SET status = $1, updated_at = NOW() WHERE id = $2',
        ['awaiting_vp', id]
      );
    } else {
      // Both signatures present — mark approved
      const reviewStartedAt = submission.review_started_at;
      await pool.query(
        `UPDATE submissions
         SET status = 'approved',
             review_completed_at = NOW(),
             review_duration_seconds = CASE
               WHEN $1::timestamptz IS NOT NULL
               THEN EXTRACT(EPOCH FROM (NOW() - $1::timestamptz))::INT
               ELSE NULL
             END,
             updated_at = NOW()
         WHERE id = $2`,
        [reviewStartedAt, id]
      );

      sendApprovalNotification({
        to: submission.email,
        name: submission.name,
        referenceNumber: submission.reference_number,
        vendor: submission.vendor,
        total: parseFloat(submission.total),
      }).catch((err) => console.error('Approval email error:', err));
    }

    return Response.json({ message: 'Signature added successfully.' });
  } catch (error) {
    console.error('Approve error:', error);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
