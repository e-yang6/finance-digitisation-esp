'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProgressStepper } from '@/components/ProgressStepper';
import { Pencil, Plus, Trash2, ArrowRight, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SignOutButton } from '@/components/SignOutButton';
import type { LineItem, OcrResult } from '@/types';

interface StoredOcrData extends OcrResult {
  receiptBase64?: string;
}

export default function FillFormPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [ocrData, setOcrData] = useState<StoredOcrData | null>(null);
  const [vendor, setVendor] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [useOfFunds, setUseOfFunds] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [additionalExpenses, setAdditionalExpenses] = useState(0);
  const [editingItems, setEditingItems] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('ocrData');
    if (!stored) {
      router.replace('/apply');
      return;
    }
    const data: StoredOcrData = JSON.parse(stored);
    setOcrData(data);
    setVendor(data.vendor || '');
    setPurchaseDate(data.date || '');
    setLineItems(data.lineItems || []);
  }, [router]);

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const hst = lineItems.reduce((sum, item) => sum + (item.hst || 0), 0);
  const total = subtotal + hst + additionalExpenses;

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: '', amount: 0, hst: 0 }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleContinue() {
    if (!useOfFunds.trim()) {
      toast.error('Please describe the use of funds.');
      return;
    }
    if (!vendor.trim()) {
      toast.error('Vendor is required.');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('At least one line item is required.');
      return;
    }

    const formData = {
      vendor,
      purchaseDate,
      useOfFunds,
      lineItems,
      subtotal: Math.round(subtotal * 100) / 100,
      hst: Math.round(hst * 100) / 100,
      additionalExpenses,
      total: Math.round(total * 100) / 100,
      receiptBase64: ocrData?.receiptBase64,
    };
    sessionStorage.setItem('formData', JSON.stringify(formData));
    router.push('/apply/review');
  }

  if (!ocrData) return null;

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
          <span className="text-blue-200 text-sm">Page 2 of 3</span>
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
        <ProgressStepper currentStep={2} />

        <div className="space-y-6">
          {/* Applicant Information */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Applicant Information
              </span>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-blue-500" />
                <span className="text-xs text-blue-600 font-medium">
                  Autofilled from your profile
                </span>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <ReadOnlyField label="Payable To" value={session?.user.name || ''} />
              <ReadOnlyField label="Email" value={session?.user.email || ''} />
              <ReadOnlyField label="Committee / Club" value={session?.user.committee || ''} />
              <ReadOnlyField label="Requested By" value={session?.user.name || ''} />
            </div>
          </div>

          {/* Purchase Details */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Purchase Details
              </span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Vendor</Label>
                  <Input
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="Vendor name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Use of Funds</Label>
                <Textarea
                  value={useOfFunds}
                  onChange={(e) => setUseOfFunds(e.target.value)}
                  placeholder="Describe the purpose of this purchase..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Items Purchased */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Items Purchased
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-blue-600 font-medium">
                  Autofilled from receipt
                </span>
                <button
                  type="button"
                  onClick={() => setEditingItems(!editingItems)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Edit items"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-gray-600 font-medium">
                      Item Description
                    </th>
                    <th className="text-right px-4 py-2.5 text-gray-600 font-medium">
                      HST
                    </th>
                    <th className="text-right px-4 py-2.5 text-gray-600 font-medium">
                      Amount
                    </th>
                    {editingItems && <th className="w-8" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">
                        {editingItems ? (
                          <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className="text-gray-800">{item.description}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {editingItems ? (
                          <Input
                            type="number"
                            value={item.hst}
                            onChange={(e) => updateLineItem(i, 'hst', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm text-right w-24 ml-auto"
                            step="0.01"
                          />
                        ) : (
                          <span className="text-gray-600">{formatCurrency(item.hst)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {editingItems ? (
                          <Input
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateLineItem(i, 'amount', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm text-right w-24 ml-auto"
                            step="0.01"
                          />
                        ) : (
                          <span className="text-gray-800">{formatCurrency(item.amount)}</span>
                        )}
                      </td>
                      {editingItems && (
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeLineItem(i)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {editingItems && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2">
                        <button
                          type="button"
                          onClick={addLineItem}
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                          Add Row
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200">
              <div className="px-4 py-2 flex justify-between text-sm text-gray-600 bg-gray-50/50">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="px-4 py-2 flex justify-between text-sm text-gray-600 bg-gray-50/50">
                <span>HST</span>
                <span>{formatCurrency(hst)}</span>
              </div>
              <div className="px-4 py-2 flex justify-between text-sm text-gray-600 bg-gray-50/50">
                <span>Additional Expenses</span>
                <div className="flex items-center gap-2">
                  {editingItems ? (
                    <Input
                      type="number"
                      value={additionalExpenses}
                      onChange={(e) => setAdditionalExpenses(parseFloat(e.target.value) || 0)}
                      className="h-7 text-sm text-right w-24"
                      step="0.01"
                    />
                  ) : (
                    <span>{formatCurrency(additionalExpenses)}</span>
                  )}
                </div>
              </div>
              <div className="px-4 py-3 flex justify-between bg-[#1B2A4A] text-white font-bold">
                <span>TOTAL REQUESTED</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleContinue}
            className="bg-[#1B2A4A] hover:bg-[#243459] text-white"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700">
        {value || '—'}
      </div>
    </div>
  );
}
