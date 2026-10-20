import React, { useState, useMemo } from 'react';
import {
  Download,
  Search,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import type { NormalizedCostRecord } from '../types/azure.ts';
import { exportConsolidatedCSV } from '../utils/azureInvoiceParser.ts';

interface InvoiceAuditTableProps {
  records: NormalizedCostRecord[];
  currency: string;
}

export const InvoiceAuditTable: React.FC<InvoiceAuditTableProps> = ({ records, currency }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  const [pricingModelFilter, setPricingModelFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'cost' | 'date' | 'serviceName' | 'subscriptionName'>('cost');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Available filters
  const subscriptions = useMemo(() => {
    return Array.from(new Set(records.map(r => r.subscriptionName))).sort();
  }, [records]);

  const months = useMemo(() => {
    return Array.from(new Set(records.map(r => r.billingPeriod))).sort().reverse();
  }, [records]);

  // Filtered & Sorted
  const filteredRecords = useMemo(() => {
    return records
      .filter(r => {
        if (subscriptionFilter !== 'all' && r.subscriptionName !== subscriptionFilter) {
          return false;
        }
        if (pricingModelFilter !== 'all' && r.pricingModel !== pricingModelFilter) {
          return false;
        }
        if (monthFilter !== 'all' && r.billingPeriod !== monthFilter) {
          return false;
        }
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchInvoice = r.invoiceId.toLowerCase().includes(q);
          const matchService = r.serviceName.toLowerCase().includes(q);
          const matchRg = r.resourceGroup.toLowerCase().includes(q);
          const matchSub = r.subscriptionName.toLowerCase().includes(q);
          const matchComponent = (r.reservationDetails?.componentType || '').toLowerCase().includes(q);
          return matchInvoice || matchService || matchRg || matchSub || matchComponent;
        }
        return true;
      })
      .sort((a, b) => {
        let valA: string | number = a[sortField];
        let valB: string | number = b[sortField];
        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
        }
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });
  }, [records, subscriptionFilter, pricingModelFilter, monthFilter, searchTerm, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: 'cost' | 'date' | 'serviceName' | 'subscriptionName') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleDownloadCSV = () => {
    const csvContent = exportConsolidatedCSV(filteredRecords);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `azure-consolidated-invoices-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const totalFilteredCost = filteredRecords.reduce((acc, r) => acc + r.cost, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Header and Controls */}
      <div className="p-6 border-b border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Consolidated Invoice Line-Items & Audit Trail
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Filtered Total: <span className="font-mono tabular-nums font-bold text-slate-900">${totalFilteredCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> across {filteredRecords.length} records
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {copiedNotification ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
              {copiedNotification ? 'Exporting...' : 'Export Consolidated CSV'}
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice, service, RG..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Subscription Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              aria-label="Filter by subscription"
              value={subscriptionFilter}
              onChange={e => {
                setSubscriptionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Subscriptions ({subscriptions.length})</option>
              {subscriptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Pricing Model Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <select
              aria-label="Filter by pricing model"
              value={pricingModelFilter}
              onChange={e => {
                setPricingModelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Pricing Models</option>
              <option value="Reservation">Reservations Only</option>
              <option value="OnDemand">On-Demand Only</option>
              <option value="SavingsPlan">Savings Plans Only</option>
            </select>
          </div>

          {/* Billing Month Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <select
              aria-label="Filter by billing month"
              value={monthFilter}
              onChange={e => {
                setMonthFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Billing Periods</option>
              {months.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Data View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-3 px-4">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-1 hover:text-slate-900"
                >
                  Date / Period <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  onClick={() => handleSort('subscriptionName')}
                  className="flex items-center gap-1 hover:text-slate-900"
                >
                  Subscription <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-4">Invoice ID</th>
              <th className="py-3 px-4">
                <button
                  onClick={() => handleSort('serviceName')}
                  className="flex items-center gap-1 hover:text-slate-900"
                >
                  Service & Workload <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-4">Resource Group</th>
              <th className="py-3 px-4">Pricing Model</th>
              <th className="py-3 px-4 text-right">
                <button
                  onClick={() => handleSort('cost')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 ml-auto"
                >
                  Cost ({currency}) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No invoice records match the selected filters.
                </td>
              </tr>
            ) : (
              paginatedRecords.map(rec => (
                <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-slate-700 font-mono whitespace-nowrap">
                    {rec.date}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900 truncate max-w-[160px]" title={rec.subscriptionName}>
                      {rec.subscriptionName}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                      {rec.subscriptionId.slice(0, 13)}...
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                    {rec.invoiceId}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{rec.serviceName}</div>
                    <div className="text-[11px] text-slate-500">{rec.serviceCategory}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 truncate max-w-[130px]" title={rec.resourceGroup}>
                    {rec.resourceGroup}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {rec.pricingModel === 'Reservation' ? (
                      <span className="text-[11px] font-medium text-teal-800">
                        Reservation ({rec.reservationDetails?.componentType || 'Commitment'})
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-600">On-Demand</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                    ${rec.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Showing {Math.min((currentPage - 1) * pageSize + 1, filteredRecords.length)} to{' '}
          {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-md border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            Previous
          </button>
          <span className="px-2 font-mono tabular-nums">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-md border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
