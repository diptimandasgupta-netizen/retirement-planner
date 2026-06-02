'use client';
import { useState } from 'react';
import { Building2, PiggyBank, TrendingUp, Heart, Briefcase, Plus } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';
import { User, Users } from 'lucide-react';

interface ContribCategory {
  key: string;
  label: string;
  icon: typeof Building2;
  hint: string;
  color: string;
  defaultAmount: number;
}

const CATEGORIES: ContribCategory[] = [
  { key: 'k401',       label: '401(k) / 403(b)', icon: Building2,  hint: 'Employer retirement plan',       color: 'bg-blue-500',    defaultAmount: 750  },
  { key: 'ira',        label: 'IRA / Roth IRA',   icon: PiggyBank,  hint: 'Individual retirement account',  color: 'bg-purple-500',  defaultAmount: 500  },
  { key: 'hsa',        label: 'HSA',              icon: Heart,      hint: 'Health savings account',         color: 'bg-red-400',     defaultAmount: 150  },
  { key: 'brokerage',  label: 'Brokerage',        icon: TrendingUp, hint: 'Taxable investment account',     color: 'bg-emerald-500', defaultAmount: 400  },
  { key: 'other',      label: 'Other',            icon: Briefcase,  hint: 'ESPP, pension, crypto, etc.',   color: 'bg-slate-400',   defaultAmount: 200  },
];

type ContribState = Record<string, number>;

const initContribs = (total: number): ContribState => {
  // Distribute proportionally to defaults
  const defaultTotal = CATEGORIES.reduce((s, c) => s + c.defaultAmount, 0);
  return Object.fromEntries(
    CATEGORIES.map(c => [c.key, Math.round((c.defaultAmount / defaultTotal) * total)])
  );
};

const sumContribs = (s: ContribState) => Object.values(s).reduce((a, b) => a + b, 0);

function BreakdownBar({ state }: { state: ContribState }) {
  const t = sumContribs(state) || 1;
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-px">
      {CATEGORIES.filter(c => state[c.key] > 0).map(c => (
        <div key={c.key} className={`${c.color} transition-all`}
          style={{ width: `${(state[c.key] / t) * 100}%` }}
          title={`${c.label}: $${state[c.key].toLocaleString()}/mo`} />
      ))}
    </div>
  );
}

function ContribInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative w-28">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
      <input
        type="number" value={value} min={0} step={50}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full pl-4 pr-1 py-1 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">/mo</span>
    </div>
  );
}

function PersonContribs({
  label, color, icon: Icon, state, onChange,
}: {
  label: string; color: 'blue' | 'rose'; icon: typeof User;
  state: ContribState; onChange: (s: ContribState) => void;
}) {
  const labelColors = { blue: 'text-blue-700 bg-blue-100', rose: 'text-rose-700 bg-rose-100' };
  const borderColors = { blue: 'border-blue-200 bg-blue-50/40', rose: 'border-rose-200 bg-rose-50/40' };
  const total = sumContribs(state);

  return (
    <div className={`border rounded-xl p-3 space-y-2.5 ${borderColors[color]}`}>
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${labelColors[color]}`}>
          <Icon size={12} /> {label}
        </div>
        <span className="text-xs font-bold text-slate-600">${total.toLocaleString()}/mo</span>
      </div>
      {CATEGORIES.map(({ key, label, icon: CatIcon, hint, color: dotColor }) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
          <CatIcon size={11} className="text-slate-400 shrink-0" />
          <span className="text-xs text-slate-600 flex-1 min-w-0 truncate" title={hint}>{label}</span>
          <ContribInput value={state[key]} onChange={v => onChange({ ...state, [key]: v })} />
        </div>
      ))}
      <div className="pt-1 space-y-1">
        <BreakdownBar state={state} />
      </div>
    </div>
  );
}

function SingleContribs({ state, onChange }: { state: ContribState; onChange: (s: ContribState) => void }) {
  return (
    <div className="space-y-2">
      {CATEGORIES.map(({ key, label, icon: Icon, hint, color }) => (
        <div key={key} className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
          <Icon size={12} className="text-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 leading-none">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{hint}</p>
          </div>
          <ContribInput value={state[key]} onChange={v => onChange({ ...state, [key]: v })} />
        </div>
      ))}
    </div>
  );
}

export function ContributionsBreakdown() {
  const { inputs, setInputs } = useRetirementStore();
  const isCouple = inputs.householdType === 'spouse' || inputs.householdType === 'family';

  const [primary, setPrimaryRaw] = useState<ContribState>(() => initContribs(inputs.monthlyContribution));
  const [spouse, setSpouseRaw]   = useState<ContribState>(() => initContribs(inputs.spouseMonthlyContribution));

  const setPrimary = (s: ContribState) => {
    setPrimaryRaw(s);
    setInputs({ monthlyContribution: sumContribs(s) });
  };
  const setSpouse = (s: ContribState) => {
    setSpouseRaw(s);
    setInputs({ spouseMonthlyContribution: sumContribs(s) });
  };

  const primaryTotal = sumContribs(primary);
  const spouseTotal  = sumContribs(spouse);
  const combinedTotal = primaryTotal + (isCouple ? spouseTotal : 0);

  return (
    <div className="space-y-3">
      {isCouple ? (
        <div className="grid grid-cols-2 gap-3">
          <PersonContribs label="You" color="blue" icon={User} state={primary} onChange={setPrimary} />
          <PersonContribs label="Spouse" color="rose" icon={Users} state={spouse} onChange={setSpouse} />
        </div>
      ) : (
        <SingleContribs state={primary} onChange={setPrimary} />
      )}

      {/* Total bar + summary */}
      <div className="space-y-2 pt-1 border-t border-slate-100">
        <BreakdownBar state={
          isCouple
            ? Object.fromEntries(CATEGORIES.map(c => [c.key, primary[c.key] + spouse[c.key]]))
            : primary
        } />

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <span key={c.key} className="flex items-center gap-1 text-xs text-slate-500">
                <span className={`w-2 h-2 rounded-full ${c.color}`} />
                {c.label}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Total monthly</p>
            <p className="text-lg font-bold text-slate-800">${combinedTotal.toLocaleString()}<span className="text-xs font-normal text-slate-400">/mo</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Annual</p>
            <p className="text-sm font-bold text-slate-600">${(combinedTotal * 12).toLocaleString()}/yr</p>
          </div>
        </div>

        {isCouple && (
          <div className="grid grid-cols-2 gap-2 text-xs text-center">
            <div className="bg-blue-50 rounded-lg py-1.5">
              <p className="text-blue-500">You</p>
              <p className="font-bold text-slate-700">${primaryTotal.toLocaleString()}/mo</p>
            </div>
            <div className="bg-rose-50 rounded-lg py-1.5">
              <p className="text-rose-500">Spouse</p>
              <p className="font-bold text-slate-700">${spouseTotal.toLocaleString()}/mo</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
