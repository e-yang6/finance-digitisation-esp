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

  const TARGET_SECONDS = 540; // 9 minutes

  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) AS total_reviewed,
        ROUND(AVG(review_duration_seconds)) AS average_seconds,
        MIN(review_duration_seconds) AS min_seconds,
        MAX(review_duration_seconds) AS max_seconds
      FROM submissions
      WHERE review_duration_seconds IS NOT NULL
    `);

    const row = rows[0];
    const averageSeconds = row.average_seconds ? parseInt(row.average_seconds, 10) : null;

    return Response.json({
      averageSeconds,
      minSeconds: row.min_seconds ? parseInt(row.min_seconds, 10) : null,
      maxSeconds: row.max_seconds ? parseInt(row.max_seconds, 10) : null,
      totalReviewed: parseInt(row.total_reviewed, 10),
      targetSeconds: TARGET_SECONDS,
      onTarget: averageSeconds !== null ? averageSeconds <= TARGET_SECONDS : null,
    });
  } catch (error) {
    console.error('Review time stats error:', error);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
