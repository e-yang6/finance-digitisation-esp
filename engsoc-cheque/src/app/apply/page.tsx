'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ProgressStepper } from '@/components/ProgressStepper';
import {
  Upload,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SignOutButton } from '@/components/SignOutButton';
import type { OcrResult } from '@/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const PLACEHOLDER_OCR: OcrResult = {
  vendor: 'Staples Canada',
  date: '2026-03-15',
  processingTimeMs: 0,
  lineItems: [
    { description: 'Binders (x2)', amount: 15.76, hst: 1.82 },
    { description: 'Dry-erase Markers', amount: 12.39, hst: 1.43 },
    { description: 'Lined Paper', amount: 14.63, hst: 1.69 },
  ],
  subtotal: 42.78,
  hst: 4.94,
  total: 47.72,
};

export default function UploadReceiptPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setOcrResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);
      setProcessing(true);

      try {
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'OCR processing failed');
        }

        const result: OcrResult = await res.json();
        setOcrResult(result);

        // Store in sessionStorage for form page
        sessionStorage.setItem(
          'ocrData',
          JSON.stringify({ ...result, receiptBase64: base64 })
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'OCR failed. Please try again.');
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsDataURL(f);
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const f = acceptedFiles[0];
      if (!f) return;
      if (f.size > MAX_FILE_SIZE) {
        toast.error('File is too large. Maximum size is 5 MB.');
        return;
      }
      processFile(f);
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [] },
    maxFiles: 1,
    disabled: processing,
  });

  function handleReUpload() {
    setFile(null);
    setPreview(null);
    setOcrResult(null);
    sessionStorage.removeItem('ocrData');
  }

  function handleContinue() {
    if (!ocrResult) return;
    router.push('/apply/form');
  }

  function handleSkipWithDemoData() {
    setOcrResult(PLACEHOLDER_OCR);
    setFile(new File(['placeholder'], 'demo-receipt.jpg', { type: 'image/jpeg' }));
    sessionStorage.setItem(
      'ocrData',
      JSON.stringify({ ...PLACEHOLDER_OCR, receiptBase64: '' })
    );
    toast.success('Loaded demo receipt data — no OCR needed.');
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
          <span className="text-blue-200 text-sm">Page 1 of 3</span>
          <Button
            variant="outline"
            size="sm"
            className="text-white border-white/40 bg-white/10 hover:bg-white/20 hover:text-white"
          >
            Upload Receipt
          </Button>
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
        <ProgressStepper currentStep={1} />

        {/* Upload Zone */}
        {!file && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50/30'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Upload className="w-7 h-7 text-gray-400" />
              </div>
              <div>
                <p className="text-gray-700 font-medium text-lg">
                  {isDragActive
                    ? 'Drop your receipt here'
                    : 'Drag & drop receipt, or click to browse'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  JPG or PNG &bull; Max 5 MB &bull; Mobile Camera Supported
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-[#1B2A4A] text-[#1B2A4A] hover:bg-[#1B2A4A] hover:text-white"
              >
                Browse Files
              </Button>
            </div>
          </div>
        )}

        {/* DEV: Skip upload with placeholder data */}
        {!file && process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkipWithDemoData}
              className="border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100"
            >
              Skip with Demo Data (dev only)
            </Button>
          </div>
        )}

        {/* Processing state */}
        {file && processing && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Processing with Amazon Textract...</p>
            <p className="text-gray-400 text-sm mt-1">Extracting receipt data</p>
          </div>
        )}

        {/* OCR Results */}
        {ocrResult && !processing && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* OCR Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                OCR Extracted Data
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 italic">
                  Data extracted with Amazon Textract
                </span>
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-200">
                  PROCESSED IN {ocrResult.processingTimeMs}ms
                </span>
              </div>
            </div>

            <div className="p-6">
              {/* Vendor & Date */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Vendor
                  </p>
                  <p className="font-semibold text-gray-900">
                    {ocrResult.vendor || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Date
                  </p>
                  <p className="font-semibold text-gray-900">
                    {ocrResult.date
                      ? new Date(ocrResult.date).toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ocrResult.lineItems.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-gray-800">
                          {item.description}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600">
                          {formatCurrency(item.hst)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-800">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200">
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 text-sm">Subtotal</td>
                      <td />
                      <td className="px-4 py-2 text-right text-gray-700">
                        {formatCurrency(ocrResult.subtotal)}
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 text-sm">HST</td>
                      <td />
                      <td className="px-4 py-2 text-right text-gray-700">
                        {formatCurrency(ocrResult.hst)}
                      </td>
                    </tr>
                    <tr className="bg-[#1B2A4A] text-white">
                      <td className="px-4 py-2.5 font-bold">TOTAL</td>
                      <td />
                      <td className="px-4 py-2.5 text-right font-bold">
                        {formatCurrency(ocrResult.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <p className="text-xs text-gray-500 italic">
                  Auto filled information needed for cheque requisition (SF1)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        {file && !processing && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleReUpload}
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-Upload
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!ocrResult}
              className="bg-[#1B2A4A] hover:bg-[#243459] text-white"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
