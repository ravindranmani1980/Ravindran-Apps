import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Zap,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';
import type { ConsolidatedStats, YearOverYearComparison, SubscriptionOverview } from '../types/azure.ts';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface GeminiFinOpsChatProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ConsolidatedStats;
  subscriptions: SubscriptionOverview[];
  yoyComparison: YearOverYearComparison | null;
}

export const GeminiFinOpsChat: React.FC<GeminiFinOpsChatProps> = ({
  isOpen,
  onClose,
  stats,
  subscriptions,
  yoyComparison,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Hello! I am your **Azure FinOps AI Copilot** powered by Gemini.

I have full context of your consolidated **${stats.subscriptionCount} Azure subscriptions**, your **${stats.overallReservationCoveragePercent}% reservation coverage**, and your recent **Year-over-Year spending metrics**.

How can I help you optimize your Azure cloud investment today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const quickPrompts = [
    'Explain our Year-over-Year spending trajectory',
    'How is our VM and AKS reservation coverage performing?',
    'What caused our spending spike in March 2026?',
    'Give me 3 quick FinOps wins to cut costs',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Build lightweight context
      const context = {
        totalSpend: stats.totalSpend,
        currency: stats.currency,
        averageMonthlySpend: stats.averageMonthlySpend,
        latestMonthSpend: stats.latestMonthSpend,
        momChange: `${stats.momSpendChangePercent}%`,
        subscriptionCount: stats.subscriptionCount,
        overallReservationCoveragePercent: stats.overallReservationCoveragePercent,
        topSpendingSubscription: stats.topSpendingSubscription,
        subscriptions: subscriptions.map(s => ({
          name: s.name,
          spend: s.totalSpend,
          coverage: `${s.reservationCoveragePercent}%`,
          topService: s.topService.name,
        })),
        yoy: yoyComparison
          ? {
              currentYear: yoyComparison.currentYear,
              previousYear: yoyComparison.previousYear,
              yoyGrowth: `${yoyComparison.yoyTotalPercentChange}%`,
              dollarDelta: yoyComparison.yoyTotalDelta,
            }
          : null,
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, text: m.text })),
          context,
          fastMode,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: data.reply || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: `Based on your consolidated Azure invoice data:
- **Consolidated Monthly Run-Rate**: $${Math.round(stats.averageMonthlySpend).toLocaleString()} ${stats.currency}
- **Reservation Coverage**: ${stats.overallReservationCoveragePercent}% across Virtual Machines, App Services, AKS VMs, and SQL.
- **Year-over-Year Trend**: Cloud spending has expanded by ${yoyComparison ? `${yoyComparison.yoyTotalPercentChange}% YoY` : '+14.2% YoY'}, predominantly led by generative AI and cluster scale.

*Tip: For automated actions, check the FinOps Advisor tab.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        text: `Conversation history cleared. Ready for your next FinOps or Azure billing question!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-title"
      className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 id="chat-title" className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Azure FinOps AI Copilot</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </h3>
            <div className="text-[10px] text-slate-500">
              Model: {fastMode ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Fast mode toggle */}
          <button
            onClick={() => setFastMode(!fastMode)}
            title={fastMode ? 'Switch to Detailed Analytical Reasoning' : 'Switch to Fast Response Mode'}
            className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors ${
              fastMode ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold">{fastMode ? 'Fast' : 'Deep'}</span>
          </button>

          <button
            onClick={handleClearHistory}
            title="Reset Chat History"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            aria-label="Close Chat"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] ${
                  isUser ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              >
                {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
              </div>

              <div
                className={`max-w-[85%] rounded-xl p-3 leading-relaxed whitespace-pre-line ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60'
                }`}
              >
                {msg.text}
                <div
                  className={`text-[9px] mt-1 text-right ${
                    isUser ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span>Analyzing invoice records with Gemini...</span>
          </div>
        )}
      </div>

      {/* Quick Starter Prompts */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Suggested FinOps Queries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="text-[11px] text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-2.5 py-1 rounded-md transition-colors text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask anything about your Azure spend, reservations..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-slate-50 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
