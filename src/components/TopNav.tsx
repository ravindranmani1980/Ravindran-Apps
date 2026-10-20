import React from 'react';
import { UploadCloud, Layers, RefreshCw, Bot, Sparkles, Box } from 'lucide-react';

export type DashboardTab = 'overview' | 'visuals' | 'trends' | 'subscriptions' | 'reservations' | 'invoices' | '3d';

interface TopNavProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenUpload: () => void;
  onResetToDemo: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  isCustomData: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenUpload,
  onResetToDemo,
  onToggleChat,
  isChatOpen,
  isCustomData,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            <span className="hidden sm:inline">Azure Invoice Consolidator</span>
            <span className="sm:hidden">Azure Invoices</span>
          </span>
        </div>

        {/* Zone 2: Single-line Nav Links */}
        <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-5 text-sm font-medium">
          <button
            onClick={() => onSelectTab('overview')}
            className={`transition-colors whitespace-nowrap pb-0.5 border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onSelectTab('visuals')}
            className={`transition-colors whitespace-nowrap pb-0.5 border-b-2 flex items-center gap-1 ${
              activeTab === 'visuals'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Visualizations & YoY</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-xs">
              New
            </span>
          </button>
          <button
            onClick={() => onSelectTab('trends')}
            className={`transition-colors whitespace-nowrap pb-0.5 border-b-2 ${
              activeTab === 'trends'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Trends
          </button>
          <button
            onClick={() => onSelectTab('subscriptions')}
            className={`transition-colors whitespace-nowrap pb-0.5 border-b-2 ${
              activeTab === 'subscriptions'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Subscriptions
          </button>
          <button
            onClick={() => onSelectTab('reservations')}
            className={`transition-colors whitespace-nowrap pb-0.5 border-b-2 ${
              activeTab === 'reservations'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Reservations
          </button>
          <button
            onClick={() => onSelectTab('3d')}
            className={`transition-colors whitespace-nowrap pb-0.5 border-b-2 flex items-center gap-1 ${
              activeTab === '3d'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Topology</span>
          </button>
          <button
            onClick={() => onSelectTab('invoices')}
            className={`transition-colors whitespace-nowrap pb-0.5 border-b-2 ${
              activeTab === 'invoices'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Invoices & Audit
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Gemini AI Copilot Toggle Button */}
          <button
            onClick={onToggleChat}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              isChatOpen
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Bot className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">AI Copilot</span>
            <Sparkles className="w-3 h-3 text-amber-500" />
          </button>

          {isCustomData && (
            <button
              onClick={onResetToDemo}
              title="Reset to Sample Azure Data"
              className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          )}

          <button
            onClick={onOpenUpload}
            className="px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload <span className="hidden sm:inline">Invoices CSV</span></span>
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Horizontal Tab Navigation */}
      <div className="lg:hidden flex items-center gap-4 px-4 py-2 border-t border-slate-100 overflow-x-auto text-xs font-medium scrollbar-none">
        <button
          onClick={() => onSelectTab('overview')}
          className={`whitespace-nowrap pb-1 border-b-2 ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-600'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => onSelectTab('visuals')}
          className={`whitespace-nowrap pb-1 border-b-2 ${
            activeTab === 'visuals'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-600'
          }`}
        >
          Visuals & YoY
        </button>
        <button
          onClick={() => onSelectTab('trends')}
          className={`whitespace-nowrap pb-1 border-b-2 ${
            activeTab === 'trends'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-600'
          }`}
        >
          Trends
        </button>
        <button
          onClick={() => onSelectTab('subscriptions')}
          className={`whitespace-nowrap pb-1 border-b-2 ${
            activeTab === 'subscriptions'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-600'
          }`}
        >
          Subscriptions
        </button>
        <button
          onClick={() => onSelectTab('reservations')}
          className={`whitespace-nowrap pb-1 border-b-2 ${
            activeTab === 'reservations'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-600'
          }`}
        >
          Reservations
        </button>
        <button
          onClick={() => onSelectTab('3d')}
          className={`whitespace-nowrap pb-1 border-b-2 ${
            activeTab === '3d'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-600'
          }`}
        >
          3D Topology
        </button>
        <button
          onClick={() => onSelectTab('invoices')}
          className={`whitespace-nowrap pb-1 border-b-2 ${
            activeTab === 'invoices'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-600'
          }`}
        >
          Invoices
        </button>
      </div>
    </header>
  );
};
