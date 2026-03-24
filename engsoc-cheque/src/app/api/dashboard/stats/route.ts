import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'officer') {
    return Response.json({ error: 'Forbidden. Officers only.' }, { status: 403 });
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_review,
        COUNT(*) FILTER (WHERE status = 'awaiting_vp') AS awaiting_vp_signature,
        COUNT(*) FILTER (
          WHERE status = 'approved'
          AND review_completed_at >= date_trunc('week', NOW())
        ) AS approved_this_week,
        COALESCE(SUM(total) FILTER (WHERE status = 'approved'), 0) AS total_money_distributed
      FROM submissions
    `);

    const row = rows[0];
    return Response.json({
      pendingReview: parseInt(row.pending_review, 10),
      awaitingVpSignature: parseInt(row.awaiting_vp_signature, 10),
      approvedThisWeek: parseInt(row.approved_this_week, 10),
      totalMoneyDistributed: parseFloat(row.total_money_distributed),
    });
  } catch (error) {
    console.error('Stats error:', error);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
