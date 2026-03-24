import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { StatsCard } from '@/components/StatsCard';
import { SignOutButton } from '@/components/SignOutButton';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { SubmissionStatus } from '@/types';

interface SubmissionRow {
  id: string;
  reference_number: string;
  applicant_name: string;
  applicant_committee: string;
  vendor: string;
  total: string;
  submitted_at: string;
  status: SubmissionStatus;
}

async function getStats() {
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
  return rows[0];
}

async function getSubmissions() {
  const { rows } = await pool.query<SubmissionRow>(`
    SELECT
      s.id, s.reference_number, s.vendor, s.total, s.status, s.submitted_at,
      u.name AS applicant_name, u.committee AS applicant_committee
    FROM submissions s
    JOIN users u ON s.applicant_id = u.id
    ORDER BY s.submitted_at DESC
    LIMIT 50
  `);
  return rows;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== 'officer') {
    redirect('/apply');
  }

  const [stats, submissions] = await Promise.all([getStats(), getSubmissions()]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-[#1B2A4A] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-[#1B2A4A] text-xs font-bold">U</span>
          </div>
          <h1 className="text-white font-bold text-lg">EngSoc Cheque Requisition</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-sm font-medium">Officer Dashboard</span>
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {session.user.name.charAt(0)}
            </span>
          </div>
          <SignOutButton />
        </div>
      </header>

      {/* Role bar */}
      <div className="bg-[#243459] px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-sm">{session.user.name}</span>
          <span className="text-white/40 text-sm">•</span>
          <span className="text-white/60 text-sm">{session.user.email}</span>
        </div>
        <span className="bg-yellow-500/20 text-yellow-300 text-xs font-semibold px-3 py-1 rounded-full border border-yellow-500/30">
          {session.user.committee || 'Officer'}
        </span>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            label="Pending Review"
            value={stats.pending_review}
            accent="blue"
          />
          <StatsCard
            label="Awaiting VP Signature"
            value={stats.awaiting_vp_signature}
            accent="gold"
          />
          <StatsCard
            label="Approved This Week"
            value={stats.approved_this_week}
            accent="green"
          />
          <StatsCard
            label="Total Money Distributed"
            value={formatCurrency(parseFloat(stats.total_money_distributed))}
            accent="navy"
          />
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-600">
              Cheque Requisition Review
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1B2A4A] text-white">
                  <th className="text-left px-5 py-3 font-medium">Applicant</th>
                  <th className="text-left px-5 py-3 font-medium">Committee</th>
                  <th className="text-left px-5 py-3 font-medium">Vendor</th>
                  <th className="text-right px-5 py-3 font-medium">Amount</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {sub.applicant_name}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {sub.applicant_committee || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{sub.vendor || '—'}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-gray-900">
                      {formatCurrency(parseFloat(sub.total))}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {formatDate(sub.submitted_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/review/${sub.id}`}
                        className="text-[#1B2A4A] font-medium hover:underline text-xs uppercase tracking-wide"
                      >
                        {sub.status === 'approved' || sub.status === 'rejected'
                          ? 'View'
                          : 'Review →'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {submissions.length > 10 && (
            <div className="border-t border-gray-100 px-6 py-3 text-center">
              <button className="text-sm text-[#1B2A4A] font-medium hover:underline uppercase tracking-wide">
                SEE ALL RECORDS
              </button>
            </div>
          )}

          {submissions.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              No submissions yet.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
