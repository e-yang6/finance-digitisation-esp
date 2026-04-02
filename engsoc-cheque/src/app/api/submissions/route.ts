import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';
import { submissionSchema } from '@/lib/validations';
import { generateReferenceNumber } from '@/lib/server-utils';
import { sendSubmissionConfirmation, sendOfficerNewSubmissionNotification } from '@/lib/email';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = submissionSchema.parse(body);

    const referenceNumber = await generateReferenceNumber();

    // Convert base64 receipt to buffer if present
    let receiptBuffer: Buffer | null = null;
    if (data.receiptBase64) {
      const base64Data = data.receiptBase64.replace(/^data:image\/\w+;base64,/, '');
      receiptBuffer = Buffer.from(base64Data, 'base64');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO submissions (
          reference_number, applicant_id, vendor, purchase_date, use_of_funds,
          subtotal, hst, additional_expenses, total, status, receipt_image
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
        RETURNING id`,
        [
          referenceNumber,
          session.user.id,
          data.vendor,
          data.purchaseDate,
          data.useOfFunds,
          data.subtotal,
          data.hst,
          data.additionalExpenses,
          data.total,
          receiptBuffer,
        ]
      );

      const submissionId = rows[0].id;

      // Insert line items
      for (const item of data.lineItems) {
        await client.query(
          'INSERT INTO line_items (submission_id, description, amount, hst) VALUES ($1, $2, $3, $4)',
          [submissionId, item.description, item.amount, item.hst]
        );
      }

      await client.query('COMMIT');

      // Send confirmation email to applicant (non-blocking)
      sendSubmissionConfirmation({
        to: session.user.email,
        name: session.user.name,
        referenceNumber,
        vendor: data.vendor,
        total: data.total,
      }).catch((err) => console.error('Email send error:', err));

      // Notify all officers (non-blocking)
      pool.query(`SELECT email FROM users WHERE role = 'officer'`)
        .then(({ rows: officers }) =>
          Promise.allSettled(
            officers.map((officer) =>
              sendOfficerNewSubmissionNotification({
                to: officer.email,
                applicantName: session.user.name,
                referenceNumber,
                vendor: data.vendor,
                total: data.total,
              })
            )
          )
        )
        .catch((err) => console.error('Officer notification error:', err));

      return Response.json({ referenceNumber, submissionId }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Submission error:', error);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let query: string;
    let params: (string | null)[];

    if (session.user.role === 'officer') {
      query = `
        SELECT
          s.id, s.reference_number, s.vendor, s.purchase_date,
          s.subtotal, s.hst, s.additional_expenses, s.total,
          s.status, s.submitted_at, s.updated_at,
          u.name AS applicant_name, u.email AS applicant_email,
          u.committee AS applicant_committee
        FROM submissions s
        JOIN users u ON s.applicant_id = u.id
        ORDER BY s.submitted_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT
          s.id, s.reference_number, s.vendor, s.purchase_date,
          s.subtotal, s.hst, s.additional_expenses, s.total,
          s.status, s.submitted_at, s.updated_at,
          u.name AS applicant_name, u.email AS applicant_email,
          u.committee AS applicant_committee
        FROM submissions s
        JOIN users u ON s.applicant_id = u.id
        WHERE s.applicant_id = $1
        ORDER BY s.submitted_at DESC
      `;
      params = [session.user.id];
    }

    const { rows } = await pool.query(query, params);
    return Response.json(rows);
  } catch (error) {
    console.error('Get submissions error:', error);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
