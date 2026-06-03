'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, User, Users, CheckCircle2 } from 'lucide-react';
import { useRef } from 'react';
import { SavingsBreakdown } from './SavingsBreakdown';
import { ExpensesBreakdown } from './ExpensesBreakdown';
import { IncomeBreakdown } from './IncomeBreakdown';
import { LocationSelector } from './LocationSelector';
import { PropertiesBreakdown } from './PropertiesBreakdown';
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
  label, value, min, max, step = 1, unit = '', onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function PctSlider({ label, value, min = 1, max, onChange }: { label: string; value: number; min?: number; max: number; onChange: (v: number) => void }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{pct}%</span>
      </div>
      <input
        type="range" min={min} max={max} step={1} value={pct}
        onChange={e => onChange(Number(e.target.value) / 100)}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{min}%</span><span>{max}%</span>
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

/** Side-by-side card used in spouse/family mode */
function PersonCard({
  label, color, icon: Icon, children,
}: { label: string; color: string; icon: typeof User; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50/40',
    rose: 'border-rose-200 bg-rose-50/40',
  };
  const labelColors: Record<string, string> = {
    blue: 'text-blue-700 bg-blue-100',
    rose: 'text-rose-700 bg-rose-100',
  };
  return (
    <div className={`border rounded-xl p-3 space-y-3 ${colors[color]}`}>
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${labelColors[color]}`}>
        <Icon size={12} /> {label}
      </div>
      {children}
    </div>
  );
}

export function InputPanel() {
  const { inputs, setInputs } = useRetirementStore();
  // Remember chosen retirement ages before toggling "Already Retired"
  const savedRetirementAge       = useRef(inputs.retirementAge);
  const savedSpouseRetirementAge = useRef(inputs.spouseRetirementAge);

  const set = (key: keyof typeof inputs) => (v: number) => setInputs({ [key]: v });
  const isCouple = inputs.householdType === 'spouse' || inputs.householdType === 'family';
  const isFamily = inputs.householdType === 'family';

  function toggleAlreadyRetired() {
    if (!inputs.alreadyRetired) {
      savedRetirementAge.current = inputs.retirementAge;
      setInputs({ alreadyRetired: true, retirementAge: inputs.currentAge });
    } else {
      setInputs({ alreadyRetired: false, retirementAge: savedRetirementAge.current });
    }
  }

  function toggleSpouseAlreadyRetired() {
    if (!inputs.spouseAlreadyRetired) {
      savedSpouseRetirementAge.current = inputs.spouseRetirementAge;
      setInputs({ spouseAlreadyRetired: true, spouseRetirementAge: inputs.spouseAge });
    } else {
      setInputs({ spouseAlreadyRetired: false, spouseRetirementAge: savedSpouseRetirementAge.current });
    }
  }

  return (
    <div className="space-y-3">

      {/* Household type selector */}
      <Section title="Household Type">
        <div className="grid grid-cols-3 gap-2">
          {(['single', 'spouse', 'family'] as HouseholdType[]).map(type => (
            <button
              key={type}
              onClick={() => setInputs({ householdType: type })}
              className={`py-2 px-2 rounded-lg text-xs font-semibold capitalize border-2 transition-all ${
                inputs.householdType === type
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              {type === 'single' ? '👤 Single' : type === 'spouse' ? '👫 Spouse' : '👨‍👩‍👧 Family'}
            </button>
          ))}
        </div>
      </Section>

      {/* Basic info — side-by-side for couple modes */}
      <Section title={isCouple ? 'Ages & Retirement' : 'Basic Information'}>

        {/* Already Retired toggle */}
        <button
          onClick={toggleAlreadyRetired}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all ${
            inputs.alreadyRetired
              ? 'border-green-500 bg-green-50'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <div className="flex items-center gap-2 text-left">
            <CheckCircle2
              size={16}
              className={inputs.alreadyRetired ? 'text-green-600' : 'text-slate-300'}
            />
            <div>
              <p className={`text-xs font-bold ${inputs.alreadyRetired ? 'text-green-700' : 'text-slate-600'}`}>
                Already Retired
              </p>
              <p className={`text-xs ${inputs.alreadyRetired ? 'text-green-600' : 'text-slate-400'}`}>
                {inputs.alreadyRetired
                  ? `Calculations start in withdrawal mode from age ${inputs.currentAge}`
                  : 'Toggle on if you are already retired'}
              </p>
            </div>
          </div>
          <div className={`relative w-10 h-5 rounded-full transition-colors ${inputs.alreadyRetired ? 'bg-green-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${inputs.alreadyRetired ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </button>

        {isCouple ? (
          <div className="grid grid-cols-2 gap-3">
            <PersonCard label="You" color="blue" icon={User}>
              <SliderField label="Your Age" value={inputs.currentAge} min={18} max={75} onChange={v => {
                const updates: Partial<typeof inputs> = { currentAge: v };
                if (inputs.alreadyRetired) updates.retirementAge = v;
                setInputs(updates);
              }} unit=" yrs" />
              {!inputs.alreadyRetired && (
                <SliderField label="Retire At" value={inputs.retirementAge} min={Math.max(inputs.currentAge + 1, 40)} max={80} onChange={set('retirementAge')} unit=" yrs" />
              )}
              {/* Already Retired toggle — You */}
              <button
                onClick={toggleAlreadyRetired}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg border transition-all text-xs ${
                  inputs.alreadyRetired ? 'border-green-400 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className={inputs.alreadyRetired ? 'text-green-600' : 'text-slate-300'} />
                  {inputs.alreadyRetired ? `Retired (age ${inputs.currentAge})` : 'Already retired?'}
                </span>
                <div className={`relative w-8 h-4 rounded-full transition-colors ${inputs.alreadyRetired ? 'bg-green-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${inputs.alreadyRetired ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>
            </PersonCard>

            <PersonCard label="Spouse" color="rose" icon={Users}>
              <SliderField label="Age" value={inputs.spouseAge} min={18} max={75} onChange={v => {
                const updates: Partial<typeof inputs> = { spouseAge: v };
                if (inputs.spouseAlreadyRetired) updates.spouseRetirementAge = v;
                setInputs(updates);
              }} unit=" yrs" />
              {!inputs.spouseAlreadyRetired && (
                <SliderField label="Retire At" value={inputs.spouseRetirementAge} min={Math.max(inputs.spouseAge + 1, 40)} max={80} onChange={set('spouseRetirementAge')} unit=" yrs" />
              )}
              {/* Already Retired toggle — Spouse */}
              <button
                onClick={toggleSpouseAlreadyRetired}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg border transition-all text-xs ${
                  inputs.spouseAlreadyRetired ? 'border-green-400 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500 hover:border-rose-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className={inputs.spouseAlreadyRetired ? 'text-green-600' : 'text-slate-300'} />
                  {inputs.spouseAlreadyRetired ? `Retired (age ${inputs.spouseAge})` : 'Already retired?'}
                </span>
                <div className={`relative w-8 h-4 rounded-full transition-colors ${inputs.spouseAlreadyRetired ? 'bg-green-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${inputs.spouseAlreadyRetired ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>
            </PersonCard>
          </div>
        ) : (
          <>
            <SliderField label="Current Age" value={inputs.currentAge} min={18} max={75} onChange={v => {
              const updates: Partial<typeof inputs> = { currentAge: v };
              if (inputs.alreadyRetired) updates.retirementAge = v;
              setInputs(updates);
            }} unit=" yrs" />
            {!inputs.alreadyRetired && (
              <SliderField label="Retirement Age" value={inputs.retirementAge} min={Math.max(inputs.currentAge + 1, 40)} max={80} onChange={set('retirementAge')} unit=" yrs" />
            )}
          </>
        )}
        <SliderField label="Life Expectancy" value={inputs.lifeExpectancy} min={70} max={100} onChange={set('lifeExpectancy')} unit=" yrs" />
      </Section>

      {/* Savings breakdown — Cash / Investments / Other Assets */}
      <Section title="Savings & Contributions">
        <SavingsBreakdown />

        {/* Income & monthly investment */}
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Income & Monthly Investment</p>
          <IncomeBreakdown />
        </div>
      </Section>

      {/* Properties */}
      <Section title="Properties & Real Estate" defaultOpen={false}>
        <PropertiesBreakdown />
      </Section>

      {/* Expenses breakdown — by category with monthly/annual toggle */}
      <Section title="Expenses">
        <ExpensesBreakdown />
      </Section>

      {/* Place of retirement */}
      <Section title="Place of Retirement">
        <LocationSelector />
      </Section>

      {/* Returns & Inflation (shared) */}
      <Section title="Returns & Inflation">
        <PctSlider label="Expected Annual Return" value={inputs.expectedReturnRate} max={15} onChange={set('expectedReturnRate')} />
        <PctSlider label="Inflation Rate" value={inputs.inflationRate} max={10} onChange={set('inflationRate')} />
        <div className="flex items-center gap-2 bg-green-50 rounded-lg p-3">
          <span className="text-xs text-green-700 font-medium">Real Return:</span>
          <span className="text-sm font-bold text-green-700">
            {(((1 + inputs.expectedReturnRate) / (1 + inputs.inflationRate) - 1) * 100).toFixed(2)}%
          </span>
        </div>
      </Section>

      {/* Survivor benefit (couples only) */}
      {isCouple && (
        <Section title="Survivor Benefit" defaultOpen={false}>
          <PctSlider
            label="Survivor Benefit Rate"
            value={inputs.survivorBenefitRate}
            min={50} max={100}
            onChange={set('survivorBenefitRate')}
          />
          <p className="text-xs text-slate-400">Fraction of expenses covered after one partner passes</p>
        </Section>
      )}

      {/* Family extras */}
      {isFamily && (
        <Section title="Children & Education" defaultOpen={true}>
          <SliderField label="Number of Children" value={inputs.numChildren} min={1} max={6} onChange={set('numChildren')} />
          <CurrencyField label="Annual Child Expense / Child" value={inputs.childAnnualExpense} onChange={set('childAnnualExpense')} />
          <CurrencyField label="Education Cost / Child" value={inputs.educationCostPerChild} onChange={set('educationCostPerChild')} hint="Total college fund per child" />
        </Section>
      )}
    </div>
  );
}
