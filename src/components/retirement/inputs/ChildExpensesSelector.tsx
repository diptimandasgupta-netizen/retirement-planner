'use client';
import { useState, useEffect, useRef } from 'react';
import { useRetirementStore } from '@/store/retirementStore';

interface ChildExpenseCategory {
  key: string;
  storeKey: string;        // maps to RetirementInputs field
  label: string;
  description?: string;
  defaultAnnual: number;   // per child, per year
  minAnnual: number;
  maxAnnual: number;
  ageRange: string;
  icon: string;
}

const CATEGORIES: ChildExpenseCategory[] = [
  { key: 'daycare',           storeKey: 'childExpenseDaycare',           label: 'Daycare / Preschool',       ageRange: '0–5',   icon: '🧒', defaultAnnual: 18000, minAnnual: 5000,  maxAnnual: 40000 },
  { key: 'publicExtras',      storeKey: 'childExpensePublicExtras',      label: 'Public School Extras',      ageRange: '5–18',  icon: '🏫', defaultAnnual: 3000,  minAnnual: 500,   maxAnnual: 10000 },
  { key: 'privateSchool',     storeKey: 'childExpensePrivateSchool',     label: 'Private School K-12',       ageRange: '5–18',  icon: '🎓', defaultAnnual: 35000, minAnnual: 10000, maxAnnual: 60000 },
  { key: 'activities',        storeKey: 'childExpenseActivities',        label: 'Activities & Sports',       ageRange: '3–18',  icon: '⚽', defaultAnnual: 5000,  minAnnual: 500,   maxAnnual: 20000 },
  { key: 'premiumActivities', storeKey: 'childExpensePremiumActivities', label: 'Premium Activities',        description: 'Travel team, private lessons', ageRange: '5–18', icon: '🏅', defaultAnnual: 15000, minAnnual: 2000, maxAnnual: 30000 },
  { key: 'healthcare',        storeKey: 'childExpenseHealthcare',        label: 'Child Healthcare',          ageRange: '0–26',  icon: '🏥', defaultAnnual: 3000,  minAnnual: 500,   maxAnnual: 10000 },
  { key: 'collegeSavings',    storeKey: 'childExpenseCollegeSavings',    label: 'College Savings (529)',     ageRange: '0–18',  icon: '🏦', defaultAnnual: 12000, minAnnual: 1000,  maxAnnual: 30000 },
  { key: 'collegeTuition',    storeKey: 'childExpenseCollegeTuition',    label: 'College Tuition (4 years)', ageRange: '18–22', icon: '📚', defaultAnnual: 45000, minAnnual: 10000, maxAnnual: 80000 },
  { key: 'babysitter',        storeKey: 'childExpenseBabysitter',        label: 'Babysitter / Nanny',        ageRange: '0–12',  icon: '👶', defaultAnnual: 8000,  minAnnual: 1000,  maxAnnual: 25000 },
  { key: 'foodClothing',      storeKey: 'childExpenseFoodClothing',      label: 'Food & Clothing',           ageRange: '0–18',  icon: '🛒', defaultAnnual: 4000,  minAnnual: 1000,  maxAnnual: 12000 },
];

type SelectionState = Record<string, { selected: boolean; amount: number }>;

function initState(inputs: Record<string, unknown>): SelectionState {
  return Object.fromEntries(
    CATEGORIES.map(c => {
      const stored = (inputs[c.storeKey] as number) ?? 0;
      return [c.key, { selected: stored > 0, amount: stored > 0 ? stored : c.defaultAnnual }];
    })
  );
}

function totalPerChild(state: SelectionState): number {
  return Object.entries(state)
    .filter(([, v]) => v.selected)
    .reduce((sum, [, v]) => sum + v.amount, 0);
}

function formatK(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;
}

