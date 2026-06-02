'use client';
import { useState } from 'react';
import { Briefcase, TrendingUp, Home, Laptop, PiggyBank, Building, Gift, DollarSign, User, Users } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';

interface IncomeCategory {
  key: string;
  label: string;
  icon: typeof Briefcase;
  hint: string;
  color: string;
  defaultPrimary: number;
  defaultSpouse: number;
}

const CATEGORIES: IncomeCategory[] = [
  { key: 'salary',     label: 'Salary / Wages',      icon: Briefcase,  hint: 'Gross monthly salary',               color: 'bg-blue-500',    defaultPrimary: 8000, defaultSpouse: 6000 },
  { key: 'bonus',      label: 'Bonus / Commission',  icon: Gift,       hint: 'Average monthly bonus',              color: 'bg-indigo-500',  defaultPrimary: 500,  defaultSpouse: 300  },
  { key: 'rental',     label: 'Rental Income',       icon: Home,       hint: 'Net rental income after expenses',   color: 'bg-emerald-500', defaultPrimary: 0,    defaultSpouse: 0   },
  { key: 'sideIncome', label: 'Side Business',       icon: Laptop,     hint: 'Freelance, consulting, etc.',        color: 'bg-purple-500',  defaultPrimary: 0,    defaultSpouse: 0   },
  { key: 'dividends',  label: 'Dividends & Interest',icon: TrendingUp, hint: 'Investment income',                  color: 'bg-amber-500',   defaultPrimary: 200,  defaultSpouse: 100 },
  { key: 'pension',    label: 'Pension',             icon: Building,   hint: 'Monthly pension benefit',            color: 'bg-cyan-500',    defaultPrimary: 0,    defaultSpouse: 0   },
  { key: 'socialSec',  label: 'Social Security',     icon: PiggyBank,  hint: 'Estimated monthly benefit',          color: 'bg-rose-400',    defaultPrimary: 0,    defaultSpouse: 0   },
  { key: 'other',      label: 'Other',               icon: DollarSign, hint: 'Alimony, royalties, etc.',           color: 'bg-slate-400',   defaultPrimary: 0,    defaultSpouse: 0   },
];

type IncomeState = Record<string, number>;
const initIncome = (who: 'primary' | 'spouse'): IncomeState =>
  Object.fromEntries(CATEGORIES.map(c => [c.key, who === 'primary' ? c.defaultPrimary : c.defaultSpouse]));
const sumIncome = (s: IncomeState) => Object.values(s).reduce((a, b) => a + b, 0);

