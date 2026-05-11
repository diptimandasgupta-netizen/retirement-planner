'use client';
import { useEffect, useState } from 'react';
import { BarChart2, Flame, Table, TrendingUp, Percent } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';
import { useRetirementCalc } from '@/hooks/useRetirementCalc';
import { InputPanel } from './inputs/InputPanel';
import { SummaryCards } from './outputs/SummaryCards';
import { PortfolioChart } from './outputs/PortfolioChart';
import { MonteCarloChart } from './outputs/MonteCarloChart';
import { FIREPanel } from './outputs/FIREPanel';
import { GapAnalysis } from './outputs/GapAnalysis';
import { WithdrawalAnalysis } from './outputs/WithdrawalAnalysis';
import { MonteCarloToggle } from './controls/MonteCarloToggle';

type Tab = 'chart' | 'monte' | 'fire' | 'gap' | 'swr';

const TABS: { id: Tab; label: string; icon: typeof TrendingUp }[] = [
  { id: 'chart', label: 'Portfolio', icon: TrendingUp },
  { id: 'monte', label: 'Monte Carlo', icon: BarChart2 },
  { id: 'fire', label: 'FIRE', icon: Flame },
  { id: 'gap', label: 'Year-by-Year', icon: Table },
  { id: 'swr', label: 'SWR Analysis', icon: Percent },
];

export function RetirementPlanner() {
  useRetirementCalc();

  const computeResults = useRetirementStore(s => s.computeResults);
  const monteCarloEnabled = useRetirementStore(s => s.monteCarloEnabled);
  const monteCarloResult = useRetirementStore(s => s.monteCarloResult);

  const [activeTab, setActiveTab] = useState<Tab>('chart');

  useEffect(() => { computeResults(); }, [computeResults]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">RetireSmart</h1>
              <p className="text-slate-400 text-xs">Comprehensive Retirement Planning Tool</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 hidden sm:block">
            For educational purposes only — not financial advice
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* Left: Input Panel */}
          <aside className="lg:sticky lg:top-6">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                <h2 className="text-white font-bold">Your Details</h2>
                <p className="text-blue-200 text-xs">Adjust values to see real-time projections</p>
              </div>
              <div className="p-4 space-y-3 max-h-[calc(100vh-10rem)] overflow-y-auto">
                <InputPanel />
              </div>
            </div>
          </aside>

          {/* Right: Output Panel */}
          <section className="space-y-4 text-slate-900">
            <SummaryCards />
            <MonteCarloToggle />

            {/* Tab panel */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="flex border-b border-slate-100 overflow-x-auto">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                      activeTab === id
                        ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                    {id === 'monte' && monteCarloEnabled && monteCarloResult && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                        monteCarloResult.successRate >= 0.9 ? 'bg-green-100 text-green-700' :
                        monteCarloResult.successRate >= 0.75 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {Math.round(monteCarloResult.successRate * 100)}%
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {activeTab === 'chart' && <PortfolioChart />}
                {activeTab === 'monte' && (
                  monteCarloEnabled
                    ? <MonteCarloChart />
                    : (
                      <div className="h-52 flex flex-col items-center justify-center text-slate-400 gap-3">
                        <BarChart2 size={36} className="opacity-30" />
                        <p className="text-sm text-center max-w-xs">
                          Toggle the <span className="font-semibold text-slate-600">Monte Carlo Simulation</span> above to run 1,000 random scenarios and assess success probability.
                        </p>
                      </div>
                    )
                )}
                {activeTab === 'fire' && <FIREPanel />}
                {activeTab === 'gap' && <GapAnalysis />}
                {activeTab === 'swr' && <WithdrawalAnalysis />}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="text-center py-6 text-slate-500 text-xs">
        RetireSmart is for educational purposes only. Not financial advice. Consult a licensed financial advisor.
      </footer>
    </div>
  );
}
