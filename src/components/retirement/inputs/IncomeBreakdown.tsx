'use client';
import { useState, useEffect, useRef } from 'react';
import { Briefcase, TrendingUp, Home, Laptop, PiggyBank, Building, Gift, DollarSign, User, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';
import { estimateTax, CONTRIBUTION_LIMITS } from '@/lib/retirement/taxEstimate';
import { getLocation } from '@/lib/retirement/data/locations';

interface IncomeCategory {
  key: string;
  label: string;
  icon: typeof Briefcase;
  hint: string;
  color: string;
  defaultPrimary: number;
  defaultSpouse: number;
  stopsAtRetirement: boolean; // active income that ends when you retire
}

const CATEGORIES: IncomeCategory[] = [
  { key: 'salary',     label: 'Salary / Wages',      icon: Briefcase,  hint: 'Gross monthly salary',               color: 'bg-blue-500',    defaultPrimary: 8000, defaultSpouse: 6000, stopsAtRetirement: true  },
  { key: 'bonus',      label: 'Bonus / Commission',  icon: Gift,       hint: 'Average monthly bonus',              color: 'bg-indigo-500',  defaultPrimary: 500,  defaultSpouse: 300,  stopsAtRetirement: true  },
  { key: 'sideIncome', label: 'Side Business',       icon: Laptop,     hint: 'Freelance, consulting, etc.',        color: 'bg-purple-500',  defaultPrimary: 0,    defaultSpouse: 0,    stopsAtRetirement: true  },
  { key: 'rental',     label: 'Rental Income',       icon: Home,       hint: 'Net rental income after expenses',   color: 'bg-emerald-500', defaultPrimary: 0,    defaultSpouse: 0,    stopsAtRetirement: false },
  { key: 'dividends',  label: 'Dividends & Interest',icon: TrendingUp, hint: 'Investment income',                  color: 'bg-amber-500',   defaultPrimary: 200,  defaultSpouse: 100,  stopsAtRetirement: false },
  { key: 'pension',    label: 'Pension',             icon: Building,   hint: 'Monthly pension benefit',            color: 'bg-cyan-500',    defaultPrimary: 0,    defaultSpouse: 0,    stopsAtRetirement: false },
  { key: 'socialSec',  label: 'Social Security',     icon: PiggyBank,  hint: 'Estimated monthly benefit',          color: 'bg-rose-400',    defaultPrimary: 0,    defaultSpouse: 0,    stopsAtRetirement: false },
  { key: 'other',      label: 'Other',               icon: DollarSign, hint: 'Alimony, royalties, etc.',           color: 'bg-slate-400',   defaultPrimary: 0,    defaultSpouse: 0,    stopsAtRetirement: false },
];

type IncomeState = Record<string, number>;
const sumIncome = (s: IncomeState) => Object.values(s).reduce((a, b) => a + b, 0);

// Map between IncomeState keys and RetirementInputs field names
const PRIMARY_INCOME_KEYS: Record<string, string> = {
  salary: 'incomeSalary', bonus: 'incomeBonus', rental: 'incomeRental',
  sideIncome: 'incomeSideIncome', dividends: 'incomeDividends',
  pension: 'incomePension', socialSec: 'incomeSocialSec', other: 'incomeOther',
};
const SPOUSE_INCOME_KEYS: Record<string, string> = {
  salary: 'spouseIncomeSalary', bonus: 'spouseIncomeBonus', rental: 'spouseIncomeRental',
  sideIncome: 'spouseIncomeSideIncome', dividends: 'spouseIncomeDividends',
  pension: 'spouseIncomePension', socialSec: 'spouseIncomeSocialSec', other: 'spouseIncomeOther',
};

function initIncomeFromStore(inputs: Record<string, unknown>, keyMap: Record<string, string>, defaultWho: 'primary' | 'spouse'): IncomeState {
  // If any store value is non-zero, use store; otherwise use component defaults
  const hasStoreData = Object.values(keyMap).some(k => ((inputs[k] as number) ?? 0) > 0);
  if (hasStoreData) {
    return Object.fromEntries(
      Object.entries(keyMap).map(([catKey, storeKey]) => [catKey, (inputs[storeKey] as number) ?? 0])
    );
  }
  return Object.fromEntries(CATEGORIES.map(c => [c.key, defaultWho === 'primary' ? c.defaultPrimary : c.defaultSpouse]));
}

function incomeStateToStoreFields(state: IncomeState, keyMap: Record<string, string>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(keyMap).map(([catKey, storeKey]) => [storeKey, state[catKey] ?? 0])
  );
}

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

