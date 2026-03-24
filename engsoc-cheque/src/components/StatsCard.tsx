'use client';

import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  accent: 'blue' | 'gold' | 'green' | 'navy';
}

const accentClasses = {
  blue: 'border-l-blue-500',
  gold: 'border-l-yellow-500',
  green: 'border-l-green-500',
  navy: 'border-l-[#1B2A4A]',
};

export function StatsCard({ label, value, accent }: StatsCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-100 border-l-4 p-5',
        accentClasses[accent]
      )}
    >
      <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
