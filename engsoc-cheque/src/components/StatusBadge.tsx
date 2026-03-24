'use client';

import { cn } from '@/lib/utils';
import type { SubmissionStatus } from '@/types';

const statusConfig: Record<
  SubmissionStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'PENDING REVIEW',
    className: 'border border-blue-500 text-blue-600 bg-blue-50',
  },
  awaiting_vp: {
    label: 'AWAITING VP SIG',
    className: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  },
  approved: {
    label: 'APPROVED',
    className: 'bg-green-100 text-green-800 border border-green-300',
  },
  rejected: {
    label: 'REJECTED',
    className: 'bg-red-100 text-red-800 border border-red-300',
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: SubmissionStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
