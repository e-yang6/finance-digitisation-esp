export type UserRole = 'applicant' | 'officer';

export type SubmissionStatus = 'pending' | 'awaiting_vp' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  committee: string | null;
  role: UserRole;
  created_at: string;
}

export interface LineItem {
  id?: string;
  submission_id?: string;
  description: string;
  amount: number;
  hst: number;
}

export interface Signature {
  id: string;
  submission_id: string;
  officer_id: string;
  officer_name?: string;
  signature_order: 1 | 2;
  signed_at: string;
}

export interface Submission {
  id: string;
  reference_number: string;
  applicant_id: string;
  vendor: string | null;
  purchase_date: string | null;
  use_of_funds: string | null;
  subtotal: number;
  hst: number;
  additional_expenses: number;
  total: number;
  status: SubmissionStatus;
  rejection_note: string | null;
  review_started_at: string | null;
  review_completed_at: string | null;
  review_duration_seconds: number | null;
  submitted_at: string;
  updated_at: string;
}

/** Matches the camelCase shape returned by GET /api/submissions/[id] */
export interface SubmissionWithDetails {
  id: string;
  referenceNumber: string;
  applicant: {
    name: string;
    email: string;
    committee: string | null;
  };
  vendor: string | null;
  purchaseDate: string | null;
  useOfFunds: string | null;
  subtotal: number;
  hst: number;
  additionalExpenses: number;
  total: number;
  status: SubmissionStatus;
  rejectionNote: string | null;
  reviewStartedAt: string | null;
  reviewCompletedAt: string | null;
  reviewDurationSeconds: number | null;
  submittedAt: string;
  lineItems: LineItem[];
  signatures: Signature[];
}

export interface OcrResult {
  vendor: string;
  date: string;
  processingTimeMs: number;
  lineItems: LineItem[];
  subtotal: number;
  hst: number;
  total: number;
}

export interface DashboardStats {
  pendingReview: number;
  awaitingVpSignature: number;
  approvedThisWeek: number;
  totalMoneyDistributed: number;
}

// Session type augmentation for next-auth v5
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      committee: string | null;
    };
  }
  interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    committee: string | null;
  }
  interface JWT {
    id: string;
    role: UserRole;
    committee: string | null;
  }
}