function BreakdownBar({ state }: { state: IncomeState }) {
  const t = sumIncome(state) || 1;
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

function SavingsRateBadge({ income, contribution }: { income: number; contribution: number }) {
  if (income === 0) return null;
  const rate = Math.min(100, Math.round((contribution / income) * 100));
  const color = rate >= 20 ? 'bg-green-100 text-green-700' : rate >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{rate}% savings rate</span>;
}

/** Full-width income form used for both single and each tab in couple mode */
function IncomeForm({
  state, contribution, onChange, onContributionChange,
}: {
  state: IncomeState; contribution: number;
  onChange: (s: IncomeState) => void; onContributionChange: (v: number) => void;
}) {
  const total = sumIncome(state);

  return (
    <div className="space-y-2">
      {CATEGORIES.map(({ key, label, icon: Icon, hint, color }) => (
        <div key={key} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          {/* Icon + dot */}
          <div className="flex items-center gap-1.5 w-5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
            <Icon size={12} className="text-slate-400" />
          </div>
          {/* Label + hint */}
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{label}</p>
            <p className="text-xs text-slate-400 truncate">{hint}</p>
          </div>
          {/* Input */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
            <input
              type="number" value={state[key]} min={0} step={100}
              onChange={e => onChange({ ...state, [key]: Number(e.target.value) })}
              className="w-28 pl-5 pr-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      ))}

      {/* Separator */}
      <div className="border-t border-slate-100 pt-2 space-y-2">
        <BreakdownBar state={state} />
        <div className="flex justify-between text-xs text-slate-500">
          <span>Total income</span>
          <span className="font-semibold text-slate-700">
            ${total.toLocaleString()}<span className="text-slate-400 font-normal">/mo</span>
            &nbsp;·&nbsp;${(total * 12).toLocaleString()}<span className="text-slate-400 font-normal">/yr</span>
          </span>
        </div>

        {/* Monthly investment row */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-700">Monthly Investment</p>
            <p className="text-xs text-blue-500/70">Amount you set aside to invest</p>
          </div>
          <div className="relative shrink-0">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400 text-xs">$</span>
            <input
              type="number" value={contribution} min={0} step={100}
              onChange={e => onContributionChange(Number(e.target.value))}
              className="w-28 pl-5 pr-2 py-1.5 border border-blue-200 rounded-lg text-xs text-blue-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between px-1">
            <SavingsRateBadge income={total} contribution={contribution} />
            <span className="text-xs text-slate-400">
              ${Math.max(0, total - contribution).toLocaleString()}/mo disposable
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function IncomeBreakdown() {
  const { inputs, setInputs } = useRetirementStore();
  const isCouple = inputs.householdType === 'spouse' || inputs.householdType === 'family';

  const [primary, setPrimary] = useState<IncomeState>(() => initIncome('primary'));
  const [spouse, setSpouse]   = useState<IncomeState>(() => initIncome('spouse'));
  const [activeTab, setActiveTab] = useState<'you' | 'spouse'>('you');

  const primaryTotal = sumIncome(primary);
  const spouseTotal  = sumIncome(spouse);
  const combinedIncome = primaryTotal + spouseTotal;
  const combinedContrib = inputs.monthlyContribution + inputs.spouseMonthlyContribution;

  if (!isCouple) {
    return (
      <IncomeForm
        state={primary} contribution={inputs.monthlyContribution}
        onChange={setPrimary}
        onContributionChange={v => setInputs({ monthlyContribution: v })}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
        {([
          { id: 'you',    label: 'You',    icon: User,  total: primaryTotal, contrib: inputs.monthlyContribution },
          { id: 'spouse', label: 'Spouse', icon: Users, total: spouseTotal,  contrib: inputs.spouseMonthlyContribution },
        ] as const).map(({ id, label, icon: Icon, total, contrib }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <span className="flex items-center gap-1.5">
              <Icon size={12} /> {label}
            </span>
            <span className={`text-xs ${activeTab === id ? 'text-blue-600' : 'text-slate-400'}`}>
              ${total.toLocaleString()}/mo
            </span>
          </button>
        ))}
      </div>

      {/* Active person's form */}
      {activeTab === 'you' ? (
        <IncomeForm
          state={primary} contribution={inputs.monthlyContribution}
          onChange={setPrimary}
          onContributionChange={v => setInputs({ monthlyContribution: v })}
        />
      ) : (
        <IncomeForm
          state={spouse} contribution={inputs.spouseMonthlyContribution}
          onChange={setSpouse}
          onContributionChange={v => setInputs({ spouseMonthlyContribution: v })}
        />
      )}

      {/* Combined household summary */}
      <div className="bg-slate-50 rounded-xl px-3 py-3 space-y-1.5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Combined Household</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-slate-500">Total income</span>
          <span className="font-semibold text-slate-700 text-right">${combinedIncome.toLocaleString()}/mo</span>
          <span className="text-slate-500">Total invested</span>
          <span className="font-semibold text-slate-700 text-right">${combinedContrib.toLocaleString()}/mo</span>
          <span className="text-slate-500">Disposable</span>
          <span className="font-semibold text-slate-700 text-right">${Math.max(0, combinedIncome - combinedContrib).toLocaleString()}/mo</span>
        </div>
        {combinedIncome > 0 && (
          <SavingsRateBadge income={combinedIncome} contribution={combinedContrib} />
        )}
      </div>
    </div>
  );
}
