'use client';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';

function fmtM(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const byName = Object.fromEntries(payload.map((p: { name: string; value: number }) => [p.name, p.value]));
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs space-y-1">
      <p className="font-bold text-slate-700 mb-1">Age {label}</p>
      {[['90th %ile', byName['p90']], ['75th %ile', byName['p75']], ['Median (50th)', byName['p50']], ['25th %ile', byName['p25']], ['10th %ile', byName['p10']]].map(([n, v]) => (
        v !== undefined && <div key={String(n)} className="flex justify-between gap-4">
          <span className="text-slate-500">{n}:</span>
          <span className="font-semibold">{fmtM(Number(v))}</span>
        </div>
      ))}
    </div>
  );
}

export function MonteCarloChart() {
  const monteCarloRunning = useRetirementStore(s => s.monteCarloRunning);
  const monteCarloResult = useRetirementStore(s => s.monteCarloResult);
  const results = useRetirementStore(s => s.results);
  const inputs = useRetirementStore(s => s.inputs);

  if (monteCarloRunning) {
    return (
      <div className="h-72 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <p className="text-sm">Running 1,000 simulations...</p>
      </div>
    );
  }

  if (!monteCarloResult || !results) return null;

  const { ages, p10, p25, p50, p75, p90 } = monteCarloResult;
  const { yearlyData } = results;

  // Build chart data — merge percentile bands with deterministic line
  const chartData = ages.map((age, i) => ({
    age,
    p10: p10[i],
    p25: p25[i],
    p50: p50[i],
    p75: p75[i],
    p90: p90[i],
    deterministic: yearlyData.find(d => d.age === age)?.portfolioNominal ?? 0,
  }));

  const successRate = monteCarloResult.successRate;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-3 bg-blue-200 opacity-60" /> p10–p90 band</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-3 bg-blue-400 opacity-60" /> p25–p75 band</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-blue-700" /> Median</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 border-t border-dashed border-slate-400" /> Projected</span>
        </div>
        <div className={`text-sm font-bold px-3 py-1 rounded-lg ${
          successRate >= 0.9 ? 'bg-green-100 text-green-700' :
          successRate >= 0.75 ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {Math.round(successRate * 100)}% success rate
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 11 }} />
          <YAxis tickFormatter={fmtM} tick={{ fontSize: 10 }} width={60} />
          <Tooltip content={<CustomTooltip />} />

          {/* Outer band: p10 masked by white, then p90 fills the rest */}
          <Area type="monotone" dataKey="p90" stroke="none" fill="#93c5fd" fillOpacity={0.35} legendType="none" name="p90" />
          <Area type="monotone" dataKey="p10" stroke="none" fill="white" fillOpacity={1} legendType="none" name="p10" />

          {/* Inner band */}
          <Area type="monotone" dataKey="p75" stroke="none" fill="#3b82f6" fillOpacity={0.3} legendType="none" name="p75" />
          <Area type="monotone" dataKey="p25" stroke="none" fill="white" fillOpacity={1} legendType="none" name="p25" />

          {/* Median */}
          <Line type="monotone" dataKey="p50" stroke="#1d4ed8" strokeWidth={2.5} dot={false} name="p50" legendType="none" />

          {/* Deterministic comparison */}
          <Line type="monotone" dataKey="deterministic" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="deterministic" legendType="none" />

          <ReferenceLine x={inputs.retirementAge} stroke="#f59e0b" strokeWidth={2}
            label={{ value: 'Retire', position: 'top', fontSize: 10, fill: '#f59e0b' }} />
        </ComposedChart>
      </ResponsiveContainer>

      {monteCarloResult.medianDepletionAge && (
        <p className="text-xs text-red-600 text-center">
          In failed scenarios, portfolio depletes at median age {monteCarloResult.medianDepletionAge}.
        </p>
      )}

      <p className="text-xs text-slate-400 text-center">
        Returns: μ={Math.round(inputs.expectedReturnRate * 100)}%, σ=12% | Inflation: μ={Math.round(inputs.inflationRate * 100)}%, σ=1%
      </p>
    </div>
  );
}
