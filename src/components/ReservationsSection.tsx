import React, { useState } from 'react';
import {
  Server,
  Globe,
  Boxes,
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { ReservationComponentType, ReservationSummary } from '../types/azure.ts';

interface ReservationsSectionProps {
  summaries: ReservationSummary[];
  currency: string;
}

export const ReservationsSection: React.FC<ReservationsSectionProps> = ({
  summaries,
  currency,
}) => {
  const [selectedComponent, setSelectedComponent] = useState<ReservationComponentType | 'all'>('all');

  const totalMonthlyCost = summaries.reduce((acc, s) => acc + s.totalMonthlyCost, 0);
  const totalSavings = summaries.reduce((acc, s) => acc + s.estimatedMonthlySavings, 0);
  const avgUtilization = Math.round(
    summaries.reduce((acc, s) => acc + s.averageUtilization, 0) / (summaries.length || 1)
  );

  const getComponentIcon = (type: ReservationComponentType) => {
    switch (type) {
      case 'Virtual Machines':
        return <Server className="w-5 h-5 text-blue-600" />;
      case 'App Services':
        return <Globe className="w-5 h-5 text-emerald-600" />;
      case 'AKS VMs (Kubernetes Node Pools)':
        return <Boxes className="w-5 h-5 text-indigo-600" />;
      case 'Azure SQL Database':
        return <Database className="w-5 h-5 text-amber-600" />;
      case 'Azure SQL Managed Instance':
        return <Cpu className="w-5 h-5 text-purple-600" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-slate-600" />;
    }
  };

  const filteredSummaries = selectedComponent === 'all'
    ? summaries
    : summaries.filter(s => s.componentType === selectedComponent);

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                Azure FinOps Commitments
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-xs text-slate-500">1-Year & 3-Year Reserved Capacity</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Reservation Portfolio & Cost Optimization
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Consolidated tracking of reserved instances across Virtual Machines, App Services, AKS Node Pools, Azure SQL, and Azure SQL Managed Instances.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-6 lg:border-l lg:border-slate-200 lg:pl-8">
            <div>
              <div className="text-xs text-slate-500">Monthly Reserved Cost</div>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                ${Math.round(totalMonthlyCost).toLocaleString()} <span className="text-xs font-normal text-slate-500">{currency}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Estimated Net Savings</div>
              <div className="text-xl font-bold text-emerald-600 font-mono tabular-nums flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                +${Math.round(totalSavings).toLocaleString()}/mo
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Avg Utilization</div>
              <div className="text-xl font-bold text-blue-600 font-mono tabular-nums">
                {avgUtilization}%
              </div>
            </div>
          </div>
        </div>

        {/* Component Selector Tabs */}
        <div className="pt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedComponent('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              selectedComponent === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            All Reservation Components ({summaries.length})
          </button>
          {summaries.map(s => (
            <button
              key={s.componentType}
              onClick={() => setSelectedComponent(s.componentType)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                selectedComponent === s.componentType
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{s.componentType}</span>
              <span className="font-mono tabular-nums text-[10px] opacity-75">
                (${Math.round(s.totalMonthlyCost / 1000)}k)
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Component Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSummaries.map((item) => {
          const isHighUtil = item.averageUtilization >= 85;

          return (
            <div
              key={item.componentType}
              className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      {getComponentIcon(item.componentType)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {item.componentType}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.termBreakdown.threeYearCount}x 3-Year · {item.termBreakdown.oneYearCount}x 1-Year
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                      isHighUtil
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {isHighUtil ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                    {item.averageUtilization}% Utilized
                  </span>
                </div>

                {/* Utilization Progress Bar */}
                <div className="my-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Capacity Utilization</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-700">
                      {item.averageUtilization}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isHighUtil ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${item.averageUtilization}%` }}
                    />
                  </div>
                </div>

                {/* Key Numbers */}
                <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 my-3">
                  <div>
                    <div className="text-[11px] text-slate-500">Monthly Run-Rate</div>
                    <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                      ${Math.round(item.totalMonthlyCost).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Monthly Savings</div>
                    <div className="text-base font-bold text-emerald-600 font-mono tabular-nums">
                      +${Math.round(item.estimatedMonthlySavings).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Active Contracts / Breakdown */}
                <div className="space-y-2 mt-3">
                  <div className="text-xs font-semibold text-slate-700">Active Commitments</div>
                  {item.topReservations.map((res, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{res.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{res.subscriptionName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-0.5 text-slate-500">
                            <Clock className="w-3 h-3" />
                            Exp: {res.expiryDate}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono tabular-nums font-semibold text-slate-900">
                          ${res.cost.toLocaleString()}/mo
                        </div>
                        <div className="text-[10px] font-mono tabular-nums text-emerald-600">
                          +{res.savings.toLocaleString()} saved
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FinOps Hint */}
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>
                  {item.componentType === 'Azure SQL Managed Instance'
                    ? 'Azure Hybrid Benefit active'
                    : item.componentType === 'AKS VMs (Kubernetes Node Pools)'
                    ? 'Kubernetes nodepool reservation'
                    : 'Auto-renewal configured'}
                </span>
                <span className="font-medium text-blue-600">Reconciled</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
