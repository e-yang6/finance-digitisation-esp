'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ProgressStepper } from '@/components/ProgressStepper';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SignOutButton } from '@/components/SignOutButton';
import type { LineItem } from '@/types';

interface FormData {
  vendor: string;
  purchaseDate: string;
  useOfFunds: string;
  lineItems: LineItem[];
  subtotal: number;
  hst: number;
  additionalExpenses: number;
  total: number;
  receiptBase64?: string;
}

export default function ReviewSubmitPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState<FormData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('formData');
    if (!stored) {
      router.replace('/apply');
      return;
    }
    setFormData(JSON.parse(stored));
  }, [router]);

  async function handleSubmit() {
    if (!formData || !session) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: formData.vendor,
          purchaseDate: formData.purchaseDate,
          useOfFunds: formData.useOfFunds,
          subtotal: formData.subtotal,
          hst: formData.hst,
          additionalExpenses: formData.additionalExpenses,
          total: formData.total,
          lineItems: formData.lineItems,
          receiptBase64: formData.receiptBase64,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      setReferenceNumber(data.referenceNumber);
      setSubmitted(true);
      sessionStorage.removeItem('ocrData');
      sessionStorage.removeItem('formData');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!formData) return null;

  // Confirmation screen
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-[#1B2A4A] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-[#1B2A4A] text-xs font-bold">U</span>
            </div>
            <h1 className="text-white font-bold text-lg">EngSoc Cheque Requisition</h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Submission Received
            </h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-4 mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Reference Number
              </p>
              <p className="text-2xl font-bold text-[#1B2A4A]">
                {referenceNumber}
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              A confirmation has been sent to{' '}
              <span className="font-medium">{session?.user.email}</span>
            </p>
            <Button
              onClick={() => router.push('/apply')}
              className="w-full bg-[#1B2A4A] hover:bg-[#243459] text-white"
            >
              Submit Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[#1B2A4A] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-[#1B2A4A] text-xs font-bold">U</span>
          </div>
          <h1 className="text-white font-bold text-lg">EngSoc Cheque Requisition</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-blue-200 text-sm">Page 3 of 3</span>
          <SignOutButton />
        </div>
      </header>

      {/* Logged-in bar */}
      {session && (
        <div className="bg-[#243459] px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-sm">{session.user.name}</span>
            <span className="text-white/40 text-sm">•</span>
            <span className="text-white/60 text-sm">{session.user.email}</span>
          </div>
          <span className="bg-[#1B2A4A] text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
            Applicant
          </span>
        </div>
      )}

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pb-10">
        <ProgressStepper currentStep={3} />

        <div className="space-y-6">
          {/* Applicant Info */}
          <ReviewSection title="Applicant Information">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <ReviewRow label="Payable To" value={session?.user.name || ''} />
              <ReviewRow label="Email" value={session?.user.email || ''} />
              <ReviewRow label="Committee / Club" value={session?.user.committee || ''} />
              <ReviewRow label="Requested By" value={session?.user.name || ''} />
            </div>
          </ReviewSection>

          {/* Purchase Details */}
          <ReviewSection title="Purchase Details">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <ReviewRow label="Vendor" value={formData.vendor} />
              <ReviewRow
                label="Purchase Date"
                value={
                  formData.purchaseDate
                    ? new Date(formData.purchaseDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'
                }
              />
            </div>
            <div className="mt-3 text-sm">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Use of Funds</p>
              <p className="text-gray-800">{formData.useOfFunds}</p>
            </div>
          </ReviewSection>

          {/* Items */}
          <ReviewSection title="Items Purchased">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Description</th>
                  <th className="text-right px-3 py-2 text-gray-600 font-medium">HST</th>
                  <th className="text-right px-3 py-2 text-gray-600 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {formData.lineItems.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-800">{item.description}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(item.hst)}</td>
                    <td className="px-3 py-2 text-right text-gray-800">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200">
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">Subtotal</td>
                  <td /><td className="px-3 py-2 text-right text-gray-700">{formatCurrency(formData.subtotal)}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">HST</td>
                  <td /><td className="px-3 py-2 text-right text-gray-700">{formatCurrency(formData.hst)}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">Additional Expenses</td>
                  <td /><td className="px-3 py-2 text-right text-gray-700">{formatCurrency(formData.additionalExpenses)}</td>
                </tr>
                <tr className="bg-[#1B2A4A] text-white font-bold">
                  <td className="px-3 py-2.5">TOTAL REQUESTED</td>
                  <td /><td className="px-3 py-2.5 text-right">{formatCurrency(formData.total)}</td>
                </tr>
              </tfoot>
            </table>
          </ReviewSection>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-gray-300 text-gray-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#1B2A4A] hover:bg-[#243459] text-white px-8"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              'Submit Application'
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          {title}
        </span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-gray-800 font-medium">{value || '—'}</p>
    </div>
  );
}
