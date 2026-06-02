'use client';
import { useEffect, useState } from 'react';
import { Banknote, TrendingUp, Building2, User, Users } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';

interface SavingsState {
  cash: number;
  investments: number;
  otherAssets: number;
}

const CATEGORIES: { key: keyof SavingsState; label: string; icon: typeof Banknote; hint: string; color: string }[] = [
  { key: 'cash', label: 'Cash & Savings', icon: Banknote, hint: 'Savings accounts, CDs, money market', color: 'bg-emerald-400' },
  { key: 'investments', label: 'Investments', icon: TrendingUp, hint: '401k, IRA, stocks, bonds, ETFs', color: 'bg-blue-500' },
  { key: 'otherAssets', label: 'Other Assets', icon: Building2, hint: 'Real estate equity, business, collectibles', color: 'bg-purple-500' },
];

function total(s: SavingsState) { return s.cash + s.investments + s.otherAssets; }

function CurrencyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
      <input
        type="number" value={value} min={0} step={1000}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function BreakdownBar({ state }: { state: SavingsState }) {
  const t = total(state) || 1;
  return (
    <div className="space-y-1">
      <div className="flex h-2 rounded-full overflow-hidden gap-px bg-slate-100">
        {CATEGORIES.map(c => (
          <div
            key={c.key}
            className={`${c.color} transition-all`}
            style={{ width: `${(state[c.key] / t) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        {CATEGORIES.map(c => (
          <span key={c.key} className="flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${c.color}`} />
            {Math.round((state[c.key] / t) * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function PersonSavings({
  label, color, icon: Icon, state, onChange,
}: {
  label: string; color: 'blue' | 'rose'; icon: typeof User;
  state: SavingsState; onChange: (s: SavingsState) => void;
}) {
  const labelColors = { blue: 'text-blue-700 bg-blue-100', rose: 'text-rose-700 bg-rose-100' };
  const borderColors = { blue: 'border-blue-200 bg-blue-50/40', rose: 'border-rose-200 bg-rose-50/40' };

  return (
    <div className={`border rounded-xl p-3 space-y-3 ${borderColors[color]}`}>
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${labelColors[color]}`}>
        <Icon size={12} /> {label}
      </div>
      {CATEGORIES.map(({ key, label, icon: CatIcon, hint }) => (
        <div key={key} className="space-y-0.5">
          <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
            <CatIcon size={11} className="text-slate-400" />
            {label}
          </div>
          <CurrencyInput value={state[key]} onChange={v => onChange({ ...state, [key]: v })} />
          <p className="text-xs text-slate-400 leading-tight">{hint}</p>
        </div>
      ))}
      <div className="pt-1 border-t border-slate-200/60 space-y-1">
        <BreakdownBar state={state} />
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Total</span>
          <span className="font-bold text-slate-700">${total(state).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function SingleSavings({ state, onChange }: { state: SavingsState; onChange: (s: SavingsState) => void }) {
  return (
    <div className="space-y-3">
      {CATEGORIES.map(({ key, label, icon: Icon, hint, color }) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            <Icon size={12} className="text-slate-400" />
            {label}
            <span className="ml-auto text-slate-400 font-normal">{hint}</span>
          </div>
          <CurrencyInput value={state[key]} onChange={v => onChange({ ...state, [key]: v })} />
        </div>
      ))}
      <div className="pt-2 border-t border-slate-200 space-y-2">
        <BreakdownBar state={state} />
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-slate-500">Total Portfolio</span>
          <span className="text-slate-800">${total(state).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Default splits that sum to the store's initial currentSavings / spouseCurrentSavings
const defaultState = (total: number): SavingsState => ({
  cash: Math.round(total * 0.10),
  investments: Math.round(total * 0.85),
  otherAssets: Math.round(total * 0.05),
});

export function SavingsBreakdown() {
  const { inputs, setInputs } = useRetirementStore();
  const isCouple = inputs.householdType === 'spouse' || inputs.householdType === 'family';

  const [primary, setPrimaryRaw] = useState<SavingsState>(() => defaultState(inputs.currentSavings));
  const [spouse, setSpouseRaw] = useState<SavingsState>(() => defaultState(inputs.spouseCurrentSavings));

  const setPrimary = (s: SavingsState) => {
    setPrimaryRaw(s);
    setInputs({ currentSavings: total(s) });
  };
  const setSpouse = (s: SavingsState) => {
    setSpouseRaw(s);
    setInputs({ spouseCurrentSavings: total(s) });
  };

  // Keep totals in sync if user edits from another panel
  useEffect(() => {
    if (total(primary) !== inputs.currentSavings) {
      setPrimaryRaw(defaultState(inputs.currentSavings));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {isCouple ? (
        <div className="grid grid-cols-2 gap-3">
          <PersonSavings label="You" color="blue" icon={User} state={primary} onChange={setPrimary} />
          <PersonSavings label="Spouse" color="rose" icon={Users} state={spouse} onChange={setSpouse} />
        </div>
      ) : (
        <SingleSavings state={primary} onChange={setPrimary} />
      )}

      {isCouple && (
        <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Combined Household</p>
          {CATEGORIES.map(({ key, label, color }) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label}
              </span>
              <span className="font-semibold text-slate-700">${(primary[key] + spouse[key]).toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold">
            <span className="text-slate-600">Total Portfolio</span>
            <span className="text-slate-800">${(total(primary) + total(spouse)).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
