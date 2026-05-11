'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';
import { HouseholdType } from '@/lib/retirement/types';

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="font-semibold text-slate-700 text-sm">{title}</span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function SliderField({
  label, value, min, max, step = 1, unit = '', onChange, format,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  const display = format ? format(value) : `${value}${unit}`;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{format ? format(min) : `${min}${unit}`}</span>
        <span>{format ? format(max) : `${max}${unit}`}</span>
      </div>
    </div>
  );
}

function CurrencyField({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
        <input
          type="number" value={value} min={0} step={1000}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const fmtUSD = (v: number) => `$${v.toLocaleString()}`;
const fmtPct = (v: number) => `${v}%`;

export function InputPanel() {
  const { inputs, setInputs } = useRetirementStore();

  const set = (key: keyof typeof inputs) => (v: number | string) =>
    setInputs({ [key]: v });

  const isSpouseOrFamily = inputs.householdType === 'spouse' || inputs.householdType === 'family';
  const isFamily = inputs.householdType === 'family';

  return (
    <div className="space-y-3">
      <Section title="Basic Information">
        <SliderField label="Current Age" value={inputs.currentAge} min={18} max={75} onChange={v => setInputs({ currentAge: v })} unit=" yrs" />
        <SliderField label="Retirement Age" value={inputs.retirementAge} min={Math.max(inputs.currentAge + 1, 40)} max={80} onChange={v => setInputs({ retirementAge: v })} unit=" yrs" />
        <SliderField label="Life Expectancy" value={inputs.lifeExpectancy} min={70} max={100} onChange={v => setInputs({ lifeExpectancy: v })} unit=" yrs" />
      </Section>

      <Section title="Savings & Contributions">
        <CurrencyField label="Current Savings / Portfolio" value={inputs.currentSavings} onChange={set('currentSavings')} hint="Total invested assets today" />
        <CurrencyField label="Monthly Contribution" value={inputs.monthlyContribution} onChange={set('monthlyContribution')} hint="Your monthly investment amount" />
        <CurrencyField label="Annual Living Expenses (today)" value={inputs.annualExpenses} onChange={set('annualExpenses')} hint="Used for FIRE number calculations" />
        <CurrencyField label="Expected Yearly Expense in Retirement" value={inputs.retirementAnnualExpenses} onChange={set('retirementAnnualExpenses')} hint="Actual spending you plan in retirement (today's $)" />
      </Section>

      <Section title="Returns & Inflation">
        <SliderField
          label="Expected Annual Return"
          value={Math.round(inputs.expectedReturnRate * 100)}
          min={1} max={15} step={1} unit="%"
          onChange={v => setInputs({ expectedReturnRate: v / 100 })}
        />
        <SliderField
          label="Inflation Rate"
          value={Math.round(inputs.inflationRate * 100)}
          min={1} max={10} step={1} unit="%"
          onChange={v => setInputs({ inflationRate: v / 100 })}
        />
        <div className="flex items-center gap-2 bg-green-50 rounded-lg p-3">
          <span className="text-xs text-green-700 font-medium">Real Return:</span>
          <span className="text-sm font-bold text-green-700">
            {(((1 + inputs.expectedReturnRate) / (1 + inputs.inflationRate) - 1) * 100).toFixed(2)}%
          </span>
        </div>
      </Section>

      <Section title="Household" defaultOpen={true}>
        <div className="grid grid-cols-3 gap-2">
          {(['single', 'spouse', 'family'] as HouseholdType[]).map(type => (
            <button
              key={type}
              onClick={() => setInputs({ householdType: type })}
              className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize border-2 transition-all ${
                inputs.householdType === type
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              {type === 'single' ? '👤 Single' : type === 'spouse' ? '👫 Spouse' : '👨‍👩‍👧 Family'}
            </button>
          ))}
        </div>

        {isSpouseOrFamily && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <SliderField label="Spouse Age" value={inputs.spouseAge} min={18} max={75} onChange={v => setInputs({ spouseAge: v })} unit=" yrs" />
            <CurrencyField label="Spouse Monthly Contribution" value={inputs.spouseMonthlyContribution} onChange={set('spouseMonthlyContribution')} />
            <SliderField
              label="Survivor Benefit Rate"
              value={Math.round(inputs.survivorBenefitRate * 100)}
              min={50} max={100} step={5} unit="%"
              onChange={v => setInputs({ survivorBenefitRate: v / 100 })}
            />
          </div>
        )}

        {isFamily && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <SliderField label="Number of Children" value={inputs.numChildren} min={1} max={6} onChange={v => setInputs({ numChildren: v })} />
            <CurrencyField label="Annual Child Expense / Child" value={inputs.childAnnualExpense} onChange={set('childAnnualExpense')} />
            <CurrencyField label="Education Cost / Child" value={inputs.educationCostPerChild} onChange={set('educationCostPerChild')} hint="Total college fund per child" />
          </div>
        )}
      </Section>
    </div>
  );
}
