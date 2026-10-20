import React, { useState } from 'react';
import type { MonthlySubscriptionSummary, SubscriptionOverview } from '../types/azure.ts';

interface MonthlySpendChartProps {
  summaries: MonthlySubscriptionSummary[];
  subscriptions: SubscriptionOverview[];
  selectedMonthKey: string;
  onSelectMonth: (monthKey: string) => void;
}

export const MonthlySpendChart: React.FC<MonthlySpendChartProps> = ({
  summaries,
  subscriptions,
  selectedMonthKey,
  onSelectMonth,
}) => {
  const [viewMode, setViewMode] = useState<'subscriptions' | 'pricingModel'>('subscriptions');
  const [hoveredMonth, setHoveredMonth] = useState<MonthlySubscriptionSummary | null>(null);

  if (summaries.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500 py-12">
        No monthly spending data available.
      </div>
    );
  }

  // Find max monthly total for scale
  const maxSpend = Math.max(...summaries.map(s => s.totalCost), 1);
  const chartHeight = 240;
  const chartPaddingTop = 20;

  // Colors for subscriptions
  const subColorMap: Record<string, string> = {};
  subscriptions.forEach(s => {
    subColorMap[s.name] = s.color;
  });

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
      {/* Chart Header & Segmented Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Consolidated Monthly Spending Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a month bar to analyze cost variance, subscription distribution, and reservation impact
          </p>
        </div>

        {/* View Mode Segmented Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('subscriptions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'subscriptions'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Subscription
          </button>
          <button
            onClick={() => setViewMode('pricingModel')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'pricingModel'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            On-Demand vs Reservations
          </button>
        </div>
      </div>

      {/* SVG Stacked Bar Chart */}
      <div className="relative pt-6">
        <div className="h-64 flex items-end justify-between gap-3 sm:gap-6 px-2">
          {summaries.map((summary) => {
            const isSelected = summary.monthKey === selectedMonthKey;
            const barHeightPx = Math.max(12, (summary.totalCost / maxSpend) * (chartHeight - chartPaddingTop));

            return (
              <div
                key={summary.monthKey}
                onClick={() => onSelectMonth(summary.monthKey)}
                onMouseEnter={() => setHoveredMonth(summary)}
                onMouseLeave={() => setHoveredMonth(null)}
                className="flex-1 flex flex-col items-center cursor-pointer group focus:outline-hidden"
              >
                {/* Value on top of bar */}
                <div
                  className={`text-[11px] font-mono tabular-nums mb-1 transition-opacity ${
                    isSelected ? 'text-blue-700 font-semibold opacity-100' : 'text-slate-500 opacity-80 group-hover:opacity-100'
                  }`}
                >
                  ${(summary.totalCost / 1000).toFixed(1)}k
                </div>

                {/* Stacked Bar Container */}
                <div
                  className={`w-full max-w-[48px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all duration-150 ${
                    isSelected
                      ? 'ring-2 ring-blue-600 ring-offset-2'
                      : 'group-hover:brightness-95'
                  }`}
                  style={{ height: `${barHeightPx}px` }}
                >
                  {viewMode === 'subscriptions' ? (
                    // Segments by Subscription
                    Object.entries(summary.bySubscription).map(([subName, cost]) => {
                      const segmentHeightPercent = summary.totalCost > 0 ? (cost / summary.totalCost) * 100 : 0;
                      const color = subColorMap[subName] || '#64748b';
                      return (
                        <div
                          key={subName}
                          style={{
                            height: `${segmentHeightPercent}%`,
                            backgroundColor: color,
                          }}
                          className="w-full transition-all"
                          title={`${subName}: $${cost.toLocaleString()}`}
                        />
                      );
                    })
                  ) : (
                    // Segments by Pricing Model (Reservation vs On-Demand)
                    <>
                      <div
                        style={{
                          height: `${(summary.reservationCost / summary.totalCost) * 100}%`,
                          backgroundColor: '#0d9488', // Teal for reservations
                        }}
                        className="w-full"
                        title={`Reservations: $${summary.reservationCost.toLocaleString()}`}
                      />
                      <div
                        style={{
                          height: `${(summary.onDemandCost / summary.totalCost) * 100}%`,
                          backgroundColor: '#2563eb', // Blue for on-demand
                        }}
                        className="w-full"
                        title={`On-Demand: $${summary.onDemandCost.toLocaleString()}`}
                      />
                    </>
                  )}
                </div>

                {/* Month Label */}
                <div
                  className={`mt-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    isSelected ? 'text-blue-700 font-bold' : 'text-slate-600 group-hover:text-slate-900'
                  }`}
                >
                  {summary.monthLabel}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          {viewMode === 'subscriptions' ? (
            <div className="flex flex-wrap items-center gap-4">
              {subscriptions.map(sub => (
                <div key={sub.id} className="flex items-center gap-1.5 text-slate-700">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: sub.color }}
                  />
                  <span className="font-medium truncate max-w-[150px]">{sub.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-teal-600 shrink-0" />
                <span className="font-medium">Reservations & Commitments (VM, App Service, AKS, SQL)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 shrink-0" />
                <span className="font-medium">On-Demand Usage</span>
              </div>
            </div>
          )}

          <div className="text-slate-400 font-mono text-[11px]">
            Active Selection: {summaries.find(s => s.monthKey === selectedMonthKey)?.monthLabel || 'All'}
          </div>
        </div>

        {/* Hover / Inspection Card */}
        {hoveredMonth && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-900">{hoveredMonth.monthLabel} Total: </span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                ${hoveredMonth.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="text-slate-600">
                Reservations: <span className="font-mono tabular-nums font-semibold text-teal-700">${hoveredMonth.reservationCost.toLocaleString()}</span>
              </span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="text-slate-600">
                On-Demand: <span className="font-mono tabular-nums font-semibold text-blue-700">${hoveredMonth.onDemandCost.toLocaleString()}</span>
              </span>
            </div>
            <span className="text-slate-500">Click bar to lock inspection</span>
          </div>
        )}
      </div>
    </div>
  );
};
