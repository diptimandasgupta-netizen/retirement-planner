'use client';
import { useRetirementStore } from '@/store/retirementStore';

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function WithdrawalAnalysis() {
  const results = useRetirementStore(s => s.results);
  const monteCarloResult = useRetirementStore(s => s.monteCarloResult);

  if (!results) return null;

  const { swrAnalysis, corpus } = results;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Your projected portfolio at retirement: <span className="font-bold text-slate-700">{fmt(corpus.projectedAtRetirement)}</span>.
        Corpus needed shown by withdrawal rate.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-2.5 font-semibold text-slate-600">SWR</th>
              <th className="text-right px-3 py-2.5 font-semibold text-slate-600">Corpus Needed</th>
              <th className="text-right px-3 py-2.5 font-semibold text-slate-600">Annual Income</th>
              <th className="text-right px-3 py-2.5 font-semibold text-slate-600">vs. Projection</th>
              {monteCarloResult && <th className="text-right px-3 py-2.5 font-semibold text-slate-600">MC Success</th>}
            </tr>
          </thead>
          <tbody>
            {swrAnalysis.map(row => {
              const delta = corpus.projectedAtRetirement - row.corpusNeeded;
              const isDefault = row.rate === 0.04;
              return (
                <tr
                  key={row.rate}
                  className={isDefault ? 'bg-blue-50 font-semibold' : 'hover:bg-slate-50'}
                >
                  <td className="px-3 py-2 font-mono">
                    {(row.rate * 100).toFixed(1)}%
                    {isDefault && <span className="ml-1 text-blue-500 text-xs">(default)</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(row.corpusNeeded)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(row.annualIncome)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {delta >= 0 ? '+' : ''}{fmt(delta)}
                  </td>
                  {monteCarloResult && (
                    <td className="px-3 py-2 text-right">
                      <span className={`font-bold ${monteCarloResult.successRate >= 0.9 ? 'text-green-600' : monteCarloResult.successRate >= 0.75 ? 'text-amber-600' : 'text-red-600'}`}>
                        {Math.round(monteCarloResult.successRate * 100)}%
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
          <p className="text-green-600 font-semibold">≥90%</p>
          <p className="text-green-700">Conservative</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
          <p className="text-amber-600 font-semibold">75-89%</p>
          <p className="text-amber-700">Moderate</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
          <p className="text-red-600 font-semibold">&lt;75%</p>
          <p className="text-red-700">Risky</p>
        </div>
      </div>
    </div>
  );
}