export function ChildExpensesSelector() {
  const { inputs, setInputs } = useRetirementStore();
  const inputsMap = inputs as unknown as Record<string, unknown>;
  const [sel, setSel] = useState<SelectionState>(() => initState(inputsMap));
  const prevTotal = useRef<number | null>(null);

  // Sync all category amounts + total → store
  useEffect(() => {
    const total = totalPerChild(sel);
    if (prevTotal.current === total) return;
    prevTotal.current = total;
    const categoryFields = Object.fromEntries(
      CATEGORIES.map(c => [c.storeKey, sel[c.key].selected ? sel[c.key].amount : 0])
    );
    setInputs({ childAnnualExpense: total, ...categoryFields } as never);
  }, [sel, setInputs]);

  function toggle(key: string) {
    setSel(s => ({ ...s, [key]: { ...s[key], selected: !s[key].selected } }));
  }

  function setAmount(key: string, amount: number) {
    setSel(s => ({ ...s, [key]: { ...s[key], amount } }));
  }

  const total = totalPerChild(sel);
  const numChildren = inputs.numChildren ?? 1;
  const selectedCount = Object.values(sel).filter(v => v.selected).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Select all applicable expenses. Amounts are <span className="font-semibold">per child, per year</span>.
        Total is multiplied by {numChildren} child{numChildren !== 1 ? 'ren' : ''} in calculations.
      </p>

      {/* Category grid */}
      <div className="grid grid-cols-1 gap-2">
        {CATEGORIES.map(cat => {
          const state = sel[cat.key];
          return (
            <div
              key={cat.key}
              className={`border-2 rounded-xl overflow-hidden transition-all ${
                state.selected
                  ? 'border-violet-500 bg-violet-50/60 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-violet-300'
              }`}
            >
              {/* Header row — click to toggle */}
              <button
                onClick={() => toggle(cat.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all ${
                  state.selected
                    ? 'bg-violet-600 border-violet-600'
                    : 'border-slate-300 bg-white'
                }`}>
                  {state.selected && (
                    <svg viewBox="0 0 12 10" className="w-3 h-3 fill-white">
                      <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                {/* Icon + label */}
                <span className="text-base shrink-0">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold leading-tight ${state.selected ? 'text-violet-800' : 'text-slate-700'}`}>
                    {cat.label}
                    {cat.description && <span className="font-normal text-slate-500"> ({cat.description})</span>}
                  </p>
                  <p className="text-xs text-slate-400">{formatK(cat.defaultAnnual)}/yr per child · ages {cat.ageRange}</p>
                </div>

                {/* Current amount badge */}
                <span className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded-full ${
                  state.selected ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {formatK(state.amount)}/yr
                </span>
              </button>

              {/* Slider — only when selected */}
              {state.selected && (
                <div className="px-4 pb-3 pt-1 space-y-1 bg-violet-50/40">
                  <div className="flex justify-between text-xs text-violet-600/60">
                    <span>{formatK(cat.minAnnual)}</span>
                    <span className="font-semibold text-violet-700">{formatK(state.amount)}/yr per child</span>
                    <span>{formatK(cat.maxAnnual)}</span>
                  </div>
                  <input
                    type="range"
                    min={cat.minAnnual}
                    max={cat.maxAnnual}
                    step={500}
                    value={state.amount}
                    onChange={e => setAmount(cat.key, Number(e.target.value))}
                    className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer"
                  />
                  {numChildren > 1 && (
                    <p className="text-xs text-violet-500 text-right">
                      Total for {numChildren} children: <span className="font-bold">${(state.amount * numChildren).toLocaleString()}/yr</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {selectedCount > 0 && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200/60 rounded-xl px-4 py-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-violet-600">{selectedCount} expense{selectedCount !== 1 ? 's' : ''} selected</span>
            <span className="font-semibold text-violet-700">{formatK(total)}/yr per child</span>
          </div>
          {numChildren > 1 && (
            <div className="flex justify-between text-sm font-bold">
              <span className="text-violet-700">Total ({numChildren} children)</span>
              <span className="text-violet-800">${(total * numChildren).toLocaleString()}/yr</span>
            </div>
          )}
          <div className="text-xs text-violet-500 text-right">
            = ${Math.round(total * numChildren / 12).toLocaleString()}/mo deducted from contributions
          </div>
        </div>
      )}

      {selectedCount === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">
          Select at least one expense category above
        </p>
      )}
    </div>
  );
}
