'use client';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ReferenceDot, ResponsiveContainer,
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
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-blue-500" /> Nominal Portfolio</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-green-500" /> Real (Inflation-adj.)</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-amber-400" /> Retirement</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-red-400" /> Corpus Needed</span>
        {fire.ageAtRegularFIRE && <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-purple-500" /> FIRE Age</span>}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={yearlyData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 11 }} />
          <YAxis tickFormatter={fmtM} tick={{ fontSize: 10 }} width={60} />
          <Tooltip content={<CustomTooltip />} />

          <Line
            type="monotone" dataKey="portfolioNominal" stroke="#3b82f6"
            strokeWidth={2.5} dot={false} name="Nominal Portfolio"
          />
          <Line
            type="monotone" dataKey="portfolioReal" stroke="#10b981"
            strokeWidth={1.5} dot={false} strokeDasharray="6 3" name="Real Portfolio"
          />

          <ReferenceLine
            x={inputs.retirementAge} stroke="#f59e0b" strokeWidth={2}
            label={{ value: 'Retire', position: 'top', fontSize: 10, fill: '#f59e0b' }}
          />
          <ReferenceLine
            y={corpus.nominalNeeded} stroke="#ef4444" strokeWidth={1.5}
            strokeDasharray="8 4"
            label={{ value: 'Need', position: 'right', fontSize: 10, fill: '#ef4444' }}
          />

          {fire.ageAtRegularFIRE && fire.ageAtRegularFIRE <= inputs.lifeExpectancy && (
            <ReferenceDot
              x={fire.ageAtRegularFIRE} y={fire.regularFIRENumber}
              r={6} fill="#8b5cf6" stroke="white" strokeWidth={2}
              label={{ value: 'FIRE', position: 'top', fontSize: 10, fill: '#8b5cf6' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
