'use client';
import { Loader2, BarChart2 } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';

export function MonteCarloToggle() {
  const { monteCarloEnabled, monteCarloRunning, monteCarloResult, toggleMonteCarlo } = useRetirementStore();

  return (
    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <BarChart2 size={16} className="text-slate-500" />
        <div>
          <p className="text-sm font-semibold text-slate-700">Monte Carlo Simulation</p>
          <p className="text-xs text-slate-500">1,000 random scenarios</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {monteCarloResult && monteCarloEnabled && (
          <div className={`text-sm font-bold px-3 py-1 rounded-lg ${
            monteCarloResult.successRate >= 0.9
              ? 'bg-green-100 text-green-700'
              : monteCarloResult.successRate >= 0.75
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {Math.round(monteCarloResult.successRate * 100)}% success
          </div>
        )}
        <button
          onClick={toggleMonteCarlo}
          disabled={monteCarloRunning}
          className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${
            monteCarloEnabled ? 'bg-blue-500' : 'bg-slate-300'
          }`}
        >
          {monteCarloRunning ? (
            <Loader2 size={14} className="absolute inset-0 m-auto text-white animate-spin" />
          ) : (
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              monteCarloEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          )}
        </button>
      </div>
    </div>
  );
}
