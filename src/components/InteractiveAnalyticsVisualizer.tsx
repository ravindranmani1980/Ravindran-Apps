import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  Layers,
} from 'lucide-react';
import type {
  MonthlySubscriptionSummary,
  SubscriptionOverview,
  YearOverYearComparison,
  NormalizedCostRecord,
} from '../types/azure.ts';

interface InteractiveAnalyticsVisualizerProps {
  summaries: MonthlySubscriptionSummary[];
  subscriptions: SubscriptionOverview[];
  records: NormalizedCostRecord[];
  yoyComparison: YearOverYearComparison | null;
  currency: string;
  selectedMonthKey: string;
  onSelectMonth: (monthKey: string) => void;
  startMonth: string;
  endMonth: string;
  onDateRangeChange: (start: string, end: string) => void;
}

type ChartType = 'bar' | 'line' | 'pie' | 'yoy';

export const InteractiveAnalyticsVisualizer: React.FC<InteractiveAnalyticsVisualizerProps> = ({
  summaries,
  subscriptions,
  records,
  yoyComparison,
  currency,
  selectedMonthKey,
  onSelectMonth,
  startMonth,
  endMonth,
  onDateRangeChange,
}) => {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [pieMode, setPieMode] = useState<'service' | 'subscription'>('service');
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{
    label: string;
    value: number;
    subBreakdown?: Record<string, number>;
    serviceBreakdown?: Record<string, number>;
    yoyChange?: number;
    x?: number;
    y?: number;
  } | null>(null);

  // All distinct months in data
  const allMonths = useMemo(() => {
    return Array.from(new Set(records.map(r => r.billingPeriod))).sort();
  }, [records]);

  // Filtered summaries according to startMonth & endMonth
  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => {
      if (startMonth && s.monthKey < startMonth) return false;
      if (endMonth && s.monthKey > endMonth) return false;
      return true;
    });
  }, [summaries, startMonth, endMonth]);

  // Aggregate spending by service for the active date range
  const totalSpendByService = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => {
      if (startMonth && r.billingPeriod < startMonth) return;
      if (endMonth && r.billingPeriod > endMonth) return;
      map.set(r.serviceName, (map.get(r.serviceName) || 0) + r.cost);
    });
    return Array.from(map.entries())
      .map(([name, cost]) => ({ name, cost: Math.round(cost * 100) / 100 }))
      .sort((a, b) => b.cost - a.cost);
  }, [records, startMonth, endMonth]);

  // Aggregate spending by subscription for the active date range
  const totalSpendBySubscription = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => {
      if (startMonth && r.billingPeriod < startMonth) return;
      if (endMonth && r.billingPeriod > endMonth) return;
      map.set(r.subscriptionName, (map.get(r.subscriptionName) || 0) + r.cost);
    });
    return Array.from(map.entries())
      .map(([name, cost]) => ({ name, cost: Math.round(cost * 100) / 100 }))
      .sort((a, b) => b.cost - a.cost);
  }, [records, startMonth, endMonth]);

  // Quick range presets
  const applyPreset = (preset: '3m' | '6m' | '12m' | '2026' | 'all') => {
    if (allMonths.length === 0) return;
    const latest = allMonths[allMonths.length - 1];
    if (preset === 'all') {
      onDateRangeChange(allMonths[0], latest);
    } else if (preset === '3m') {
      const startIdx = Math.max(0, allMonths.length - 3);
      onDateRangeChange(allMonths[startIdx], latest);
    } else if (preset === '6m') {
      const startIdx = Math.max(0, allMonths.length - 6);
      onDateRangeChange(allMonths[startIdx], latest);
    } else if (preset === '12m') {
      const startIdx = Math.max(0, allMonths.length - 12);
      onDateRangeChange(allMonths[startIdx], latest);
    } else if (preset === '2026') {
      const y2026 = allMonths.filter(m => m.startsWith('2026'));
      if (y2026.length > 0) {
        onDateRangeChange(y2026[0], y2026[y2026.length - 1]);
      }
    }
  };

  const totalFilteredSpend = filteredSummaries.reduce((acc, s) => acc + s.totalCost, 0);
  const maxMonthlySpend = Math.max(...filteredSummaries.map(s => s.totalCost), 1);

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 280;
  const chartPadLeft = 40;
  const chartPadRight = 20;
  const chartPadTop = 20;
  const chartPadBottom = 40;
  const innerWidth = svgWidth - chartPadLeft - chartPadRight;
  const innerHeight = svgHeight - chartPadTop - chartPadBottom;

  // Subscription Colors
  const subColors: Record<string, string> = {
    'AI-Analytics-Foundry': '#7c3aed',
    'Prod-Core-US-East': '#2563eb',
    'AppServices-Web-Hub': '#0d9488',
    'Shared-Corp-Security': '#ea580c',
  };
  subscriptions.forEach(s => {
    if (!subColors[s.name]) subColors[s.name] = s.color;
  });

  const palette = ['#2563eb', '#7c3aed', '#0d9488', '#ea580c', '#0284c7', '#059669', '#db2777', '#f59e0b', '#64748b'];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
      {/* Top Controls: Chart Selector & Date Range Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Interactive Spending Visualizer
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500">Filtered Range: {startMonth} to {endMonth}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Automated Azure Spending Analytics & Visuals
          </h2>
        </div>

        {/* Chart Type Segmented Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                chartType === 'bar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Bar Chart
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                chartType === 'line'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              Line Trajectory
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                chartType === 'pie'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              Donut Distribution
            </button>
            <button
              onClick={() => setChartType('yoy')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                chartType === 'yoy'
                  ? 'bg-white text-blue-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Year-over-Year (YoY)
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Date Range:
          </span>

          <div className="flex items-center gap-2">
            <label className="text-slate-500">From:</label>
            <select
              aria-label="Start billing month"
              value={startMonth}
              onChange={e => onDateRangeChange(e.target.value, endMonth)}
              className="py-1 px-2.5 rounded-md border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-blue-600"
            >
              {allMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-500">To:</label>
            <select
              aria-label="End billing month"
              value={endMonth}
              onChange={e => onDateRangeChange(startMonth, e.target.value)}
              className="py-1 px-2.5 rounded-md border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-blue-600"
            >
              {allMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Presets:</span>
          <button
            onClick={() => applyPreset('3m')}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
          >
            Last 3M
          </button>
          <button
            onClick={() => applyPreset('6m')}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
          >
            Last 6M
          </button>
          <button
            onClick={() => applyPreset('12m')}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
          >
            Last 12M
          </button>
          <button
            onClick={() => applyPreset('2026')}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-medium"
          >
            2026 YTD
          </button>
          <button
            onClick={() => applyPreset('all')}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-medium"
          >
            All Time
          </button>
        </div>
      </div>

      {/* Main Visualization Canvas */}
      <div className="relative min-h-[300px]">
        {/* CHART TYPE 1: BAR CHART (Grouped / Stacked by Subscription with Hover) */}
        {chartType === 'bar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Hover over monthly bars to inspect exact spending breakdown</span>
              <span className="font-mono tabular-nums">Range Total: ${totalFilteredSpend.toLocaleString()} {currency}</span>
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[320px]">
                {/* Horizontal gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = chartPadTop + innerHeight * (1 - pct);
                  const labelVal = Math.round((maxMonthlySpend * pct) / 1000);
                  return (
                    <g key={idx}>
                      <line
                        x1={chartPadLeft}
                        y1={y}
                        x2={svgWidth - chartPadRight}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray={pct === 0 ? 'none' : '3 3'}
                      />
                      <text
                        x={chartPadLeft - 8}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="10"
                        fill="#94a3b8"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        ${labelVal}k
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {filteredSummaries.map((summary, idx) => {
                  const n = filteredSummaries.length;
                  const barWidth = Math.min(48, Math.max(16, (innerWidth / n) * 0.65));
                  const x = chartPadLeft + (idx + 0.5) * (innerWidth / n) - barWidth / 2;
                  const isSelected = summary.monthKey === selectedMonthKey;

                  let currentY = chartPadTop + innerHeight;

                  return (
                    <g
                      key={summary.monthKey}
                      className="cursor-pointer group"
                      onClick={() => onSelectMonth(summary.monthKey)}
                      onMouseEnter={() => {
                        setHoveredDataPoint({
                          label: summary.monthLabel,
                          value: summary.totalCost,
                          subBreakdown: summary.bySubscription,
                          serviceBreakdown: summary.byService,
                        });
                      }}
                      onMouseLeave={() => setHoveredDataPoint(null)}
                    >
                      {/* Selection highlight column */}
                      {isSelected && (
                        <rect
                          x={x - 4}
                          y={chartPadTop}
                          width={barWidth + 8}
                          height={innerHeight}
                          fill="#3b82f6"
                          opacity="0.08"
                          rx="4"
                        />
                      )}

                      {/* Stacked Subscription Segments */}
                      {Object.entries(summary.bySubscription).map(([subName, cost]) => {
                        const segHeight = (cost / maxMonthlySpend) * innerHeight;
                        currentY -= segHeight;
                        const color = subColors[subName] || '#64748b';

                        return (
                          <rect
                            key={subName}
                            x={x}
                            y={currentY}
                            width={barWidth}
                            height={Math.max(2, segHeight)}
                            fill={color}
                            className="transition-all duration-150 hover:brightness-110"
                            rx={currentY <= chartPadTop + innerHeight - (summary.totalCost / maxMonthlySpend) * innerHeight + 4 ? 3 : 0}
                          />
                        );
                      })}

                      {/* Bar Value text */}
                      <text
                        x={x + barWidth / 2}
                        y={chartPadTop + innerHeight - (summary.totalCost / maxMonthlySpend) * innerHeight - 6}
                        textAnchor="middle"
                        fontSize="10"
                        fill={isSelected ? '#1d4ed8' : '#64748b'}
                        fontWeight={isSelected ? '700' : '500'}
                        fontFamily="JetBrains Mono, monospace"
                      >
                        ${(summary.totalCost / 1000).toFixed(1)}k
                      </text>

                      {/* Month Label */}
                      <text
                        x={x + barWidth / 2}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        fontSize="10"
                        fill={isSelected ? '#1d4ed8' : '#475569'}
                        fontWeight={isSelected ? '700' : '500'}
                      >
                        {summary.monthLabel.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Subscriptions Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs">
              {subscriptions.map(sub => (
                <div key={sub.id} className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: subColors[sub.name] || sub.color }} />
                  <span className="font-medium">{sub.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHART TYPE 2: LINE CHART (Smooth Spline with Interactive Hover Nodes) */}
        {chartType === 'line' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Hover over circular data nodes for exact monthly figures</span>
              <span className="font-mono tabular-nums">Peak: ${maxMonthlySpend.toLocaleString()}</span>
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[320px]">
                {/* Horizontal gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = chartPadTop + innerHeight * (1 - pct);
                  const labelVal = Math.round((maxMonthlySpend * pct) / 1000);
                  return (
                    <g key={idx}>
                      <line
                        x1={chartPadLeft}
                        y1={y}
                        x2={svgWidth - chartPadRight}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray={pct === 0 ? 'none' : '3 3'}
                      />
                      <text
                        x={chartPadLeft - 8}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="10"
                        fill="#94a3b8"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        ${labelVal}k
                      </text>
                    </g>
                  );
                })}

                {/* Line Path Calculation */}
                {(() => {
                  const n = filteredSummaries.length;
                  if (n < 2) return null;

                  const points = filteredSummaries.map((s, idx) => {
                    const x = chartPadLeft + (idx / (n - 1)) * innerWidth;
                    const y = chartPadTop + innerHeight * (1 - s.totalCost / maxMonthlySpend);
                    return { x, y, summary: s };
                  });

                  // Build smooth curve path
                  let d = `M ${points[0].x} ${points[0].y}`;
                  for (let i = 0; i < points.length - 1; i++) {
                    const p0 = points[i];
                    const p1 = points[i + 1];
                    const mx = (p0.x + p1.x) / 2;
                    d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
                  }

                  // Area fill path
                  const areaD = `${d} L ${points[points.length - 1].x} ${chartPadTop + innerHeight} L ${points[0].x} ${chartPadTop + innerHeight} Z`;

                  return (
                    <g>
                      <defs>
                        <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Area Fill */}
                      <path d={areaD} fill="url(#lineAreaGrad)" />

                      {/* Main Stroke */}
                      <path d={d} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />

                      {/* Interactive Data Points */}
                      {points.map((pt) => {
                        const isSelected = pt.summary.monthKey === selectedMonthKey;

                        return (
                          <g
                            key={pt.summary.monthKey}
                            className="cursor-pointer group"
                            onClick={() => onSelectMonth(pt.summary.monthKey)}
                            onMouseEnter={() => {
                              setHoveredDataPoint({
                                label: pt.summary.monthLabel,
                                value: pt.summary.totalCost,
                                subBreakdown: pt.summary.bySubscription,
                                serviceBreakdown: pt.summary.byService,
                              });
                            }}
                            onMouseLeave={() => setHoveredDataPoint(null)}
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isSelected ? 6 : 4.5}
                              fill="#ffffff"
                              stroke={isSelected ? '#1d4ed8' : '#2563eb'}
                              strokeWidth={isSelected ? 3 : 2}
                              className="transition-transform group-hover:scale-150"
                            />

                            {/* Label */}
                            <text
                              x={pt.x}
                              y={svgHeight - 12}
                              textAnchor="middle"
                              fontSize="10"
                              fill={isSelected ? '#1d4ed8' : '#64748b'}
                              fontWeight={isSelected ? '700' : '400'}
                            >
                              {pt.summary.monthLabel.split(' ')[0]}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}

        {/* CHART TYPE 3: DONUT / PIE DISTRIBUTION */}
        {chartType === 'pie' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Group By:</span>
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                  <button
                    onClick={() => setPieMode('service')}
                    className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
                      pieMode === 'service' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    By Azure Service
                  </button>
                  <button
                    onClick={() => setPieMode('subscription')}
                    className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
                      pieMode === 'subscription' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    By Subscription
                  </button>
                </div>
              </div>

              <span className="text-xs text-slate-500 font-mono tabular-nums">
                Total: ${totalFilteredSpend.toLocaleString()} {currency}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Donut SVG */}
              <div className="relative flex justify-center">
                <svg viewBox="0 0 240 240" className="w-56 h-56">
                  {(() => {
                    const dataset = pieMode === 'service' ? totalSpendByService : totalSpendBySubscription;
                    const total = dataset.reduce((acc, item) => acc + item.cost, 0) || 1;
                    const cx = 120;
                    const cy = 120;
                    const rOuter = 95;
                    const rInner = 62;

                    let accumulatedAngle = 0;

                    return dataset.slice(0, 8).map((item, idx) => {
                      const fraction = item.cost / total;
                      const angle = fraction * 2 * Math.PI;
                      const startAngle = accumulatedAngle;
                      const endAngle = accumulatedAngle + angle;
                      accumulatedAngle += angle;

                      const x1 = cx + rOuter * Math.cos(startAngle - Math.PI / 2);
                      const y1 = cy + rOuter * Math.sin(startAngle - Math.PI / 2);
                      const x2 = cx + rOuter * Math.cos(endAngle - Math.PI / 2);
                      const y2 = cy + rOuter * Math.sin(endAngle - Math.PI / 2);

                      const x3 = cx + rInner * Math.cos(endAngle - Math.PI / 2);
                      const y3 = cy + rInner * Math.sin(endAngle - Math.PI / 2);
                      const x4 = cx + rInner * Math.cos(startAngle - Math.PI / 2);
                      const y4 = cy + rInner * Math.sin(startAngle - Math.PI / 2);

                      const largeArc = angle > Math.PI ? 1 : 0;
                      const pathData = `
                        M ${x1} ${y1}
                        A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}
                        L ${x3} ${y3}
                        A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}
                        Z
                      `;

                      const color = palette[idx % palette.length];

                      return (
                        <path
                          key={item.name}
                          d={pathData}
                          fill={color}
                          className="cursor-pointer transition-opacity hover:opacity-85"
                          onMouseEnter={() => {
                            setHoveredDataPoint({
                              label: item.name,
                              value: item.cost,
                            });
                          }}
                          onMouseLeave={() => setHoveredDataPoint(null)}
                        />
                      );
                    });
                  })()}

                  {/* Center Hole Details */}
                  <text x="120" y="115" textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="500">
                    Portfolio Total
                  </text>
                  <text x="120" y="135" textAnchor="middle" fontSize="15" fill="#0f172a" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    ${Math.round(totalFilteredSpend / 1000)}k
                  </text>
                </svg>
              </div>

              {/* Data Rows List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {(pieMode === 'service' ? totalSpendByService : totalSpendBySubscription).map((item, idx) => {
                  const percent = totalFilteredSpend > 0 ? (item.cost / totalFilteredSpend) * 100 : 0;
                  const color = palette[idx % palette.length];

                  return (
                    <div
                      key={item.name}
                      onMouseEnter={() => setHoveredDataPoint({ label: item.name, value: item.cost })}
                      onMouseLeave={() => setHoveredDataPoint(null)}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: color }} />
                        <span className="font-semibold text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          ${item.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono ml-2">
                          ({percent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CHART TYPE 4: YEAR-OVER-YEAR (YoY) COMPARISON */}
        {chartType === 'yoy' && (
          <div className="space-y-6">
            {!yoyComparison ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Year-over-Year comparison requires invoice records across at least two distinct calendar years (e.g. 2025 and 2026).
              </div>
            ) : (
              <div className="space-y-6">
                {/* YoY Summary Header Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500 mb-1">{yoyComparison.currentYear} Period Run-Rate</div>
                    <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                      ${yoyComparison.currentYearSpend.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Across matched calendar months</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500 mb-1">{yoyComparison.previousYear} Same-Period Spend</div>
                    <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                      ${yoyComparison.previousYearSpend.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Baseline prior year</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500 mb-1">Year-over-Year Delta</div>
                    <div className={`text-xl font-bold font-mono tabular-nums flex items-center gap-1 ${
                      yoyComparison.yoyTotalDelta > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {yoyComparison.yoyTotalDelta > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      {yoyComparison.yoyTotalDelta > 0 ? `+$${yoyComparison.yoyTotalDelta.toLocaleString()}` : `-$${Math.abs(yoyComparison.yoyTotalDelta).toLocaleString()}`}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-1">
                      {yoyComparison.yoyTotalPercentChange > 0 ? `+${yoyComparison.yoyTotalPercentChange}%` : `${yoyComparison.yoyTotalPercentChange}%`} YoY growth
                    </div>
                  </div>
                </div>

                {/* Side-by-side YoY Bars SVG */}
                <div className="w-full overflow-x-auto">
                  <svg viewBox={`0 0 ${svgWidth} 220`} className="w-full h-auto max-h-[260px]">
                    {/* Gridlines */}
                    {[0, 0.5, 1].map((pct, idx) => {
                      const y = 20 + 140 * (1 - pct);
                      return (
                        <line
                          key={idx}
                          x1={40}
                          y1={y}
                          x2={svgWidth - 20}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeDasharray="3 3"
                        />
                      );
                    })}

                    {/* Paired bars for each month */}
                    {(() => {
                      const pairs = yoyComparison.monthlyPairs.filter(p => p.currentSpend > 0 || p.previousSpend > 0);
                      const maxVal = Math.max(...pairs.map(p => Math.max(p.currentSpend, p.previousSpend)), 1);
                      const n = pairs.length;

                      return pairs.map((pair, idx) => {
                        const groupWidth = (innerWidth / n);
                        const groupX = chartPadLeft + idx * groupWidth;
                        const bWidth = Math.min(24, groupWidth * 0.35);

                        const hPrev = (pair.previousSpend / maxVal) * 140;
                        const hCurr = (pair.currentSpend / maxVal) * 140;

                        const yPrev = 20 + 140 - hPrev;
                        const yCurr = 20 + 140 - hCurr;

                        return (
                          <g key={pair.monthName} className="cursor-pointer group">
                            {/* Prev Year Bar */}
                            <rect
                              x={groupX + groupWidth / 2 - bWidth - 2}
                              y={yPrev}
                              width={bWidth}
                              height={Math.max(2, hPrev)}
                              fill="#94a3b8"
                              rx="2"
                              className="group-hover:opacity-80"
                            />
                            {/* Curr Year Bar */}
                            <rect
                              x={groupX + groupWidth / 2 + 2}
                              y={yCurr}
                              width={bWidth}
                              height={Math.max(2, hCurr)}
                              fill="#2563eb"
                              rx="2"
                              className="group-hover:opacity-80"
                            />

                            {/* Label */}
                            <text
                              x={groupX + groupWidth / 2}
                              y={190}
                              textAnchor="middle"
                              fontSize="11"
                              fill="#475569"
                              fontWeight="600"
                            >
                              {pair.monthName}
                            </text>

                            {/* Percent Change Badge */}
                            <text
                              x={groupX + groupWidth / 2}
                              y={205}
                              textAnchor="middle"
                              fontSize="10"
                              fill={pair.delta > 0 ? '#e11d48' : '#059669'}
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {pair.percentChange > 0 ? `+${pair.percentChange}%` : `${pair.percentChange}%`}
                            </text>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>

                {/* Legend for YoY Bars */}
                <div className="flex items-center justify-center gap-6 text-xs border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-slate-400" />
                    <span className="font-medium text-slate-700">{yoyComparison.previousYear} Spend</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-blue-600" />
                    <span className="font-medium text-slate-900">{yoyComparison.currentYear} Spend</span>
                  </div>
                </div>

                {/* YoY Service Breakdown Table */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Service-Level Year-over-Year Growth Matrix
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {yoyComparison.serviceYoY.slice(0, 6).map(s => {
                      const isUp = s.delta > 0;
                      return (
                        <div
                          key={s.serviceName}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{s.serviceName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              ${s.previousSpend.toLocaleString()} &rarr; ${s.currentSpend.toLocaleString()}
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono tabular-nums">
                            <div className={`font-bold ${isUp ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {isUp ? `+$${s.delta.toLocaleString()}` : `-$${Math.abs(s.delta).toLocaleString()}`}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {s.percentChange > 0 ? `+${s.percentChange}%` : `${s.percentChange}%`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hover Details Floating Tooltip */}
        {hoveredDataPoint && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 text-xs shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div>
              <div className="text-slate-400 font-semibold">{hoveredDataPoint.label} Detail:</div>
              <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                ${hoveredDataPoint.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
              </div>
            </div>

            {hoveredDataPoint.subBreakdown && (
              <div className="flex flex-wrap items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-700 pt-2 sm:pt-0 sm:pl-4">
                {Object.entries(hoveredDataPoint.subBreakdown).map(([sName, cost]) => (
                  <div key={sName} className="text-slate-300">
                    <span className="text-slate-400 font-normal">{sName.split('-')[0]}: </span>
                    <span className="font-mono tabular-nums font-semibold">${Math.round(cost).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
