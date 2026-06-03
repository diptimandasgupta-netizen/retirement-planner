'use client';
import { useState, useCallback } from 'react';
import { Home, ShoppingCart, Car, HeartPulse, Clapperboard, Shield, Zap, Package, ChevronDown, ChevronUp, Landmark, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';
import type { RetirementMortgage } from '@/lib/retirement/types';

type Period = 'monthly' | 'annually';

interface ExpenseCategory {
  key: string;
  label: string;
  icon: typeof Home;
  color: string;
  defaultPre: number;
  defaultPost: number;
}

const CATEGORIES: ExpenseCategory[] = [
  { key: 'housing',       label: 'Housing',        icon: Home,          color: 'bg-blue-500',    defaultPre: 2000, defaultPost: 1500 },
  { key: 'food',          label: 'Food',            icon: ShoppingCart,  color: 'bg-emerald-500', defaultPre: 800,  defaultPost: 700  },
  { key: 'transport',     label: 'Transport',       icon: Car,           color: 'bg-amber-500',   defaultPre: 500,  defaultPost: 350  },
  { key: 'healthcare',    label: 'Healthcare',      icon: HeartPulse,    color: 'bg-red-500',     defaultPre: 400,  defaultPost: 700  },
  { key: 'entertainment', label: 'Entertainment',   icon: Clapperboard,  color: 'bg-purple-500',  defaultPre: 300,  defaultPost: 350  },
  { key: 'insurance',     label: 'Insurance',       icon: Shield,        color: 'bg-indigo-500',  defaultPre: 350,  defaultPost: 200  },
  { key: 'utilities',     label: 'Utilities',       icon: Zap,           color: 'bg-yellow-500',  defaultPre: 200,  defaultPost: 150  },
  { key: 'other',         label: 'Other',           icon: Package,       color: 'bg-slate-400',   defaultPre: 450,  defaultPost: 50   },
];

type ExpenseState = Record<string, number>;
const initPre  = (): ExpenseState => Object.fromEntries(CATEGORIES.map(c => [c.key, c.defaultPre]));
const initPost = (): ExpenseState => Object.fromEntries(CATEGORIES.map(c => [c.key, c.defaultPost]));
const sumMonthly = (s: ExpenseState) => Object.values(s).reduce((a, b) => a + b, 0);

// ── Mortgage ─────────────────────────────────────────────────────────────────

// Use the shared RetirementMortgage type (alias for readability)
type Mortgage = RetirementMortgage;

const newMortgage = (n: number): Mortgage => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  label: n === 1 ? 'Primary Residence' : n === 2 ? 'Second Home' : `Property ${n}`,
  monthlyPayment: 1800,
  remainingBalance: 280000,
  interestRate: 6.5,
  yearsRemaining: 22,
});

