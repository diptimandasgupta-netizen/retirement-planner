'use client';
import { useEffect, useState } from 'react';
import { BarChart2, Flame, Table, TrendingUp, Percent, Zap } from 'lucide-react';
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
import { SuggestedRetirement } from './outputs/SuggestedRetirement';
import { ImportExport } from './ImportExport';

type Tab = 'suggest' | 'chart' | 'monte' | 'fire' | 'gap' | 'swr';

type TabTooltip = {
  headline: string;
  what: string;
  how: string;
  tip: string;
};

const TABS: { id: Tab; label: string; icon: typeof TrendingUp; tooltip: TabTooltip }[] = [
  {
    id: 'suggest', label: 'Retire When?', icon: Zap,
    tooltip: {
      headline: 'Suggested Retirement Age',
      what: 'Answers "how soon can I realistically retire?" by finding the earliest age at which your portfolio survives to age 95 without running out.',
      how: 'Runs three scenarios — Lean (bare essentials), Regular (comfortable), and Fat (generous) — each with a different spending assumption. Accounts for your current location vs. retirement destination cost-of-living difference.',
      tip: 'If the suggested age is later than your target, the "what-if" section shows exactly how much more to save per month — or how much to cut from retirement spending — to close the gap.',
    },
  },
  {
    id: 'chart', label: 'Portfolio', icon: TrendingUp,
    tooltip: {
      headline: 'Portfolio Growth Chart',
      what: 'A visual projection of your total portfolio from today until age 95, showing two lines: your nominal balance (actual dollars) and your real balance (purchasing power after inflation is stripped out).',
      how: 'During your working years, contributions compound at your expected return rate. After retirement, inflation-adjusted withdrawals are deducted each year. The red dashed line shows the corpus target (what you need to retire); the purple dot marks when you hit your FIRE number.',
      tip: 'The gap between the blue (nominal) and green (real) lines widens over time — that\'s inflation eroding purchasing power. The real line is what your money actually buys in today\'s dollars.',
    },
  },
  {
    id: 'monte', label: 'Monte Carlo', icon: BarChart2,
    tooltip: {
      headline: 'Monte Carlo Simulation',
      what: 'Named after the famous casino, Monte Carlo simulation models the uncertainty of financial markets by running 1,000 different "what if the market behaved randomly?" scenarios — some with great returns, some with crashes, most somewhere in between.',
      how: 'Each simulation picks a random return every year (average = your expected return, spread = ±12% standard deviation) and a random inflation rate (average = your input ±1%). The shaded fan shows the range of outcomes: the wide outer band is the 10th–90th percentile, the narrower inner band is the 25th–75th percentile, and the bold line is the median (middle) outcome.',
      tip: 'The "success rate" is the percentage of 1,000 runs where money lasted to age 95. Aim for 85%+ for a robust plan. A 90%+ rate means even in most bad market scenarios you are fine.',
    },
  },
  {
    id: 'fire', label: 'FIRE', icon: Flame,
    tooltip: {
      headline: 'FIRE — Financial Independence, Retire Early',
      what: 'FIRE is a movement based on a simple idea: save aggressively, invest wisely, and reach a portfolio size large enough that investment returns alone can fund your lifestyle forever — without needing a job.',
      how: 'The core formula is the "4% Rule" (Trinity Study): a portfolio of 25× your annual expenses has historically survived 30+ years of withdrawals at 4% per year. This app shows three tiers — Lean FIRE (20× / 5% withdrawal, tight budget), Regular FIRE (25× / 4%, comfortable), and Fat FIRE (33× / 3%, generous). All numbers are adjusted for your retirement destination\'s cost of living.',
      tip: 'The 4% rule was derived from US market data 1926–1995. For 40+ year retirements or international destinations, many planners prefer 3–3.5% (Fat FIRE range) for extra safety margin.',
    },
  },
  {
    id: 'gap', label: 'Year-by-Year', icon: Table,
    tooltip: {
      headline: 'Year-by-Year Breakdown',
      what: 'A detailed table that shows your portfolio balance at every 5-year milestone from today to age 95, plus key events like your retirement year and any depletion warning.',
      how: 'Each row shows: nominal balance (actual dollars at that future date), real balance (what those dollars buy in today\'s purchasing power), and either your annual contribution (working years) or annual withdrawal amount (retirement years). Inflation is compounded into withdrawals each year.',
      tip: 'Compare the nominal and real columns to see the true impact of inflation. A $2M portfolio in 30 years at 3% inflation has the same buying power as roughly $820K today.',
    },
  },
  {
    id: 'swr', label: 'SWR Analysis', icon: Percent,
    tooltip: {
      headline: 'Safe Withdrawal Rate (SWR) Analysis',
      what: 'SWR is the percentage of your portfolio you withdraw each year in retirement. The lower the rate, the safer your plan — but the larger the portfolio you need to build first.',
      how: 'This table shows five withdrawal rates from 3% (very conservative) to 5% (aggressive). For each rate it calculates: how large a portfolio you need at retirement, and how much annual income that generates. The right-most column shows whether your projected portfolio covers that target.',
      tip: '4% (Regular FIRE) is the most widely cited rate from the Trinity Study. If you plan to retire early (before 60) or move to a country with higher costs, consider targeting 3–3.5%. If retiring later (65+) with other income sources like Social Security, 4.5–5% may be fine.',
    },
  },
];

export function RetirementPlanner() {
  useRetirementCalc();

  const computeResults = useRetirementStore(s => s.computeResults);
  const monteCarloEnabled = useRetirementStore(s => s.monteCarloEnabled);
  const monteCarloResult = useRetirementStore(s => s.monteCarloResult);

  const [activeTab, setActiveTab] = useState<Tab>('suggest');

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
              <h1 className="text-white font-bold text-lg leading-none">FireSmart</h1>
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
                {/* Import / Export */}
                <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Profile</p>
                  <ImportExport />
                </div>
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
                {TABS.map(({ id, label, icon: Icon, tooltip }) => (
                  <div key={id} className="relative group">
                    <button
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

                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 z-50
                                    opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <div className="bg-slate-900 text-white text-xs rounded-2xl p-4 shadow-2xl border border-slate-700 space-y-2.5">
                        <p className="font-bold text-white text-sm leading-tight">{tooltip.headline}</p>
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What it is</p>
                          <p className="text-slate-300 leading-relaxed">{tooltip.what}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">How it works</p>
                          <p className="text-slate-300 leading-relaxed">{tooltip.how}</p>
                        </div>
                        <div className="bg-blue-900/50 border border-blue-700/50 rounded-lg px-3 py-2">
                          <p className="text-xs font-semibold text-blue-300 mb-0.5">💡 Pro tip</p>
                          <p className="text-blue-200 leading-relaxed">{tooltip.tip}</p>
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="flex justify-center">
                        <div className="w-3 h-3 bg-slate-900 border-r border-b border-slate-700 rotate-45 -mt-1.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4">
                {activeTab === 'suggest' && <SuggestedRetirement />}
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
        FireSmart is for educational purposes only. Not financial advice. Consult a licensed financial advisor.
      </footer>
    </div>
  );
}
