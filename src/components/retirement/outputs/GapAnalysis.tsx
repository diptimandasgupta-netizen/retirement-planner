'use client';
import { useRetirementStore } from '@/store/retirementStore';

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function GapAnalysis() {
  const results = useRetirementStore(s => s.results);
  const inputs = useRetirementStore(s => s.inputs);

  if (!results) return null;

  const { yearlyData } = results;
  // Show every 5 years for readability
  const rows = yearlyData.filter((d, i) => i === 0 || d.age % 5 === 0 || d.isRetirementYear || d.isDepletionYear);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-2 font-semibold text-slate-600">Age</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-600">Portfolio</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-600">Real Value</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-600">Contrib / Withdrawal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(d => (
              <tr
                key={d.age}
                className={
                  d.isDepletionYear
                    ? 'bg-red-50 font-semibold text-red-700'
                    : d.isRetirementYear
                    ? 'bg-amber-50 font-semibold text-amber-800'
                    : d.age === inputs.currentAge
                    ? 'bg-blue-50 font-semibold text-blue-800'
                    : 'hover:bg-slate-50'
                }
              >
                <td className="px-3 py-2">
                  {d.age}
                  {d.isRetirementYear && <span className="ml-1 text-amber-600 text-xs">(Retire)</span>}
                  {d.isDepletionYear && <span className="ml-1 text-red-600 text-xs">(Depleted!)</span>}
                </td>
                <td className="px-3 py-2 text-right font-mono">{fmt(d.portfolioNominal)}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-500">{fmt(d.portfolioReal)}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {d.withdrawalAmount > 0
                    ? <span className="text-red-600">-{fmt(d.withdrawalAmount)}</span>
                    : <span className="text-green-600">+{fmt(d.annualContribution)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 text-center">Showing every 5 years + key milestones. Real value adjusted for {Math.round(inputs.inflationRate * 100)}% inflation.</p>
    </div>
  );
}