function InvestInput({ label, value, onChange, hint, limit }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string; limit?: number;
}) {
  const overLimit = limit && value > limit;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 leading-none">{label}</p>
        {hint && <p className="text-xs text-slate-400 truncate">{hint}</p>}
      </div>
      <div className="relative shrink-0">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
        <input
          type="number" value={value} min={0} step={50}
          onChange={e => onChange(Number(e.target.value))}
          className={`w-28 pl-5 pr-2 py-1 border rounded-lg text-xs text-right focus:outline-none focus:ring-1 ${
            overLimit
              ? 'border-amber-400 text-amber-700 focus:ring-amber-400'
              : 'border-slate-200 text-slate-900 focus:ring-blue-500'
          }`}
        />
      </div>
      {overLimit && (
        <span className="text-xs text-amber-600 shrink-0">over limit</span>
      )}
    </div>
  );
}

/** Full tax + investment breakdown — handles 401k (pre-tax), Roth IRA (post-tax), other */
function TaxSummary({ grossMonthly, person, period }: {
  grossMonthly: number;
  person: 'primary' | 'spouse';
  period: Period;
}) {
  const [expanded, setExpanded] = useState(false);
  const { inputs, setInputs } = useRetirementStore();
  const stateTaxRate = getLocation(inputs.currentLocationId).stateTaxRate;

  // Retirement age — 401k and Roth stop here, same as active income
  const retirementAge = person === 'spouse' ? inputs.spouseRetirementAge : inputs.retirementAge;

  // Period helpers for investment inputs
  const toDisplay = (monthly: number) => period === 'annually' ? Math.round(monthly * 12) : monthly;
  const toMonthly = (v: number)       => period === 'annually' ? v / 12 : v;
  const periodLabel = period === 'monthly' ? '/mo' : '/yr';
  const limitScale  = period === 'annually' ? 12 : 1;

  const k401    = person === 'primary' ? inputs.monthly401k                : inputs.spouseMonthly401k;
  const roth    = person === 'primary' ? inputs.monthlyRothIRA             : inputs.spouseMonthlyRothIRA;
  const other   = person === 'primary' ? inputs.monthlyOtherInvestment     : inputs.spouseMonthlyOtherInvestment;

  const setK401  = (v: number) => {
    const key = person === 'primary' ? 'monthly401k' : 'spouseMonthly401k';
    const contribKey = person === 'primary' ? 'monthlyContribution' : 'spouseMonthlyContribution';
    setInputs({ [key]: v, [contribKey]: v + roth + other });
  };
  const setRoth  = (v: number) => {
    const key = person === 'primary' ? 'monthlyRothIRA' : 'spouseMonthlyRothIRA';
    const contribKey = person === 'primary' ? 'monthlyContribution' : 'spouseMonthlyContribution';
    setInputs({ [key]: v, [contribKey]: k401 + v + other });
  };
  const setOther = (v: number) => {
    const key = person === 'primary' ? 'monthlyOtherInvestment' : 'spouseMonthlyOtherInvestment';
    const contribKey = person === 'primary' ? 'monthlyContribution' : 'spouseMonthlyContribution';
    setInputs({ [key]: v, [contribKey]: k401 + roth + v });
  };

  const tax = estimateTax(grossMonthly, stateTaxRate, k401, roth, other);

  if (grossMonthly === 0) return null;

  const srColor =
    tax.totalInvestedMonthly / Math.max(1, tax.netMonthly + k401) >= 0.20 ? 'text-green-600 bg-green-50' :
    tax.totalInvestedMonthly / Math.max(1, tax.netMonthly + k401) >= 0.10 ? 'text-amber-600 bg-amber-50' :
    'text-red-600 bg-red-50';
  const savingsPct = Math.round((tax.totalInvestedMonthly / Math.max(1, grossMonthly)) * 100);

  return (
    <div className="border-t border-slate-100 pt-3 space-y-2.5">

      {/* 401k — PRE-TAX */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-xs font-bold text-emerald-700">401(k) / 403(b) — Pre-tax</p>
            <p className="text-xs text-emerald-600/80">Reduces taxable income · grows tax-deferred</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
              stops at {retirementAge}
            </span>
            {tax.taxSavings401k > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                saves ~${tax.taxSavings401k}/mo in tax
              </span>
            )}
          </div>
        </div>
        <InvestInput
          label={`401(k) contribution (${period})`}
          value={toDisplay(k401)}
          onChange={v => setK401(toMonthly(v))}
          hint={`${CONTRIBUTION_LIMITS.year} limit: $${Math.round(CONTRIBUTION_LIMITS.k401Monthly * limitScale).toLocaleString()}${periodLabel} ($${CONTRIBUTION_LIMITS.k401Annual.toLocaleString()}/yr)`}
          limit={CONTRIBUTION_LIMITS.k401Monthly * limitScale}
        />
      </div>

      {/* Tax waterfall — collapsible */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-left"
        >
          <span className="text-xs font-semibold text-slate-600">Tax calculation (estimated)</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">${tax.netMonthly.toLocaleString()}/mo net</span>
            {expanded ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
          </div>
        </button>
        {expanded && (
          <div className="px-3 py-3 space-y-1.5 bg-white text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Gross income</span>
              <span className="font-semibold text-slate-700">${tax.grossMonthly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>401(k) pre-tax deduction</span>
              <span>−${tax.contribution401kMonthly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400 border-t border-slate-100 pt-1">
              <span>Taxable income</span>
              <span>${tax.taxableIncomeMonthly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Federal tax <span className="text-slate-400">({(tax.effectiveFederalRate * 100).toFixed(1)}% effective)</span></span>
              <span>−${tax.federalTaxMonthly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>State / local tax <span className="text-slate-400">({(stateTaxRate * 100).toFixed(1)}%)</span></span>
              <span>−${tax.stateTaxMonthly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>FICA <span className="text-slate-400">(SS 6.2% + Medicare 1.45%)</span></span>
              <span>−${tax.ficaMonthly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-slate-100 pt-1.5 text-slate-800">
              <span>Net take-home</span>
              <span>${tax.netMonthly.toLocaleString()}/mo</span>
            </div>
            <p className="text-slate-400 pt-1 leading-relaxed">
              Estimate — {CONTRIBUTION_LIMITS.year} single-filer standard deduction. 401(k) reduces federal & state income tax but not FICA. Does not account for AMT or itemised deductions.
            </p>
          </div>
        )}
      </div>

      {/* Roth IRA — POST-TAX */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-blue-700">Roth IRA — Post-tax</p>
            <p className="text-xs text-blue-600/80">No tax deduction now · grows & withdraws tax-free in retirement</p>
          </div>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
            stops at {retirementAge}
          </span>
        </div>
        <InvestInput
          label={`Roth IRA contribution (${period})`}
          value={toDisplay(roth)}
          onChange={v => setRoth(toMonthly(v))}
          hint={`${CONTRIBUTION_LIMITS.year} limit: $${Math.round(CONTRIBUTION_LIMITS.rothIRAMonthly * limitScale).toLocaleString()}${periodLabel} ($${CONTRIBUTION_LIMITS.rothIRAAnnual.toLocaleString()}/yr)`}
          limit={CONTRIBUTION_LIMITS.rothIRAMonthly * limitScale}
        />
      </div>

      {/* Other investments */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
        <InvestInput
          label={`Other investments (${period})`}
          value={toDisplay(other)}
          onChange={v => setOther(toMonthly(v))}
          hint="Post-tax · brokerage, HSA, etc."
        />
      </div>

      {/* Summary */}
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-3 space-y-1.5">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Net take-home</span>
          <span>${toDisplay(tax.netMonthly).toLocaleString()}{periodLabel}</span>
        </div>
        {roth > 0 && <div className="flex justify-between text-xs text-blue-600">
          <span>Roth IRA</span><span>−${toDisplay(tax.rothIRAMonthly).toLocaleString()}</span>
        </div>}
        {other > 0 && <div className="flex justify-between text-xs text-slate-500">
          <span>Other investments</span><span>−${toDisplay(tax.otherInvestmentMonthly).toLocaleString()}</span>
        </div>}
        <div className="flex justify-between text-xs text-slate-400 border-t border-slate-100 pt-1">
          <span>Disposable</span>
          <span className="font-semibold text-slate-700">${toDisplay(tax.disposableMonthly).toLocaleString()}{periodLabel}</span>
        </div>
        <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1.5">
          <span className="text-slate-700">Total invested</span>
          <span className="text-slate-800">${toDisplay(tax.totalInvestedMonthly).toLocaleString()}{periodLabel}</span>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${srColor}`}>
            {savingsPct}% of gross invested
          </span>
          <span className="text-xs text-slate-400">401k + Roth + other</span>
        </div>
      </div>
    </div>
  );
}

type Period = 'monthly' | 'annually';

/** Income row — defined outside IncomeForm so React never remounts it on re-render */
function IncomeRow({
  cat, state, retirementAge, period, onChange,
}: {
  cat: IncomeCategory;
  state: IncomeState;
  retirementAge: number;
  period: Period;
  onChange: (s: IncomeState) => void;
}) {
  const { key, label, icon: Icon, hint, color, stopsAtRetirement } = cat;
  const toDisplay = (monthly: number) => period === 'annually' ? Math.round(monthly * 12) : monthly;
  const toMonthly = (v: number)       => period === 'annually' ? v / 12 : v;
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
      <div className="flex items-center gap-1.5 w-5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
        <Icon size={12} className="text-slate-400" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-slate-700 truncate">{label}</p>
          {stopsAtRetirement && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">
              stops at {retirementAge}
            </span>
          )}
          {!stopsAtRetirement && state[key] > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium shrink-0">
              continues
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 truncate">{hint}</p>
      </div>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
        <input
          type="number"
          value={toDisplay(state[key])}
          min={0}
          step={period === 'monthly' ? 100 : 1000}
          onChange={e => onChange({ ...state, [key]: toMonthly(Number(e.target.value)) })}
          className="w-28 pl-5 pr-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

/** Full-width income form used for both single and each tab in couple mode */
function IncomeForm({
  state, person, onChange, onPassiveChange,
}: {
  state: IncomeState;
  person: 'primary' | 'spouse';
  onChange: (s: IncomeState) => void;
  onPassiveChange: (monthly: number) => void;
}) {
  const [period, setPeriod] = useState<Period>('monthly');

  // Always read retirement age live from store — stays in sync with "Retire At" slider
  const retirementAge = useRetirementStore(s =>
    person === 'spouse' ? s.inputs.spouseRetirementAge : s.inputs.retirementAge
  );

  const total   = sumIncome(state);
  const active  = CATEGORIES.filter(c =>  c.stopsAtRetirement);
  const passive = CATEGORIES.filter(c => !c.stopsAtRetirement);
  const passiveTotal = passive.reduce((s, c) => s + state[c.key], 0);

  // Sync passive income to store without causing an infinite render loop
  const prevPassiveRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevPassiveRef.current !== passiveTotal) {
      prevPassiveRef.current = passiveTotal;
      onPassiveChange(passiveTotal);
    }
  }, [passiveTotal, onPassiveChange]);

  return (
    <div className="space-y-2">
      {/* Monthly / Annual toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Enter amounts as:</span>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {(['monthly', 'annually'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
                period === p ? 'bg-white shadow text-slate-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Active income block */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          Active Income — stops at retirement (age {retirementAge})
        </p>
        {active.map(cat => <IncomeRow key={cat.key} cat={cat} state={state} retirementAge={retirementAge} period={period} onChange={onChange} />)}
      </div>

      {/* Passive income block */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          Passive Income — continues in retirement
        </p>
        {passive.map(cat => <IncomeRow key={cat.key} cat={cat} state={state} retirementAge={retirementAge} period={period} onChange={onChange} />)}
        {passiveTotal > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex justify-between text-xs">
            <span className="text-green-700">Reduces retirement withdrawals by</span>
            <span className="font-bold text-green-700">
              ${passiveTotal.toLocaleString()}/mo · ${Math.round(passiveTotal * 12).toLocaleString()}/yr
            </span>
          </div>
        )}
      </div>

      {/* ── Tax, 401k, Roth IRA & take-home ─────────────── */}
      <TaxSummary grossMonthly={total} person={person} period={period} />
    </div>
  );
}

export function IncomeBreakdown() {
  const { inputs, setInputs } = useRetirementStore();
  const isCouple = inputs.householdType === 'spouse' || inputs.householdType === 'family';

  const inputsAsMap = inputs as unknown as Record<string, unknown>;
  const [primary, setPrimaryRaw] = useState<IncomeState>(() => initIncomeFromStore(inputsAsMap, PRIMARY_INCOME_KEYS, 'primary'));
  const [spouse,  setSpouseRaw]  = useState<IncomeState>(() => initIncomeFromStore(inputsAsMap, SPOUSE_INCOME_KEYS,  'spouse'));

  const setPrimary = (s: IncomeState) => {
    setPrimaryRaw(s);
    setInputs(incomeStateToStoreFields(s, PRIMARY_INCOME_KEYS) as never);
  };
  const setSpouse = (s: IncomeState) => {
    setSpouseRaw(s);
    setInputs(incomeStateToStoreFields(s, SPOUSE_INCOME_KEYS) as never);
  };
  const [activeTab, setActiveTab] = useState<'you' | 'spouse'>('you');

  const stateTaxRate = getLocation(inputs.currentLocationId).stateTaxRate;

  const primaryTotal  = sumIncome(primary);
  const spouseTotal   = sumIncome(spouse);
  const primaryTax    = estimateTax(primaryTotal, stateTaxRate, inputs.monthly401k, inputs.monthlyRothIRA, inputs.monthlyOtherInvestment);
  const spouseTax     = estimateTax(spouseTotal,  stateTaxRate, inputs.spouseMonthly401k, inputs.spouseMonthlyRothIRA, inputs.spouseMonthlyOtherInvestment);
  const combinedGross = primaryTotal + spouseTotal;
  const combinedNet   = primaryTax.netMonthly + spouseTax.netMonthly;
  const combinedContrib = primaryTax.totalInvestedMonthly + spouseTax.totalInvestedMonthly;

  if (!isCouple) {
    return (
      <IncomeForm
        state={primary} person="primary"
        onChange={s => setPrimary(s)}
        onPassiveChange={v => setInputs({ postRetirementMonthlyIncome: v })}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
        {([
          { id: 'you',    label: 'You',    icon: User,  net: primaryTax.netMonthly },
          { id: 'spouse', label: 'Spouse', icon: Users, net: spouseTax.netMonthly  },
        ] as const).map(({ id, label, icon: Icon, net }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <span className="flex items-center gap-1.5">
              <Icon size={12} /> {label}
            </span>
            <span className={`text-xs ${activeTab === id ? 'text-blue-600' : 'text-slate-400'}`}>
              ${net.toLocaleString()}/mo net
            </span>
          </button>
        ))}
      </div>

      {/* Active person's form */}
      {activeTab === 'you' ? (
        <IncomeForm
          state={primary} person="primary"
          onChange={s => setPrimary(s)}
          onPassiveChange={v => setInputs({ postRetirementMonthlyIncome: v })}
        />
      ) : (
        <IncomeForm
          state={spouse} person="spouse"
          onChange={s => setSpouse(s)}
          onPassiveChange={() => {}}
        />
      )}

      {/* Combined household summary */}
      <div className="bg-slate-50 rounded-xl px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Combined Household</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <span className="text-slate-400">Gross income</span>
          <span className="text-slate-500 text-right">${combinedGross.toLocaleString()}/mo</span>

          <span className="text-slate-400">Est. taxes (fed + state + FICA)</span>
          <span className="text-red-500 text-right">−${(combinedGross - combinedNet).toLocaleString()}/mo</span>

          <span className="font-semibold text-slate-700">Net take-home</span>
          <span className="font-bold text-slate-800 text-right">${combinedNet.toLocaleString()}/mo</span>

          <span className="text-slate-400">Total invested</span>
          <span className="font-semibold text-blue-700 text-right">${combinedContrib.toLocaleString()}/mo</span>

          <span className="text-slate-400">Disposable</span>
          <span className="font-semibold text-slate-700 text-right">${Math.max(0, combinedNet - combinedContrib).toLocaleString()}/mo</span>
        </div>

        {combinedNet > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-200">
            <SavingsRateBadge income={combinedNet} contribution={combinedContrib} />
            <span className="text-xs text-slate-400">of net income</span>
          </div>
        )}
      </div>
    </div>
  );
}
