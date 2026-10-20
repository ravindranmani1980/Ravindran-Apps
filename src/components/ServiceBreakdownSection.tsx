import React, { useState } from 'react';
import type { MonthlySubscriptionSummary, AzureServiceCategory } from '../types/azure.ts';

interface ServiceBreakdownSectionProps {
  currentSummary: MonthlySubscriptionSummary | null;
  currency: string;
}

const CATEGORY_COLORS: Record<AzureServiceCategory, string> = {
  'Compute': '#2563eb', // Blue
  'AI & Machine Learning': '#7c3aed', // Purple
  'Databases': '#0d9488', // Teal
  'Storage': '#ea580c', // Orange
  'Networking': '#0284c7', // Sky Blue
  'Security & Identity': '#059669', // Emerald
  'Analytics & IoT': '#db2777', // Pink
  'Reservations & Commitments': '#4f46e5', // Indigo
  'Other Services': '#64748b', // Slate
};

export const ServiceBreakdownSection: React.FC<ServiceBreakdownSectionProps> = ({
  currentSummary,
  currency,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AzureServiceCategory | 'all'>('all');

  if (!currentSummary) {
    return null;
  }

  const totalCost = currentSummary.totalCost || 1;

  // Sorted categories by cost
  const categoryEntries = (Object.entries(currentSummary.byCategory) as [AzureServiceCategory, number][])
    .filter(([, cost]) => cost > 0)
    .sort(([, costA], [, costB]) => costB - costA);

  // Sorted individual services
  const serviceEntries = Object.entries(currentSummary.byService)
    .filter(([, cost]) => cost > 0)
    .sort(([, costA], [, costB]) => costB - costA);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Workload & Service Category Allocation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Spending distribution for <span className="font-semibold text-slate-700">{currentSummary.monthLabel}</span> (${currentSummary.totalCost.toLocaleString()} {currency})
          </p>
        </div>

        {selectedCategory !== 'all' && (
          <button
            onClick={() => setSelectedCategory('all')}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md"
          >
            Clear Category Filter
          </button>
        )}
      </div>

      {/* Multi-segment Category Distribution Bar */}
      <div className="pt-6">
        <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100">
          {categoryEntries.map(([cat, cost]) => {
            const widthPercent = (cost / totalCost) * 100;
            const color = CATEGORY_COLORS[cat] || '#64748b';
            return (
              <div
                key={cat}
                style={{ width: `${widthPercent}%`, backgroundColor: color }}
                className="h-full transition-all hover:opacity-80 cursor-pointer"
                title={`${cat}: $${cost.toLocaleString()} (${widthPercent.toFixed(1)}%)`}
                onClick={() => setSelectedCategory(cat)}
              />
            );
          })}
        </div>

        {/* Category Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          {categoryEntries.map(([cat, cost]) => {
            const percent = Math.round((cost / totalCost) * 100);
            const isSelected = selectedCategory === cat;
            const color = CATEGORY_COLORS[cat] || '#64748b';

            return (
              <div
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? 'all' : cat)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-medium text-slate-800 truncate" title={cat}>{cat}</span>
                </div>
                <div className="font-bold text-slate-900 font-mono tabular-nums">
                  ${Math.round(cost).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                  {percent}% share
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Individual Services Breakdown Table */}
      <div className="mt-6 pt-6 border-t border-slate-100">
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Top Azure Services Running
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {serviceEntries.slice(0, 8).map(([sName, cost]) => {
            const percent = (cost / totalCost) * 100;
            return (
              <div
                key={sName}
                className="p-3 rounded-lg bg-white border border-slate-200 text-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-slate-900 truncate" title={sName}>{sName}</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    ${Math.round(cost).toLocaleString()}
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>Share of Monthly Spend</span>
                  <span className="font-mono tabular-nums">{percent.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
