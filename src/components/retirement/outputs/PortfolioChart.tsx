'use client';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceDot, ResponsiveContainer,
} from 'recharts';
import { useRetirementStore } from '@/store/retirementStore';

function fmtM(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-700 mb-2">Age {label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-semibold text-slate-800">{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function PortfolioChart() {
  const results = useRetirementStore(s => s.results);
  const inputs = useRetirementStore(s => s.inputs);

  if (!results) return <div className="h-72 flex items-center justify-center text-slate-400 text-sm">Computing...</div>;

  const { yearlyData, corpus, fire } = results;
  const isCouple = inputs.householdType === 'spouse' || inputs.householdType === 'family';

  // Spouse's age at primary's retirement year
  const spouseRetirementPrimaryAge = isCouple
    ? inputs.currentAge + (inputs.spouseRetirementAge - inputs.spouseAge)
    : null;

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-blue-500" />Combined Portfolio</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-green-500" />Real (Inflation-adj.)</span>
        {isCouple && <>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 border-t border-dotted border-blue-400" />You (solo)</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 border-t border-dotted border-rose-400" />Spouse (solo)</span>
        </>}
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-amber-400 rounded-sm opacity-60" />Your Retirement</span>
        {isCouple && <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-rose-400 rounded-sm opacity-60" />Spouse Retirement</span>}
        {fire.ageAtRegularFIRE && <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-purple-500" />FIRE</span>}
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={yearlyData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 11 }} />
          <YAxis tickFormatter={fmtM} tick={{ fontSize: 10 }} width={60} />
          <Tooltip content={<CustomTooltip />} />

          {/* Solo lines (couple mode only) */}
          {isCouple && (
            <Line type="monotone" dataKey="portfolioNominalPrimary" stroke="#93c5fd"
              strokeWidth={1} dot={false} strokeDasharray="3 3" name="You (solo)" />
          )}
          {isCouple && (
            <Line type="monotone" dataKey="portfolioNominalSpouse" stroke="#fca5a5"
              strokeWidth={1} dot={false} strokeDasharray="3 3" name="Spouse (solo)" />
          )}

          {/* Combined portfolio */}
          <Line type="monotone" dataKey="portfolioNominal" stroke="#3b82f6"
            strokeWidth={2.5} dot={false} name="Combined Portfolio" />

          {/* Real portfolio */}
          <Line type="monotone" dataKey="portfolioReal" stroke="#10b981"
            strokeWidth={1.5} dot={false} strokeDasharray="6 3" name="Real Portfolio" />

          {/* Your retirement */}
          <ReferenceLine x={inputs.retirementAge} stroke="#f59e0b" strokeWidth={2}
            label={{ value: isCouple ? 'You Retire' : 'Retire', position: 'top', fontSize: 10, fill: '#f59e0b' }} />

          {/* Spouse's retirement (shown on primary's age axis) */}
          {isCouple && spouseRetirementPrimaryAge !== null && spouseRetirementPrimaryAge !== inputs.retirementAge && (
            <ReferenceLine x={spouseRetirementPrimaryAge} stroke="#f43f5e" strokeWidth={2}
              strokeDasharray="6 3"
              label={{ value: 'Spouse Retires', position: 'top', fontSize: 10, fill: '#f43f5e' }} />
          )}

          {/* Corpus needed */}
          <ReferenceLine y={corpus.nominalNeeded} stroke="#ef4444" strokeWidth={1.5}
            strokeDasharray="8 4"
            label={{ value: 'Corpus Needed', position: 'right', fontSize: 10, fill: '#ef4444' }} />

          {/* FIRE dot */}
          {fire.ageAtRegularFIRE && fire.ageAtRegularFIRE <= inputs.lifeExpectancy && (
            <ReferenceDot x={fire.ageAtRegularFIRE} y={fire.regularFIRENumber}
              r={6} fill="#8b5cf6" stroke="white" strokeWidth={2}
              label={{ value: 'FIRE', position: 'top', fontSize: 10, fill: '#8b5cf6' }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Couple summary bar */}
      {isCouple && (() => {
        const retirePt = yearlyData.find(d => d.age === inputs.retirementAge);
        const total = retirePt?.portfolioNominal ?? 0;
        const yourShare = retirePt?.portfolioNominalPrimary ?? 0;
        const spouseShare = retirePt?.portfolioNominalSpouse ?? 0;
        return (
          <div className="bg-slate-50 rounded-xl p-3 text-xs">
            <p className="font-semibold text-slate-600 mb-2">At your retirement (age {inputs.retirementAge})</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-blue-500 mb-0.5">You (solo)</p>
                <p className="font-bold text-slate-800">{fmtM(yourShare)}</p>
              </div>
              <div className="bg-rose-50 rounded-lg p-2">
                <p className="text-rose-500 mb-0.5">Spouse (solo)</p>
                <p className="font-bold text-slate-800">{fmtM(spouseShare)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-green-600 mb-0.5">Combined</p>
                <p className="font-bold text-slate-800">{fmtM(total)}</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
