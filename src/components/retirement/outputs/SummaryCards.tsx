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
    blue:   'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/30 text-white',
    purple: 'bg-gradient-to-br from-violet-500 to-purple-600 border-violet-400/30 text-white',
    green:  'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/30 text-white',
    red:    'bg-gradient-to-br from-rose-500 to-red-600 border-rose-400/30 text-white',
    amber:  'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-400/30 text-white',
  };

  const iconColorMap: Record<string, string> = {
    blue: 'text-blue-200', purple: 'text-violet-200',
    green: 'text-emerald-200', red: 'text-rose-200', amber: 'text-amber-200',
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
                <p className="text-xs font-semibold opacity-80 mb-1 leading-tight uppercase tracking-wide">{label}</p>
                <p className="text-xl font-extrabold truncate drop-shadow">{value}</p>
                <p className="text-xs opacity-75 mt-1 leading-tight">{sub}</p>
              </div>
              <Icon size={20} className={`${iconColorMap[color]} opacity-70 shrink-0 ml-2`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
