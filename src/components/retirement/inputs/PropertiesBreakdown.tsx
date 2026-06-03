'use client';
import { useState } from 'react';
import { Building2, Plus, Trash2, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';
import { RetirementProperty } from '@/lib/retirement/types';

const DEFAULT_APPRECIATION = 0.0156; // US historical average

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function newProperty(n: number): RetirementProperty {
  return {
    id: uid(),
    label: n === 1 ? 'Primary Residence' : n === 2 ? 'Investment Property' : `Property ${n}`,
    currentValue: n === 1 ? 400000 : 250000,
    appreciationRate: DEFAULT_APPRECIATION,
    sellAtRetirement: n !== 1, // sell investment properties, keep primary by default
  };
}

function NumberInput({
  value, onChange, prefix = '$', step = 10000, min = 0,
}: {
  value: number; onChange: (v: number) => void; prefix?: string; step?: number; min?: number;
}) {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{prefix}</span>
      <input
        type="number" value={value} min={min} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function PropertyCard({
  property, index, total, onChange, onDelete,
}: {
  property: RetirementProperty;
  index: number;
  total: number;
  onChange: (p: RetirementProperty) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(index === 0);

  // Read directly from store — always in sync with the "Retire At" slider
  const retirementAge = useRetirementStore(s => s.inputs.retirementAge);
  const currentAge    = useRetirementStore(s => s.inputs.currentAge);
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);

  const appreciatedValue = property.currentValue * (1 + property.appreciationRate) ** yearsToRetirement;
  const gain = appreciatedValue - property.currentValue;
  const gainPct = property.currentValue > 0 ? (gain / property.currentValue) * 100 : 0;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50">
        <Building2 size={13} className="text-slate-400 shrink-0" />
        <input
          value={property.label}
          onChange={e => onChange({ ...property, label: e.target.value })}
          className="flex-1 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none min-w-0"
        />
        {/* Sell at retirement toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-slate-400">Sell at retirement</span>
          <button
            onClick={() => onChange({ ...property, sellAtRetirement: !property.sellAtRetirement })}
            className={`relative w-8 h-4 rounded-full transition-colors ${property.sellAtRetirement ? 'bg-blue-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${property.sellAtRetirement ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
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
          <span>${property.currentValue.toLocaleString()} · {(property.appreciationRate * 100).toFixed(2)}%/yr</span>
          <span className="text-green-600 font-medium">→ ${Math.round(appreciatedValue).toLocaleString()} at retirement</span>
        </div>
      )}

      {/* Expanded */}
      {open && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-xs text-slate-500">Current Value</label>
              <NumberInput value={property.currentValue} onChange={v => onChange({ ...property, currentValue: v })} />
            </div>
            <div className="space-y-0.5">
              <label className="text-xs text-slate-500">Annual Appreciation</label>
              <NumberInput
                value={Number((property.appreciationRate * 100).toFixed(2))}
                onChange={v => onChange({ ...property, appreciationRate: v / 100 })}
                prefix="%" step={0.1} min={0}
              />
            </div>
          </div>

          {/* Projection card */}
          <div className={`rounded-xl p-3 space-y-2 ${property.sellAtRetirement ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} className={property.sellAtRetirement ? 'text-green-600' : 'text-slate-400'} />
              <span className={`text-xs font-semibold ${property.sellAtRetirement ? 'text-green-700' : 'text-slate-600'}`}>
                Value at retirement (in {yearsToRetirement} yrs)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-slate-500">Today</p>
                <p className="font-bold text-slate-700">${property.currentValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500">Appreciated</p>
                <p className="font-bold text-slate-700">${Math.round(appreciatedValue).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500">Gain</p>
                <p className="font-bold text-green-600">+${Math.round(gain).toLocaleString()} ({gainPct.toFixed(0)}%)</p>
              </div>
            </div>
            {property.sellAtRetirement
              ? <p className="text-xs text-green-600">✓ Proceeds added to your portfolio at retirement</p>
              : <p className="text-xs text-slate-500">Not sold — value tracked as net worth but not included in investable assets</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function PropertiesBreakdown() {
  const { inputs, setInputs } = useRetirementStore();
  const properties = inputs.properties ?? [];
  const retirementAge     = inputs.retirementAge;
  const currentAge        = inputs.currentAge;
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);

  const update = (id: string, p: RetirementProperty) =>
    setInputs({ properties: properties.map(x => x.id === id ? p : x) });
  const remove = (id: string) =>
    setInputs({ properties: properties.filter(x => x.id !== id) });
  const add = () =>
    setInputs({ properties: [...properties, newProperty(properties.length + 1)] });

  const totalCurrentValue    = properties.reduce((s, p) => s + p.currentValue, 0);
  const totalAppreciatedValue = properties.reduce((s, p) =>
    s + p.currentValue * (1 + p.appreciationRate) ** yearsToRetirement, 0);
  const totalProceedsAtRetirement = properties
    .filter(p => p.sellAtRetirement)
    .reduce((s, p) => s + p.currentValue * (1 + p.appreciationRate) ** yearsToRetirement, 0);

  return (
    <div className="space-y-3">
      {properties.map((p, i) => (
        <PropertyCard
          key={p.id}
          property={p}
          index={i}
          total={properties.length}
          onChange={updated => update(p.id, updated)}
          onDelete={() => remove(p.id)}
        />
      ))}

      {/* Add property button */}
      <button
        onClick={add}
        className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
      >
        <Plus size={13} /> Add Property
      </button>

      {/* Combined summary */}
      {properties.length > 0 && (
        <div className="bg-slate-50 rounded-xl px-3 py-3 space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Summary</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-slate-500">Total current value</span>
            <span className="font-bold text-slate-700 text-right">${totalCurrentValue.toLocaleString()}</span>
            <span className="text-slate-500">Total at retirement</span>
            <span className="font-bold text-slate-700 text-right">${Math.round(totalAppreciatedValue).toLocaleString()}</span>
            <span className="text-slate-500">Added to portfolio</span>
            <span className="font-bold text-green-600 text-right">${Math.round(totalProceedsAtRetirement).toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-400">
            Default appreciation rate: {(DEFAULT_APPRECIATION * 100).toFixed(2)}%/yr (US historical avg)
          </p>
        </div>
      )}
    </div>
  );
}
