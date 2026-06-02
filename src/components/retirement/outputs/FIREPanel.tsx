'use client';
import { Zap, Flame, Star, MapPin, ArrowRight } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';
import { USDM } from '@/lib/retirement/constants';
import { getLocation, relativeLocationFactor } from '@/lib/retirement/data/locations';

export function FIREPanel() {
  const results = useRetirementStore(s => s.results);
  const inputs = useRetirementStore(s => s.inputs);

  if (!results) return null;
  const { fire } = results;

  const currentLoc    = getLocation(inputs.currentLocationId);
  const retirementLoc = getLocation(inputs.retirementLocationId);
  const locFactor     = relativeLocationFactor(currentLoc, retirementLoc);
  const sameLocation  = inputs.currentLocationId === inputs.retirementLocationId;
  const locImpactPct  = Math.round((locFactor - 1) * 100);

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
      <div className="bg-slate-50 rounded-xl p-3 space-y-2">
        <p className="text-sm text-slate-600">
          Based on <span className="font-semibold">${fire.adjustedAnnualExpenses.toLocaleString()}/yr</span> adjusted expenses
          {inputs.householdType !== 'single' && ` (${inputs.householdType} household)`}.
        </p>

        {/* Location context */}
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <MapPin size={11} className="text-slate-400 shrink-0" />
          <span className="font-medium text-slate-700">{currentLoc.name}</span>
          <ArrowRight size={10} className="text-slate-300 shrink-0" />
          <span className="font-medium text-slate-700">{retirementLoc.name}</span>
          {!sameLocation && (
            <span className={`ml-auto font-bold px-2 py-0.5 rounded-full text-xs ${
              locFactor < 0.9 ? 'bg-green-100 text-green-700' :
              locFactor > 1.1 ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-500'
            }`}>
              ×{locFactor.toFixed(2)}
              {locImpactPct !== 0 && <span className="ml-1 font-normal">({locImpactPct > 0 ? '+' : ''}{locImpactPct}%)</span>}
            </span>
          )}
        </div>
        {!sameLocation && (
          <p className="text-xs text-slate-400">
            {locImpactPct < 0
              ? `Your FIRE numbers are ${Math.abs(locImpactPct)}% lower because ${retirementLoc.name} is cheaper than ${currentLoc.name}.`
              : `Your FIRE numbers are ${locImpactPct}% higher because ${retirementLoc.name} is more expensive than ${currentLoc.name}.`}
          </p>
        )}
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
