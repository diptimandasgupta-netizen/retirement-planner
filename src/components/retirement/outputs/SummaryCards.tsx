'use client';
import { TrendingUp, TrendingDown, Target, Zap, AlertTriangle } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';
import { USDM } from '@/lib/retirement/constants';

export function SummaryCards() {
  const results = useRetirementStore(s => s.results);
  const inputs = useRetirementStore(s => s.inputs);

  if (!results) return null;

  const { corpus, fire, depletionAge } = results;
  const surplus = corpus.gap >= 0;
  const yearsToRetire = inputs.retirementAge - inputs.currentAge;

  const cards = [
    {
      label: 'Projected at Retirement',
      value: USDM(corpus.projectedAtRetirement),
      sub: `At age ${inputs.retirementAge} (in ${yearsToRetire} yrs)`,
      icon: TrendingUp,
      color: 'blue',
    },
    {
      label: 'Corpus Needed (4% SWR)',
      value: USDM(corpus.nominalNeeded),
      sub: `For $${Math.round(corpus.nominalNeeded * 0.04).toLocaleString()}/yr income`,
      icon: Target,
      color: 'purple',
    },
    {
      label: surplus ? 'Projected Surplus' : 'Projected Shortfall',
      value: USDM(Math.abs(corpus.gap)),
      sub: surplus
        ? 'You\'re on track!'
        : `Need +$${corpus.additionalMonthlySavingsNeeded.toLocaleString()}/mo more`,
      icon: surplus ? TrendingUp : TrendingDown,
      color: surplus ? 'green' : 'red',
    },
    {
      label: 'FIRE Number (Regular)',
      value: USDM(fire.regularFIRENumber),
      sub: fire.ageAtRegularFIRE
        ? fire.currentFIREStatus
          ? '🎉 Already FIRE eligible!'
          : `Reach at age ${fire.ageAtRegularFIRE}`
        : 'Not reachable with current savings',
      icon: Zap,
      color: 'amber',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  };

  const iconColorMap: Record<string, string> = {
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    green: 'text-green-500',
    red: 'text-red-500',
    amber: 'text-amber-500',
  };

  return (
    <div className="space-y-3">
      {depletionAge && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-bold">Warning:</span> Portfolio depletes at age {depletionAge} — {depletionAge - inputs.retirementAge} years into retirement.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${colorMap[color]}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium opacity-80 mb-1 leading-tight">{label}</p>
                <p className="text-xl font-bold truncate">{value}</p>
                <p className="text-xs opacity-70 mt-1 leading-tight">{sub}</p>
              </div>
              <Icon size={20} className={`${iconColorMap[color]} opacity-70 shrink-0 ml-2`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
