'use client';
import { Zap, Flame, Star } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';
import { USDM } from '@/lib/retirement/constants';

export function FIREPanel() {
  const results = useRetirementStore(s => s.results);
  const inputs = useRetirementStore(s => s.inputs);

  if (!results) return null;
  const { fire } = results;

  const tiers = [
    {
      label: 'Lean FIRE',
      description: '5% SWR — frugal lifestyle',
      number: fire.leanFIRENumber,
      years: fire.yearsToLeanFIRE,
      age: fire.ageAtLeanFIRE,
      icon: Zap,
      color: 'yellow',
    },
    {
      label: 'Regular FIRE',
      description: '4% SWR — Trinity Study baseline',
      number: fire.regularFIRENumber,
      years: fire.yearsToRegularFIRE,
      age: fire.ageAtRegularFIRE,
      icon: Flame,
      color: 'green',
    },
    {
      label: 'Fat FIRE',
      description: '3% SWR — comfortable lifestyle',
      number: fire.fatFIRENumber,
      years: fire.yearsToFatFIRE,
      age: fire.ageAtFatFIRE,
      icon: Star,
      color: 'blue',
    },
  ];

  const colorMap: Record<string, { card: string; icon: string; badge: string }> = {
    yellow: { card: 'border-yellow-200 bg-yellow-50', icon: 'text-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
    green: { card: 'border-green-200 bg-green-50', icon: 'text-green-500', badge: 'bg-green-100 text-green-700' },
    blue: { card: 'border-blue-200 bg-blue-50', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-xl p-3 text-sm">
        <p className="text-slate-600">
          Based on <span className="font-semibold">${fire.adjustedAnnualExpenses.toLocaleString()}/yr</span> adjusted expenses
          {inputs.householdType !== 'single' && ` (${inputs.householdType} household)`}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {tiers.map(({ label, description, number, years, age, icon: Icon, color }) => {
          const c = colorMap[color];
          const achieved = years === 0;
          const unreachable = years === null;

          return (
            <div key={label} className={`border rounded-xl p-4 ${c.card} ${fire.currentFIREStatus && achieved ? 'ring-2 ring-offset-1 ring-green-400' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={18} className={c.icon} />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{label}</p>
                    <p className="text-xs text-slate-500">{description}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${c.badge}`}>
                  {achieved ? '✓ Achieved' : unreachable ? '∞ Out of reach' : `Age ${age}`}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div>
                  <p className="text-xs text-slate-500">FIRE Number</p>
                  <p className="font-bold text-slate-800">{USDM(number)}</p>
                </div>
                {!achieved && !unreachable && years !== null && (
                  <div>
                    <p className="text-xs text-slate-500">Years Away</p>
                    <p className="font-bold text-slate-800">{years} yrs</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Annual Income</p>
                  <p className="font-bold text-slate-800">${Math.round(number * (color === 'yellow' ? 0.05 : color === 'green' ? 0.04 : 0.03)).toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
        <p><span className="font-bold">About FIRE:</span> The 4% Rule (Trinity Study) suggests a portfolio lasting 30+ years with 4% annual withdrawals. Lean FIRE targets minimal expenses, Fat FIRE supports a more comfortable lifestyle.</p>
      </div>
    </div>
  );
}
