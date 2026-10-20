import React from 'react';
import { ArrowUpRight, ArrowDownRight, Layers, DollarSign, ShieldCheck, Sparkles } from 'lucide-react';
import type { ConsolidatedStats } from '../types/azure.ts';

interface KPISummaryStripProps {
  stats: ConsolidatedStats;
  selectedMonthLabel?: string;
  onExploreReservations?: () => void;
}

export const KPISummaryStrip: React.FC<KPISummaryStripProps> = ({
  stats,
  selectedMonthLabel,
  onExploreReservations,
}) => {
  const isIncrease = stats.momSpendChangePercent > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Consolidated Total Spend */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>Total Consolidated Spend</span>
          <DollarSign className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          ${stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          <span>Across {stats.monthsCount} billing cycles</span>
          <span className="mx-1.5" aria-hidden="true">·</span>
          <span>Avg ${Math.round(stats.averageMonthlySpend).toLocaleString()}/mo</span>
        </div>
      </div>

      {/* KPI 2: Latest Month Velocity */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>{selectedMonthLabel || 'Latest Month Run-Rate'}</span>
          <span className="text-xs text-slate-400">MoM Change</span>
        </div>
        <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          ${stats.latestMonthSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="mt-2 flex items-center text-xs">
          <span
            className={`inline-flex items-center gap-0.5 font-medium tabular-nums ${
              isIncrease ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {isIncrease ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {isIncrease ? `+${stats.momSpendChangePercent}%` : `${stats.momSpendChangePercent}%`}
          </span>
          <span className="text-slate-400 mx-1.5" aria-hidden="true">·</span>
          <span className="text-slate-500">vs prior period</span>
        </div>
      </div>

      {/* KPI 3: Subscriptions & Invoices Count */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>Consolidated Scope</span>
          <Layers className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          {stats.subscriptionCount} Subscriptions
        </div>
        <div className="mt-2 text-xs text-slate-500">
          <span>{stats.invoiceCount} reconciled invoices</span>
          <span className="mx-1.5" aria-hidden="true">·</span>
          <span>Top: {stats.topSpendingSubscription.name} ({stats.topSpendingSubscription.percent}%)</span>
        </div>
      </div>

      {/* KPI 4: Reservation & Savings Coverage */}
      <div
        onClick={onExploreReservations}
        className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer group"
      >
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>Reservation Coverage</span>
          <ShieldCheck className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
        </div>
        <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          {stats.overallReservationCoveragePercent}%
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-emerald-700 font-medium tabular-nums flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            +${Math.round(stats.totalEstimatedSavings).toLocaleString()} saved
          </span>
          <span className="text-blue-600 font-medium group-hover:underline">View Breakdown &rarr;</span>
        </div>
      </div>
    </div>
  );
};
