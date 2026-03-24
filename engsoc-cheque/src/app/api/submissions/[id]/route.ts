import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    // Get submission with applicant info
    const { rows } = await pool.query(
      `SELECT
        s.*,
        u.name AS applicant_name,
        u.email AS applicant_email,
        u.committee AS applicant_committee
      FROM submissions s
      JOIN users u ON s.applicant_id = u.id
      WHERE s.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Submission not found.' }, { status: 404 });
    }

    const submission = rows[0];

    // Applicants can only view their own submissions
    if (
      session.user.role === 'applicant' &&
      submission.applicant_id !== session.user.id
    ) {
      return Response.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // Set review_started_at if officer is opening for the first time
    if (
      session.user.role === 'officer' &&
      submission.review_started_at === null
    ) {
      await pool.query(
        'UPDATE submissions SET review_started_at = NOW() WHERE id = $1',
        [id]
      );
      submission.review_started_at = new Date().toISOString();
    }

    // Get line items
    const { rows: lineItems } = await pool.query(
      'SELECT id, description, amount, hst FROM line_items WHERE submission_id = $1 ORDER BY id',
      [id]
    );

    // Get signatures with officer names
    const { rows: signatures } = await pool.query(
      `SELECT sig.id, sig.submission_id, sig.officer_id, sig.signature_order, sig.signed_at,
        u.name AS officer_name
      FROM signatures sig
      JOIN users u ON sig.officer_id = u.id
      WHERE sig.submission_id = $1
      ORDER BY sig.signature_order`,
      [id]
    );

    return Response.json({
      id: submission.id,
      referenceNumber: submission.reference_number,
      applicant: {
        name: submission.applicant_name,
        email: submission.applicant_email,
        committee: submission.applicant_committee,
      },
      vendor: submission.vendor,
      purchaseDate: submission.purchase_date,
      useOfFunds: submission.use_of_funds,
      subtotal: parseFloat(submission.subtotal),
      hst: parseFloat(submission.hst),
      additionalExpenses: parseFloat(submission.additional_expenses || 0),
      total: parseFloat(submission.total),
      status: submission.status,
      rejectionNote: submission.rejection_note,
      reviewStartedAt: submission.review_started_at,
      reviewCompletedAt: submission.review_completed_at,
      reviewDurationSeconds: submission.review_duration_seconds,
      submittedAt: submission.submitted_at,
      lineItems: lineItems.map((li) => ({
        id: li.id,
        description: li.description,
        amount: parseFloat(li.amount),
        hst: parseFloat(li.hst),
      })),
      signatures,
    });
  } catch (error) {
    console.error('Get submission error:', error);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
