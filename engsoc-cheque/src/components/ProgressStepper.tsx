'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  label: string;
  number: number;
}

const steps: Step[] = [
  { number: 1, label: 'Upload Receipt' },
  { number: 2, label: 'Fill Form' },
  { number: 3, label: 'Review & Submit' },
];

export function ProgressStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center py-6">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          {/* Circle */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                step.number < currentStep
                  ? 'bg-green-500 border-green-500 text-white'
                  : step.number === currentStep
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              )}
            >
              {step.number < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                'mt-1.5 text-xs font-medium whitespace-nowrap',
                step.number === currentStep
                  ? 'text-blue-600'
                  : step.number < currentStep
                  ? 'text-green-600'
                  : 'text-gray-400'
              )}
            >
              {step.label}
            </span>
          </div>

          {/* Connector */}
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-20 h-0.5 mx-2 mb-5',
                step.number < currentStep ? 'bg-green-400' : 'bg-gray-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