function MortgageInput({ label, value, onChange, prefix = '$', step = 1000 }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; step?: number;
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-xs text-slate-500">{label}</label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{prefix}</span>
        <input
          type="number" value={value} min={0} step={step}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

function MortgageCard({
  mortgage, index, total, currentAge, retirementAge,
  onChange, onDelete,
}: {
  mortgage: Mortgage; index: number; total: number;
  currentAge: number; retirementAge: number;
  onChange: (m: Mortgage) => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(index === 0);

  const payoffAge = currentAge + mortgage.yearsRemaining;
  const paidBeforeRetirement = payoffAge <= retirementAge;
  const monthlyRate = mortgage.interestRate / 100 / 12;
  const totalRemaining = monthlyRate > 0
    ? mortgage.monthlyPayment * mortgage.yearsRemaining * 12
    : mortgage.remainingBalance;
  const totalInterest = Math.max(0, totalRemaining - mortgage.remainingBalance);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50">
        <Landmark size={13} className="text-slate-400 shrink-0" />
        {/* Editable label */}
        <input
          value={mortgage.label}
          onChange={e => onChange({ ...mortgage, label: e.target.value })}
          className="flex-1 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none min-w-0 truncate"
        />
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
          paidBeforeRetirement ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {paidBeforeRetirement ? `Off at ${payoffAge}` : `Active @ retire`}
        </span>
        <button onClick={() => setOpen(o => !o)} className="text-slate-400 hover:text-slate-600 shrink-0">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {total > 1 && (
          <button onClick={onDelete} className="text-red-400 hover:text-red-600 shrink-0">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Collapsed summary */}
      {!open && (
        <div className="px-3 py-1.5 flex justify-between text-xs text-slate-500 bg-white">
          <span>${mortgage.monthlyPayment.toLocaleString()}/mo · {mortgage.yearsRemaining} yrs left · {mortgage.interestRate}%</span>
          <span className="text-slate-400">${Math.round(mortgage.remainingBalance / 1000)}K balance</span>
        </div>
      )}

      {/* Expanded details */}
      {open && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MortgageInput label="Monthly Payment" value={mortgage.monthlyPayment} step={50}
              onChange={v => onChange({ ...mortgage, monthlyPayment: v })} />
            <MortgageInput label="Remaining Balance" value={mortgage.remainingBalance}
              onChange={v => onChange({ ...mortgage, remainingBalance: v })} />
            <MortgageInput label="Interest Rate" value={mortgage.interestRate} prefix="%" step={0.1}
              onChange={v => onChange({ ...mortgage, interestRate: v })} />
            <MortgageInput label="Years Remaining" value={mortgage.yearsRemaining} prefix="⏱" step={1}
              onChange={v => onChange({ ...mortgage, yearsRemaining: v })} />
          </div>

          {/* Status */}
          <div className={`rounded-xl p-3 space-y-1.5 ${paidBeforeRetirement ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className="flex items-center gap-1.5">
              {paidBeforeRetirement
                ? <CheckCircle2 size={13} className="text-green-600" />
                : <AlertCircle size={13} className="text-amber-600" />}
              <span className={`text-xs font-semibold ${paidBeforeRetirement ? 'text-green-700' : 'text-amber-700'}`}>
                {paidBeforeRetirement
                  ? `Paid off ${retirementAge - payoffAge} yr${retirementAge - payoffAge !== 1 ? 's' : ''} before retirement`
                  : `Still active ${payoffAge - retirementAge} yr${payoffAge - retirementAge !== 1 ? 's' : ''} into retirement`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><p className="text-slate-500">Payoff age</p><p className="font-bold text-slate-700">{payoffAge}</p></div>
              <div><p className="text-slate-500">Est. interest</p><p className="font-bold text-slate-700">${Math.round(totalInterest / 1000)}K</p></div>
              <div><p className="text-slate-500">Total cost</p><p className="font-bold text-slate-700">${Math.round(totalRemaining / 1000)}K</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MortgagesSection({
  mortgages, onChange, currentAge, retirementAge,
}: {
  mortgages: Mortgage[];
  onChange: (list: Mortgage[]) => void;
  currentAge: number;
  retirementAge: number;
}) {
  const [sectionOpen, setSectionOpen] = useState(true);

  const totalMonthly = mortgages.reduce((s, m) => s + m.monthlyPayment, 0);
  const totalBalance = mortgages.reduce((s, m) => s + m.remainingBalance, 0);
  const allPaidOff   = mortgages.every(m => currentAge + m.yearsRemaining <= retirementAge);

  const update = (id: string, m: Mortgage) => onChange(mortgages.map(x => x.id === id ? m : x));
  const remove = (id: string) => onChange(mortgages.filter(x => x.id !== id));
  const add    = () => onChange([...mortgages, newMortgage(mortgages.length + 1)]);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50">
        <div className="flex items-center gap-2">
          <Landmark size={14} className="text-blue-500" />
          <span className="text-xs font-semibold text-slate-700">Mortgages</span>
          {mortgages.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
              {mortgages.length} {mortgages.length === 1 ? 'property' : 'properties'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mortgages.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${allPaidOff ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              ${totalMonthly.toLocaleString()}/mo
            </span>
          )}
          <button onClick={() => setSectionOpen(o => !o)} className="text-slate-400 hover:text-slate-600">
            {sectionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {sectionOpen && (
        <div className="p-3 space-y-3">
          {/* Individual mortgage cards */}
          {mortgages.map((m, i) => (
            <MortgageCard
              key={m.id}
              mortgage={m}
              index={i}
              total={mortgages.length}
              currentAge={currentAge}
              retirementAge={retirementAge}
              onChange={updated => update(m.id, updated)}
              onDelete={() => remove(m.id)}
            />
          ))}

          {/* Add mortgage button */}
          <button
            onClick={add}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Plus size={13} /> Add Mortgage
          </button>

          {/* Combined summary (only when >1 mortgage) */}
          {mortgages.length > 1 && (
            <div className="bg-slate-50 rounded-xl px-3 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Combined</p>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total monthly</span>
                <span className="font-bold text-slate-700">${totalMonthly.toLocaleString()}/mo</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total balance</span>
                <span className="font-bold text-slate-700">${totalBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Status at retirement</span>
                <span className={`font-bold ${allPaidOff ? 'text-green-600' : 'text-amber-600'}`}>
                  {allPaidOff ? '✓ All paid off' : `${mortgages.filter(m => currentAge + m.yearsRemaining > retirementAge).length} still active`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chart bar ────────────────────────────────────────────────────────────────

function BreakdownBar({ state }: { state: ExpenseState }) {
  const t = sumMonthly(state) || 1;
  return (
    <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
      {CATEGORIES.map(c => (
        <div key={c.key} className={`${c.color} transition-all`}
          style={{ width: `${(state[c.key] / t) * 100}%` }}
          title={`${c.label}: ${Math.round((state[c.key] / t) * 100)}%`} />
      ))}
    </div>
  );
}

// ── Expense row ───────────────────────────────────────────────────────────────

function ExpenseRow({ cat, value, onChange, period }: {
  cat: ExpenseCategory; value: number; onChange: (v: number) => void; period: Period;
}) {
  const displayVal = period === 'annually' ? Math.round(value * 12) : Math.round(value);
  const Icon = cat.icon;
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full shrink-0 ${cat.color}`} />
      <Icon size={12} className="text-slate-400 shrink-0" />
      <span className="text-xs text-slate-600 w-24 shrink-0">{cat.label}</span>
      <div className="flex-1 relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
        <input
          type="number" value={displayVal} min={0}
          step={period === 'monthly' ? 50 : 500}
          onChange={e => {
            const v = Number(e.target.value);
            onChange(period === 'annually' ? v / 12 : v);
          }}
          className="w-full pl-5 pr-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────

function Tab({ title, badge, active, onClick, color }: {
  title: string; badge: string; active: boolean; onClick: () => void; color: string;
}) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all border ${active ? `${color} shadow-sm` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
      {title} <span className="opacity-70">{badge}</span>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

// Maps category key → store field name for each phase
const PRE_STORE_KEYS:  Record<string, keyof import('@/lib/retirement/types').RetirementInputs> = {
  housing: 'expenseHousing', food: 'expenseFood', transport: 'expenseTransport',
  healthcare: 'expenseHealthcare', entertainment: 'expenseEntertainment',
  insurance: 'expenseInsurance', utilities: 'expenseUtilities', other: 'expenseOther',
};
const POST_STORE_KEYS: Record<string, keyof import('@/lib/retirement/types').RetirementInputs> = {
  housing: 'retExpenseHousing', food: 'retExpenseFood', transport: 'retExpenseTransport',
  healthcare: 'retExpenseHealthcare', entertainment: 'retExpenseEntertainment',
  insurance: 'retExpenseInsurance', utilities: 'retExpenseUtilities', other: 'retExpenseOther',
};

function stateFromStore(inputs: Record<string, unknown>, keyMap: Record<string, string>, fallback: () => ExpenseState): ExpenseState {
  const hasData = Object.values(keyMap).some(k => ((inputs[k] as number) ?? 0) > 0);
  if (!hasData) return fallback();
  return Object.fromEntries(CATEGORIES.map(c => [c.key, (inputs[keyMap[c.key]] as number) ?? 0]));
}

export function ExpensesBreakdown() {
  const { inputs, setInputs } = useRetirementStore();
  const [period, setPeriod] = useState<Period>('monthly');
  const [activeTab, setActiveTab] = useState<'pre' | 'post'>('pre');
  // Initialise from store so CSV import populates mortgages correctly
  const [mortgages, setMortgagesRaw] = useState<Mortgage[]>(() => inputs.mortgages ?? []);

  const inputsMap = inputs as unknown as Record<string, unknown>;

  const [pre, setPre]   = useState<ExpenseState>(() => stateFromStore(inputsMap, PRE_STORE_KEYS,  initPre));
  const [post, setPost] = useState<ExpenseState>(() => stateFromStore(inputsMap, POST_STORE_KEYS, initPost));

  const syncStore = useCallback((nextPre: ExpenseState, nextPost: ExpenseState) => {
    const preFields  = Object.fromEntries(CATEGORIES.map(c => [PRE_STORE_KEYS[c.key],  nextPre[c.key]]));
    const postFields = Object.fromEntries(CATEGORIES.map(c => [POST_STORE_KEYS[c.key], nextPost[c.key]]));
    setInputs({
      annualExpenses:           Math.round(sumMonthly(nextPre)  * 12),
      retirementAnnualExpenses: Math.round(sumMonthly(nextPost) * 12),
      ...preFields,
      ...postFields,
    } as never);
  }, [setInputs]);

  const updatePre  = (key: string, monthly: number) => { const n = { ...pre,  [key]: monthly }; setPre(n);  syncStore(n, post); };
  const updatePost = (key: string, monthly: number) => { const n = { ...post, [key]: monthly }; setPost(n); syncStore(pre, n);  };

  // When mortgages change, recalculate housing rows and sync to store
  const handleMortgagesChange = (list: Mortgage[]) => {
    setMortgagesRaw(list);
    const totalMonthlyPayment = list.reduce((s, m) => s + m.monthlyPayment, 0);
    const activeInRetirement  = list.filter(m => inputs.currentAge + m.yearsRemaining > inputs.retirementAge);
    const retirementPayment   = activeInRetirement.reduce((s, m) => s + m.monthlyPayment, 0);

    const nextPre  = { ...pre,  housing: totalMonthlyPayment > 0 ? totalMonthlyPayment : pre.housing };
    const nextPost = { ...post, housing: retirementPayment > 0
      ? retirementPayment + 300   // active mortgages + taxes/maintenance
      : Math.max(300, post.housing - totalMonthlyPayment + retirementPayment) };

    setPre(nextPre);
    setPost(nextPost);
    // Persist mortgages to the store (enables CSV export + import roundtrip)
    setInputs({ mortgages: list } as never);
    syncStore(nextPre, nextPost);
  };

  const preTotal  = sumMonthly(pre);
  const postTotal = sumMonthly(post);
  const displayTotal = activeTab === 'pre' ? preTotal : postTotal;
  const state   = activeTab === 'pre' ? pre : post;
  const updater = activeTab === 'pre' ? updatePre : updatePost;

  const fmt = (monthly: number) =>
    period === 'monthly'
      ? `$${Math.round(monthly).toLocaleString()}/mo`
      : `$${Math.round(monthly * 12).toLocaleString()}/yr`;

  return (
    <div className="space-y-3">
      {/* Mortgages section */}
      <MortgagesSection
        mortgages={mortgages}
        onChange={handleMortgagesChange}
        currentAge={inputs.currentAge}
        retirementAge={inputs.retirementAge}
      />

      {/* Phase tabs */}
      <div className="flex gap-2">
        <Tab title="Pre-Retirement" badge={fmt(preTotal)} active={activeTab === 'pre'} onClick={() => setActiveTab('pre')} color="border-blue-300 bg-blue-50 text-blue-700" />
        <Tab title="In Retirement"  badge={fmt(postTotal)} active={activeTab === 'post'} onClick={() => setActiveTab('post')} color="border-rose-300 bg-rose-50 text-rose-700" />
      </div>

      {/* Monthly / Annual toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Enter amounts as:</span>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {(['monthly', 'annually'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize ${period === p ? 'bg-white shadow text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Category rows */}
      <div className="space-y-2">
        {CATEGORIES.map(cat => (
          <ExpenseRow key={cat.key} cat={cat} value={state[cat.key]}
            onChange={v => updater(cat.key, v)} period={period} />
        ))}
      </div>

      {/* Bar + totals */}
      <div className="space-y-2 pt-1 border-t border-slate-100">
        <BreakdownBar state={state} />
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-semibold text-slate-500">
            {activeTab === 'pre' ? 'Pre-Retirement Total' : 'Retirement Total'}
          </span>
          <div className="text-right">
            <span className="text-base font-bold text-slate-800">
              ${Math.round(displayTotal).toLocaleString()}
              <span className="text-xs font-normal text-slate-400">/mo</span>
            </span>
            <span className="ml-2 text-xs text-slate-400">(${Math.round(displayTotal * 12).toLocaleString()}/yr)</span>
          </div>
        </div>

        {activeTab === 'post' && (
          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 flex justify-between">
            <span>vs. Pre-Retirement</span>
            <span className={postTotal < preTotal ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
              {postTotal < preTotal ? '▼' : '▲'} ${Math.abs(Math.round((postTotal - preTotal) * 12)).toLocaleString()}/yr
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
