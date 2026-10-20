import React from 'react';
import { ArrowUpRight, ArrowDownRight, Layers, FileText, CheckCircle2 } from 'lucide-react';
import type { SubscriptionOverview } from '../types/azure.ts';

interface SubscriptionComparisonGridProps {
  subscriptions: SubscriptionOverview[];
  totalAllSpend: number;
  selectedSubscriptionId: string | null;
  onSelectSubscription: (subId: string | null) => void;
}

export const SubscriptionComparisonGrid: React.FC<SubscriptionComparisonGridProps> = ({
  subscriptions,
  totalAllSpend,
  selectedSubscriptionId,
  onSelectSubscription,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Subscription Portfolio Breakdown
          </h2>
          <p className="text-xs text-slate-500">
            Compare spending trajectory, reservation coverage, and cost drivers across {subscriptions.length} consolidated subscriptions
          </p>
        </div>

        {selectedSubscriptionId && (
          <button
            onClick={() => onSelectSubscription(null)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-md self-start sm:self-auto transition-colors"
          >
            Clear Filter (Show All Subscriptions)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {subscriptions.map(sub => {
          const isSelected = selectedSubscriptionId === sub.id;
          const shareOfTotal = totalAllSpend > 0 ? Math.round((sub.totalSpend / totalAllSpend) * 100) : 0;
          const isIncrease = sub.momDeltaAmount > 0;

          return (
            <div
              key={sub.id}
              onClick={() => onSelectSubscription(isSelected ? null : sub.id)}
              className={`bg-white rounded-xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header with Subscription color tag and name */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color }}
                    />
                    <h3 className="text-sm font-bold text-slate-900 truncate" title={sub.name}>
                      {sub.name}
                    </h3>
                  </div>

                  {isSelected && (
                    <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-mono text-slate-400 truncate mb-3">
                  ID: {sub.id}
                </div>

                {/* Total Spend */}
                <div className="mb-4">
                  <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
                    ${sub.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{shareOfTotal}% of total spend</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`inline-flex items-center font-medium tabular-nums ${
                        isIncrease ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {isIncrease ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {isIncrease ? `+${sub.momDeltaPercent}%` : `${sub.momDeltaPercent}%`}
                    </span>
                  </div>
                </div>

                {/* Mini details grid */}
                <div className="space-y-2 py-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Monthly Avg</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      ${Math.round(sub.monthlyAverage).toLocaleString()}/mo
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Top Cost Center</span>
                    <span className="font-medium text-slate-800 truncate max-w-[140px]" title={sub.topService.name}>
                      {sub.topService.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Reservation Coverage</span>
                    <span className="font-mono tabular-nums font-semibold text-teal-700">
                      {sub.reservationCoveragePercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer status */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  {sub.invoiceCount} invoices
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  {sub.activeMonthsCount} months
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
