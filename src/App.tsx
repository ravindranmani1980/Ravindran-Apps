import { useState, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import type { NormalizedCostRecord } from './types/azure.ts';
import { getInitialDemoRecords } from './data/sampleAzureInvoices.ts';
import {
  aggregateMonthlyData,
  computeMonthOverMonthVariance,
  computeYearOverYearComparison,
  filterRecordsByDateRange,
  generateFinOpsRecommendations,
} from './utils/azureInvoiceParser.ts';

import { TopNav, DashboardTab } from './components/TopNav.tsx';
import { KPISummaryStrip } from './components/KPISummaryStrip.tsx';
import { MonthlySpendChart } from './components/MonthlySpendChart.tsx';
import { InteractiveAnalyticsVisualizer } from './components/InteractiveAnalyticsVisualizer.tsx';
import { ThreeCloudTopology } from './components/ThreeCloudTopology.tsx';
import { SubscriptionComparisonGrid } from './components/SubscriptionComparisonGrid.tsx';
import { ReservationsSection } from './components/ReservationsSection.tsx';
import { VarianceAnomalySection } from './components/VarianceAnomalySection.tsx';
import { ServiceBreakdownSection } from './components/ServiceBreakdownSection.tsx';
import { InvoiceAuditTable } from './components/InvoiceAuditTable.tsx';
import { FinOpsRecommendations } from './components/FinOpsRecommendations.tsx';
import { SecureUploadModal } from './components/SecureUploadModal.tsx';
import { GeminiFinOpsChat } from './components/GeminiFinOpsChat.tsx';

export default function App() {
  const [records, setRecords] = useState<NormalizedCostRecord[]>(() => getInitialDemoRecords());
  const [isCustomData, setIsCustomData] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Date range filter state (defaults to Jan 2025 - Mar 2026)
  const [startMonth, setStartMonth] = useState('2025-01');
  const [endMonth, setEndMonth] = useState('2026-03');

  // Filter records by date range first
  const dateFilteredRecords = useMemo(() => {
    return filterRecordsByDateRange(records, startMonth, endMonth);
  }, [records, startMonth, endMonth]);

  // Filter by subscription if selected
  const activeRecords = useMemo(() => {
    if (!selectedSubscriptionId) return dateFilteredRecords;
    return dateFilteredRecords.filter(r => r.subscriptionId === selectedSubscriptionId);
  }, [dateFilteredRecords, selectedSubscriptionId]);

  // Aggregated data
  const { monthlySummaries, subscriptions, reservationSummaries, overallStats } = useMemo(() => {
    return aggregateMonthlyData(activeRecords);
  }, [activeRecords]);

  // Year-over-Year (YoY) comparison calculation across all records
  const yoyComparison = useMemo(() => {
    return computeYearOverYearComparison(monthlySummaries, activeRecords);
  }, [monthlySummaries, activeRecords]);

  // Selected Month state
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');

  // Sync selectedMonthKey when summaries change
  const currentMonthKey = useMemo(() => {
    if (selectedMonthKey && monthlySummaries.some(m => m.monthKey === selectedMonthKey)) {
      return selectedMonthKey;
    }
    return monthlySummaries.length > 0 ? monthlySummaries[monthlySummaries.length - 1].monthKey : '';
  }, [selectedMonthKey, monthlySummaries]);

  // Selected month summary
  const currentMonthSummary = useMemo(() => {
    return monthlySummaries.find(m => m.monthKey === currentMonthKey) || (monthlySummaries[monthlySummaries.length - 1] || null);
  }, [monthlySummaries, currentMonthKey]);

  // Variance Report
  const varianceReport = useMemo(() => {
    const idx = monthlySummaries.findIndex(m => m.monthKey === currentMonthKey);
    return computeMonthOverMonthVariance(monthlySummaries, idx >= 0 ? idx : -1);
  }, [monthlySummaries, currentMonthKey]);

  // FinOps Recommendations
  const finOpsRecommendations = useMemo(() => {
    return generateFinOpsRecommendations(activeRecords, subscriptions);
  }, [activeRecords, subscriptions]);

  const handleImportRecords = (newRecords: NormalizedCostRecord[], replaceExisting: boolean) => {
    if (replaceExisting) {
      setRecords(newRecords);
    } else {
      setRecords(prev => [...prev, ...newRecords]);
    }
    setIsCustomData(true);
    setSelectedSubscriptionId(null);

    // Adjust date range if needed
    const months = Array.from(new Set(newRecords.map(r => r.billingPeriod))).sort();
    if (months.length > 0) {
      setStartMonth(months[0]);
      setEndMonth(months[months.length - 1]);
    }
  };

  const handleResetToDemo = () => {
    const demo = getInitialDemoRecords();
    setRecords(demo);
    setIsCustomData(false);
    setSelectedSubscriptionId(null);
    setStartMonth('2025-01');
    setEndMonth('2026-03');
  };

  const handleDateRangeChange = (newStart: string, newEnd: string) => {
    if (newStart <= newEnd) {
      setStartMonth(newStart);
      setEndMonth(newEnd);
    } else {
      setStartMonth(newEnd);
      setEndMonth(newStart);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Top Bar Navigation */}
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onResetToDemo={handleResetToDemo}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        isCustomData={isCustomData}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Strip (always visible for continuous financial context) */}
        <KPISummaryStrip
          stats={overallStats}
          selectedMonthLabel={currentMonthSummary?.monthLabel}
          onExploreReservations={() => setActiveTab('reservations')}
        />

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Interactive Analytics Visualizer with Multiple Chart Types */}
            <InteractiveAnalyticsVisualizer
              summaries={monthlySummaries}
              subscriptions={subscriptions}
              records={activeRecords}
              yoyComparison={yoyComparison}
              currency={overallStats.currency}
              selectedMonthKey={currentMonthKey}
              onSelectMonth={setSelectedMonthKey}
              startMonth={startMonth}
              endMonth={endMonth}
              onDateRangeChange={handleDateRangeChange}
            />

            {/* Subscriptions Portfolio Grid */}
            <SubscriptionComparisonGrid
              subscriptions={subscriptions}
              totalAllSpend={overallStats.totalSpend}
              selectedSubscriptionId={selectedSubscriptionId}
              onSelectSubscription={setSelectedSubscriptionId}
            />

            {/* Split Row: Service Allocation & Quick FinOps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <ServiceBreakdownSection
                currentSummary={currentMonthSummary}
                currency={overallStats.currency}
              />
              <FinOpsRecommendations
                recommendations={finOpsRecommendations.slice(0, 3)}
                stats={overallStats}
                subscriptions={subscriptions}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Visualizations & YoY Analytics */}
        {activeTab === 'visuals' && (
          <div className="space-y-8">
            <InteractiveAnalyticsVisualizer
              summaries={monthlySummaries}
              subscriptions={subscriptions}
              records={activeRecords}
              yoyComparison={yoyComparison}
              currency={overallStats.currency}
              selectedMonthKey={currentMonthKey}
              onSelectMonth={setSelectedMonthKey}
              startMonth={startMonth}
              endMonth={endMonth}
              onDateRangeChange={handleDateRangeChange}
            />

            {/* Service & Category Allocation */}
            <ServiceBreakdownSection
              currentSummary={currentMonthSummary}
              currency={overallStats.currency}
            />
          </div>
        )}

        {/* Tab 3: Monthly Trends & Variance */}
        {activeTab === 'trends' && (
          <div className="space-y-8">
            <MonthlySpendChart
              summaries={monthlySummaries}
              subscriptions={subscriptions}
              selectedMonthKey={currentMonthKey}
              onSelectMonth={setSelectedMonthKey}
            />

            <VarianceAnomalySection report={varianceReport} />

            <ServiceBreakdownSection
              currentSummary={currentMonthSummary}
              currency={overallStats.currency}
            />
          </div>
        )}

        {/* Tab 4: Subscriptions */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-8">
            <SubscriptionComparisonGrid
              subscriptions={subscriptions}
              totalAllSpend={overallStats.totalSpend}
              selectedSubscriptionId={selectedSubscriptionId}
              onSelectSubscription={setSelectedSubscriptionId}
            />

            <MonthlySpendChart
              summaries={monthlySummaries}
              subscriptions={subscriptions}
              selectedMonthKey={currentMonthKey}
              onSelectMonth={setSelectedMonthKey}
            />

            <InvoiceAuditTable
              records={activeRecords}
              currency={overallStats.currency}
            />
          </div>
        )}

        {/* Tab 5: Reservations & Commitments */}
        {activeTab === 'reservations' && (
          <div className="space-y-8">
            <ReservationsSection
              summaries={reservationSummaries}
              currency={overallStats.currency}
            />

            <FinOpsRecommendations
              recommendations={finOpsRecommendations}
              stats={overallStats}
              subscriptions={subscriptions}
            />
          </div>
        )}

        {/* Tab 6: 3D Cloud Topology */}
        {activeTab === '3d' && (
          <div className="space-y-8">
            <ThreeCloudTopology
              subscriptions={subscriptions}
              reservationSummaries={reservationSummaries}
              currency={overallStats.currency}
            />
            <SubscriptionComparisonGrid
              subscriptions={subscriptions}
              totalAllSpend={overallStats.totalSpend}
              selectedSubscriptionId={selectedSubscriptionId}
              onSelectSubscription={setSelectedSubscriptionId}
            />
          </div>
        )}

        {/* Tab 7: Invoices & Audit */}
        {activeTab === 'invoices' && (
          <div className="space-y-8">
            <InvoiceAuditTable
              records={activeRecords}
              currency={overallStats.currency}
            />
          </div>
        )}
      </main>

      {/* Floating Copilot Launcher */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-lg transition-all hover:scale-105 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Ask FinOps AI</span>
        </button>
      )}

      {/* Gemini FinOps AI Copilot Drawer */}
      <GeminiFinOpsChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        stats={overallStats}
        subscriptions={subscriptions}
        yoyComparison={yoyComparison}
      />

      {/* Secure File Upload Modal */}
      <SecureUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onImportRecords={handleImportRecords}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span>Azure Invoice Consolidator & Multi-Subscription Analytics</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>FinOps Foundation Compliant</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Reconciled {overallStats.invoiceCount} invoices across {overallStats.subscriptionCount} subscriptions</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
