import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  ArrowRight,
  Info,
} from 'lucide-react';
import type { MonthlyVarianceReport } from '../types/azure.ts';

interface VarianceAnomalySectionProps {
  report: MonthlyVarianceReport | null;
}

export const VarianceAnomalySection: React.FC<VarianceAnomalySectionProps> = ({ report }) => {
  if (!report) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-500 text-center text-sm py-12">
        At least two billing periods are required to calculate automated month-over-month variance.
      </div>
    );
  }

  const isNetIncrease = report.deltaTotal > 0;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
              Automated Variance Analytics
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>{report.previousMonthLabel}</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span>{report.currentMonthLabel}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Decomposition of cost variance drivers across subscriptions, services, and workloads
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-slate-500">Period Variance</div>
              <div
                className={`text-2xl font-bold font-mono tabular-nums ${
                  isNetIncrease ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {isNetIncrease ? `+$${report.deltaTotal.toLocaleString()}` : `-$${Math.abs(report.deltaTotal).toLocaleString()}`}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {isNetIncrease ? `+${report.percentTotalChange}%` : `${report.percentTotalChange}%`} total change
              </div>
            </div>
          </div>
        </div>

        {/* Anomaly Alerts Strip (if any detected) */}
        {report.anomalies.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-amber-600" />
              Automated Cost Spike Alerts ({report.anomalies.length})
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.anomalies.map(anom => (
                <div
                  key={anom.id}
                  className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      {anom.title}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-amber-800 shrink-0">
                      +${anom.impactAmount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-amber-900 leading-relaxed">
                    {anom.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Increase & Decrease Drivers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Top Increase Drivers */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Top Cost Expansion Drivers
              </h3>
            </div>

            {report.topIncreaseDrivers.length === 0 ? (
              <div className="text-xs text-slate-500 py-3">No cost increases detected.</div>
            ) : (
              <div className="space-y-2">
                {report.topIncreaseDrivers.map((driver, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-md border border-slate-200/80 text-xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{driver.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        ${driver.previousCost.toLocaleString()} &rarr; ${driver.currentCost.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono tabular-nums font-bold text-rose-600">
                        +${driver.deltaCost.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        +{driver.percentChange}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Decrease Drivers */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Top Cost Reductions & Savings
              </h3>
            </div>

            {report.topDecreaseDrivers.length === 0 ? (
              <div className="text-xs text-slate-500 py-3">No significant cost reductions in this period.</div>
            ) : (
              <div className="space-y-2">
                {report.topDecreaseDrivers.map((driver, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-md border border-slate-200/80 text-xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{driver.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        ${driver.previousCost.toLocaleString()} &rarr; ${driver.currentCost.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono tabular-nums font-bold text-emerald-600">
                        -${Math.abs(driver.deltaCost).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {driver.percentChange}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
