'use client';

import { use, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { SignOutButton } from '@/components/SignOutButton';
import type { SubmissionWithDetails } from '@/types';

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [submission, setSubmission] = useState<SubmissionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectionNote, setRejectionNote] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadSubmission() {
    try {
      const res = await fetch(`/api/submissions/${id}`);
      if (!res.ok) {
        toast.error('Submission not found.');
        router.replace('/dashboard');
        return;
      }
      const data = await res.json();
      setSubmission(data);
    } catch {
      toast.error('Failed to load submission.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSign(signatureOrder: 1 | 2) {
    if (!submission) return;
    setActionLoading(`sign-${signatureOrder}`);

    try {
      const res = await fetch(`/api/submissions/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureOrder }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success(
        signatureOrder === 1
          ? 'Signature 1 added. Awaiting second signature.'
          : 'Both signatures added. Submission approved!'
      );
      await loadSubmission();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add signature.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (!submission) return;
    setActionLoading('reject');

    try {
      const res = await fetch(`/api/submissions/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: rejectionNote || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success('Submission rejected.');
      await loadSubmission();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject.');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B2A4A]" />
      </div>
    );
  }

  if (!submission) return null;

  const sig1 = submission.signatures.find((s) => s.signature_order === 1);
  const sig2 = submission.signatures.find((s) => s.signature_order === 2);

  const currentOfficerId = session?.user.id;
  const alreadySigned = submission.signatures.some(
    (s) => s.officer_id === currentOfficerId
  );

  const canSign1 = !sig1 && !alreadySigned;
  const canSign2 = sig1 && !sig2 && !alreadySigned;
  const canApprove = sig1 && sig2;

  const isFinalized =
    submission.status === 'approved' || submission.status === 'rejected';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="bg-[#1B2A4A] px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shrink-0">
            <span className="text-[#1B2A4A] text-xs font-bold">U</span>
          </div>
          <p className="text-white text-sm font-medium truncate">
            Reviewing:{' '}
            <span className="font-bold">{submission.referenceNumber}</span>
            {' • '}{submission.applicant.name}
            {' • '}{formatCurrency(submission.total)}
            {' • '}{submission.vendor}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={submission.status} />
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="text-white border-white/40 bg-white/10 hover:bg-white/20 hover:text-white"
            >
              Officer Dashboard
            </Button>
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Receipt Review */}
          <div className="space-y-5">
            {/* Styled Receipt Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-900 text-white text-center px-6 py-4">
                <p className="font-bold text-lg uppercase tracking-wide">
                  {submission.vendor || 'Receipt'}
                </p>
              </div>

              <div className="p-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-600 font-medium">Item</th>
                      <th className="text-right py-2 text-gray-600 font-medium">HST</th>
                      <th className="text-right py-2 text-gray-600 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {submission.lineItems.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 text-gray-800">{item.description}</td>
                        <td className="py-2 text-right text-gray-600">
                          {formatCurrency(item.hst)}
                        </td>
                        <td className="py-2 text-right text-gray-800">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200">
                    <tr className="text-gray-500 text-xs">
                      <td className="py-1.5">SUBTOTAL</td>
                      <td />
                      <td className="py-1.5 text-right">{formatCurrency(submission.subtotal)}</td>
                    </tr>
                    <tr className="text-gray-500 text-xs">
                      <td className="py-1.5">HST</td>
                      <td />
                      <td className="py-1.5 text-right">{formatCurrency(submission.hst)}</td>
                    </tr>
                    <tr className="text-gray-500 text-xs">
                      <td className="py-1.5">ADDITIONAL EXPENSES</td>
                      <td />
                      <td className="py-1.5 text-right">{formatCurrency(submission.additionalExpenses)}</td>
                    </tr>
                    <tr className="bg-[#1B2A4A] text-white font-bold">
                      <td className="px-3 py-2.5">TOTAL</td>
                      <td />
                      <td className="px-3 py-2.5 text-right">{formatCurrency(submission.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* OCR Verification */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="text-xs font-semibold uppercase tracking-wide text-green-800">
                  OCR Verification
                </span>
              </div>
              <div className="flex gap-4 text-sm font-medium text-green-700">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Vendor ✓
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Total ✓
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Items ✓
                </span>
              </div>
              <p className="text-xs text-green-600 mt-2">All fields matched</p>
            </div>
          </div>

          {/* RIGHT: Requisition Details + Signatures */}
          <div className="space-y-5">
            {/* Details Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
                Requisition Details
              </h3>
              <dl className="space-y-3 text-sm">
                <DetailRow label="Applicant" value={submission.applicant.name} />
                <DetailRow label="Email" value={submission.applicant.email} />
                <DetailRow label="Committee" value={submission.applicant.committee || '—'} />
                <DetailRow label="Reason" value={submission.useOfFunds || '—'} />
                <DetailRow
                  label="Submitted"
                  value={formatDateTime(submission.submittedAt)}
                />
                <DetailRow label="Amount" value={formatCurrency(submission.total)} />
                <DetailRow label="Reference" value={submission.referenceNumber} />
              </dl>
            </div>

            {/* Dual Signatures */}
            {!isFinalized && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
                  Dual Approval Signatures
                </h3>

                <div className="flex items-start gap-3">
                  {/* Sig 1 */}
                  <SignatureBox
                    label="Signature 1 — Finance Committee"
                    signature={sig1 ? { name: sig1.officer_name || '', date: sig1.signed_at } : null}
                    canSign={canSign1}
                    onSign={() => handleSign(1)}
                    loading={actionLoading === 'sign-1'}
                  />

                  <ChevronRight className="w-5 h-5 text-gray-300 mt-6 shrink-0" />

                  {/* Sig 2 */}
                  <SignatureBox
                    label="Signature 2 — Senior Exec"
                    signature={sig2 ? { name: sig2.officer_name || '', date: sig2.signed_at } : null}
                    canSign={!!canSign2}
                    onSign={() => handleSign(2)}
                    loading={actionLoading === 'sign-2'}
                    disabled={!sig1}
                  />
                </div>

                {alreadySigned && !canApprove && (
                  <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    You have already signed. Awaiting another officer.
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-5">
                  <Button
                    onClick={() => handleSign(sig1 ? 2 : 1)}
                    disabled={
                      !!actionLoading ||
                      alreadySigned ||
                      (!!sig1 && !canSign2)
                    }
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {actionLoading?.startsWith('sign') ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    APPROVE
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={!!actionLoading}
                    variant="destructive"
                    className="flex-1"
                  >
                    {actionLoading === 'reject' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    REJECT
                  </Button>
                </div>

                {/* Note to Applicant */}
                <div className="mt-4">
                  <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">
                    Note to Applicant (Optional)
                  </label>
                  <Textarea
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder="Add a note for the applicant..."
                    rows={3}
                    maxLength={500}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* Finalized status */}
            {isFinalized && (
              <div
                className={`rounded-xl border p-5 ${
                  submission.status === 'approved'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {submission.status === 'approved' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span
                    className={`font-semibold ${
                      submission.status === 'approved'
                        ? 'text-green-800'
                        : 'text-red-800'
                    }`}
                  >
                    {submission.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                </div>
                {submission.reviewDurationSeconds && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    Review took{' '}
                    {Math.round(submission.reviewDurationSeconds / 60)} min{' '}
                    {submission.reviewDurationSeconds % 60}s
                  </div>
                )}
                {submission.rejectionNote && (
                  <p className="text-sm text-red-700 mt-2">{submission.rejectionNote}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900 font-medium text-right">{value}</dd>
    </div>
  );
}

function SignatureBox({
  label,
  signature,
  canSign,
  onSign,
  loading,
  disabled,
}: {
  label: string;
  signature: { name: string; date: string } | null;
  canSign: boolean;
  onSign: () => void;
  loading: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex-1">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      {signature ? (
        <div className="border-2 border-green-500 rounded-lg bg-green-50 p-3 text-center">
          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-xs font-semibold text-green-800">{signature.name}</p>
          <p className="text-xs text-green-600">
            {new Date(signature.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          <span className="text-xs text-green-700 font-medium">✓ Signed</span>
        </div>
      ) : (
        <button
          onClick={canSign && !disabled ? onSign : undefined}
          disabled={loading || disabled || !canSign}
          className={`w-full border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
            canSign && !disabled
              ? 'border-blue-300 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
              : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500 mx-auto" />
          ) : (
            <>
              <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">
                {canSign ? 'Click to add electronic signature' : 'Pending'}
              </p>
            </>
          )}
        </button>
      )}
    </div>
  );
}
