'use client';
import { useMemo } from 'react';
import { Zap, Flame, Star, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, ArrowRight, MapPin } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';
import { computeSuggestedRetirement } from '@/lib/retirement/calculations/suggestedRetirement';
import { getJointRetirementAge } from '@/lib/retirement/calculations/portfolioGrowth';
import { USDM } from '@/lib/retirement/constants';

const TIER_CONFIG = {
  lean:    { icon: Zap,   color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800' },
  regular: { icon: Flame, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
  fat:     { icon: Star,  color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-800'   },
};

function YearsChip({ years }: { years: number }) {
  if (years === 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">On target</span>;
  if (years < 0) return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold flex items-center gap-0.5">
      <TrendingDown size={11} />{Math.abs(years)} yrs earlier
    </span>
  );
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold flex items-center gap-0.5">
      <TrendingUp size={11} />{years} yrs later
    </span>
  );
}

function AgeTimeline({ currentAge, suggestedAge, primaryTargetAge, spouseTargetAsPrimaryAge, spouseActualRetirementAge, lifeExpectancy, isCouple }: {
  currentAge: number;
  suggestedAge: number | null;
  primaryTargetAge: number;            // primary's own retirement age — positions AND labels amber dot
  spouseTargetAsPrimaryAge?: number;   // primary's age WHEN spouse retires — positions rose dot
  spouseActualRetirementAge?: number;  // spouse's own retirement age — labels rose dot
  lifeExpectancy: number;
  isCouple?: boolean;
}) {
  const jointTarget = isCouple && spouseTargetAsPrimaryAge !== undefined
    ? Math.max(primaryTargetAge, spouseTargetAsPrimaryAge)
    : primaryTargetAge;

  const span = lifeExpectancy - currentAge;
  const pct = (age: number) => Math.max(0, Math.min(100, ((age - currentAge) / span) * 100));
  const markerLeft = (age: number) => `${pct(age)}%`;

  const retireLine = suggestedAge ?? jointTarget;

  return (
    <div className="relative h-8 my-2">
      {/* Track */}
      <div className="absolute top-3.5 left-0 right-0 h-1.5 bg-slate-200 rounded-full" />

      {/* Working phase */}
      <div className="absolute top-3.5 left-0 h-1.5 bg-blue-300 rounded-full transition-all"
        style={{ width: `${pct(retireLine)}%` }} />

      {/* Retirement phase */}
      <div className="absolute top-3.5 h-1.5 bg-emerald-400 rounded-full transition-all"
        style={{ left: markerLeft(retireLine), width: `${pct(lifeExpectancy) - pct(retireLine)}%` }} />

      {/* Current age dot */}
      <div className="absolute top-2" style={{ left: '0%' }}>
        <div className="w-3.5 h-3.5 rounded-full bg-slate-500 border-2 border-white shadow" />
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-slate-500 whitespace-nowrap">{currentAge}</span>
      </div>

      {/* Spouse target dot (rose) — positioned at primary's age when spouse retires,
          but labelled with the spouse's OWN retirement age */}
      {isCouple && spouseTargetAsPrimaryAge !== undefined && spouseTargetAsPrimaryAge !== primaryTargetAge && (
        <div className="absolute top-2.5 transition-all" style={{ left: markerLeft(spouseTargetAsPrimaryAge) }}>
          <div className="w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow -translate-x-1/2" />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-bold text-rose-600 whitespace-nowrap">
            {spouseActualRetirementAge ?? spouseTargetAsPrimaryAge}
          </span>
        </div>
      )}

      {/* Primary target dot (amber) */}
      {primaryTargetAge !== suggestedAge && (
        <div className="absolute top-2.5 transition-all" style={{ left: markerLeft(primaryTargetAge) }}>
          <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow -translate-x-1/2 opacity-90" />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-amber-600 whitespace-nowrap">{primaryTargetAge}</span>
        </div>
      )}

      {/* Suggested (FIRE-viable) retirement dot (green) */}
      {suggestedAge !== null && (
        <div className="absolute top-2 transition-all" style={{ left: markerLeft(suggestedAge) }}>
          <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow -translate-x-1/2" />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-bold text-emerald-700 whitespace-nowrap">{suggestedAge}</span>
        </div>
      )}

      {/* Life expectancy dot */}
      <div className="absolute top-2" style={{ left: `calc(100% - 7px)` }}>
        <div className="w-3.5 h-3.5 rounded-full bg-slate-300 border-2 border-white shadow" />
        <span className="absolute -bottom-5 right-0 text-xs text-slate-400 whitespace-nowrap">{lifeExpectancy}</span>
      </div>
    </div>
  );
}

export function SuggestedRetirement() {
  const results = useRetirementStore(s => s.results);
  const inputs  = useRetirementStore(s => s.inputs);

  const suggestion = useMemo(() => {
    if (!results) return null;
    return computeSuggestedRetirement(inputs);
  }, [inputs, results]);

  if (!suggestion || !results) return null;

  const {
    scenarios, constraintDriver, monthlyInvestmentToHitTarget, expenseReductionToHitTarget,
    locationFactor, currentLocationName, retirementLocationName, locationImpactPct,
  } = suggestion;
  const regularScenario = scenarios.find(s => s.tier === 'regular');

  const isCouple = inputs.householdType === 'spouse' || inputs.householdType === 'family';
  // Joint target = the later-retiring person's date expressed in primary's age
  const jointTargetAge = getJointRetirementAge(inputs);
  // Spouse's set target mapped to primary's age (for timeline dot)
  const spouseTargetAsPrimaryAge = isCouple
    ? inputs.currentAge + (inputs.spouseRetirementAge - inputs.spouseAge)
    : undefined;

  return (
    <div className="space-y-4">

      {/* Headline */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white">
        <p className="text-xs font-semibold opacity-80 uppercase tracking-wide mb-1">Based on your current inputs</p>
        {regularScenario?.suggestedAge ? (
          <>
            <p className="text-2xl font-bold">
              {isCouple ? 'Your household can fully retire at age ' : 'You can retire at age '}
              <span className="text-yellow-300">{regularScenario.suggestedAge}</span>
            </p>
            <p className="text-sm opacity-80 mt-1">
              {regularScenario.yearsVsTarget < 0
                ? `${Math.abs(regularScenario.yearsVsTarget)} yr${Math.abs(regularScenario.yearsVsTarget) !== 1 ? 's' : ''} earlier than ${isCouple ? 'your joint target' : 'your target'} of ${jointTargetAge}`
                : regularScenario.yearsVsTarget > 0
                ? `${regularScenario.yearsVsTarget} yr${regularScenario.yearsVsTarget !== 1 ? 's' : ''} later than ${isCouple ? 'your joint target' : 'your target'} of ${jointTargetAge} — adjustments needed`
                : `Right on ${isCouple ? 'your joint target' : 'your target'} age of ${jointTargetAge}`}
            </p>
            {isCouple && (
              <p className="text-xs opacity-70 mt-1">
                Your target: {inputs.retirementAge} · Spouse retires at: {inputs.spouseRetirementAge}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-xl font-bold">
              {isCouple ? 'Full household retirement' : 'Retirement'} not yet achievable by age 80
            </p>
            <p className="text-sm opacity-80 mt-1">Increase contributions or reduce planned expenses</p>
          </>
        )}
      </div>

      {/* Timeline (regular scenario) */}
      {regularScenario?.suggestedAge && (
        <div className="bg-white rounded-xl border border-slate-200 px-4 pt-4 pb-8">
          <div className="flex flex-wrap justify-between gap-y-1 text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-1.5 rounded bg-blue-300" /> Working</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-1.5 rounded bg-emerald-400" /> Can retire</span>
            {inputs.retirementAge !== regularScenario.suggestedAge &&
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" /> Your target</span>}
            {isCouple && spouseTargetAsPrimaryAge !== inputs.retirementAge &&
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500" /> Spouse target</span>}
          </div>
          <AgeTimeline
            currentAge={inputs.currentAge}
            suggestedAge={regularScenario.suggestedAge}
            primaryTargetAge={inputs.retirementAge}
            spouseTargetAsPrimaryAge={spouseTargetAsPrimaryAge}
            spouseActualRetirementAge={isCouple ? inputs.spouseRetirementAge : undefined}
            lifeExpectancy={inputs.lifeExpectancy}
            isCouple={isCouple}
          />
        </div>
      )}

      {/* Three-tier scenario cards */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Retirement Age by Scenario</p>
        {scenarios.map(s => {
          const cfg = TIER_CONFIG[s.tier];
          const Icon = cfg.icon;
          return (
            <div key={s.tier} className={`border rounded-xl p-3 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon size={16} className={cfg.color} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{s.label}</p>
                    <p className="text-xs text-slate-500">{Math.round(s.swrRate * 100)}% SWR · {s.multiplier}× expenses</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-slate-800">
                    {s.suggestedAge ?? '—'}
                    {s.suggestedAge && <span className="text-xs font-normal text-slate-500 ml-1">yrs old</span>}
                  </p>
                  <div className="flex justify-end mt-0.5">
                    <YearsChip years={s.yearsVsTarget} />
                  </div>
                </div>
              </div>
              {s.suggestedAge && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Portfolio needed</span>
                    <p className="font-semibold text-slate-700">{USDM(s.corpusNeededAtSuggestedAge)}</p>
                  </div>
                  <div>
                    {isCouple ? (
                      <>
                        <span className="text-slate-500">Years until both retire</span>
                        <p className="font-semibold text-slate-700">{s.suggestedAge - inputs.currentAge} yrs</p>
                        <p className="text-slate-400 text-xs">
                          You: {Math.max(0, inputs.retirementAge - inputs.currentAge)} · Spouse: {Math.max(0, inputs.spouseRetirementAge - inputs.spouseAge)} working yrs
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-500">Working years left</span>
                        <p className="font-semibold text-slate-700">{s.suggestedAge - inputs.currentAge} yrs</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Constraint insight */}
      <div className={`rounded-xl border p-3 space-y-2 ${
        constraintDriver === 'savings'  ? 'bg-blue-50 border-blue-200' :
        constraintDriver === 'expenses' ? 'bg-amber-50 border-amber-200' :
        'bg-slate-50 border-slate-200'
      }`}>
        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <AlertCircle size={13} className="text-slate-500" />
          {constraintDriver === 'savings'  ? 'Your main lever: increase savings' :
           constraintDriver === 'expenses' ? 'Your main lever: reduce retirement expenses' :
           'Both savings & expenses are important levers'}
        </p>
        <p className="text-xs text-slate-600">
          {constraintDriver === 'savings'
            ? 'Boosting monthly contributions has a larger impact on your retirement timeline than cutting expenses.'
            : constraintDriver === 'expenses'
            ? 'Reducing planned retirement spending moves your retirement date significantly more than increasing contributions.'
            : 'Your retirement date is sensitive to both how much you save and how much you plan to spend.'}
        </p>
      </div>

      {/* What-if panel */}
      {(monthlyInvestmentToHitTarget > 0 || expenseReductionToHitTarget > 0) && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
            To {isCouple ? 'fully retire' : 'retire'} at your {isCouple ? 'joint ' : ''}target (age {jointTargetAge})
          </div>
          <div className="divide-y divide-slate-100">
            {monthlyInvestmentToHitTarget > 0 && (
              <div className="flex items-center gap-3 px-3 py-2.5">
                <TrendingUp size={14} className="text-blue-500 shrink-0" />
                <div className="flex-1 text-xs">
                  <span className="text-slate-600">Increase monthly investment by </span>
                  <span className="font-bold text-blue-700">${monthlyInvestmentToHitTarget.toLocaleString()}/mo</span>
                </div>
                <ArrowRight size={12} className="text-slate-400" />
                <span className="text-xs font-bold text-green-600">Retire at {jointTargetAge}</span>
              </div>
            )}
            {expenseReductionToHitTarget > 0 && (
              <div className="flex items-center gap-3 px-3 py-2.5">
                <TrendingDown size={14} className="text-emerald-500 shrink-0" />
                <div className="flex-1 text-xs">
                  <span className="text-slate-600">Reduce retirement expenses by </span>
                  <span className="font-bold text-emerald-700">${expenseReductionToHitTarget.toLocaleString()}/mo</span>
                </div>
                <ArrowRight size={12} className="text-slate-400" />
                <span className="text-xs font-bold text-green-600">Retire at {jointTargetAge}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Already on track */}
      {monthlyInvestmentToHitTarget === 0 && regularScenario?.suggestedAge && regularScenario.suggestedAge <= jointTargetAge && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <p className="text-xs text-green-700 font-medium">
            {isCouple
              ? `You're on track — your household can fully retire by age ${jointTargetAge} or earlier. Keep it up!`
              : `You're on track to retire at ${jointTargetAge} or earlier. Keep it up!`}
          </p>
        </div>
      )}

      {/* Location context */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <MapPin size={12} className="text-slate-400" /> Location adjustment applied
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700 truncate">{currentLocationName}</span>
          <ArrowRight size={11} className="shrink-0 text-slate-400" />
          <span className="font-medium text-slate-700 truncate">{retirementLocationName}</span>
          <span className={`ml-auto font-bold shrink-0 px-2 py-0.5 rounded-full ${
            locationFactor < 0.9 ? 'bg-green-100 text-green-700' :
            locationFactor > 1.1 ? 'bg-red-100 text-red-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            ×{locationFactor.toFixed(2)}
            {locationImpactPct !== 0 && (
              <span className="ml-1 font-normal">
                ({locationImpactPct > 0 ? '+' : ''}{locationImpactPct}%)
              </span>
            )}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {locationImpactPct < 0
            ? `Retirement expenses are ${Math.abs(locationImpactPct)}% lower at your chosen destination — this brings your retirement age forward.`
            : locationImpactPct > 0
            ? `Retirement expenses are ${locationImpactPct}% higher at your chosen destination — this pushes your retirement age back.`
            : 'Same location — no cost-of-living adjustment applied.'}
        </p>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Based on {Math.round(inputs.inflationRate * 100)}% inflation · {Math.round(inputs.expectedReturnRate * 100)}% nominal return · 4% SWR baseline
      </p>
    </div>
  );
}
