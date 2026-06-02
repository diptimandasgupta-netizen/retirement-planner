'use client';
import { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X, CheckCircle2, AlertCircle, Info, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useRetirementStore } from '@/store/retirementStore';
import {
  LOCATIONS, getLocation, relativeLocationFactor,
  locationAdjustmentFactor, FEDERAL_EFFECTIVE_TAX_RATE,
} from '@/lib/retirement/data/locations';

const GROUPS = [
  { key: 'US',            flag: '🇺🇸', label: 'United States'  },
  { key: 'India',         flag: '🇮🇳', label: 'India'          },
  { key: 'Caribbean',     flag: '🏖️', label: 'Caribbean'       },
  { key: 'Europe',        flag: '🌍', label: 'Europe'           },
  { key: 'Asia',          flag: '🌏', label: 'Asia'             },
  { key: 'Latin America', flag: '🌎', label: 'Latin America'    },
] as const;

function groupedFilter(query: string) {
  const q = query.toLowerCase();
  return GROUPS.map(g => ({
    ...g,
    list: LOCATIONS.filter(l =>
      (g.key === 'US' ? l.country === 'US' : l.region === g.key) &&
      (!q || l.name.toLowerCase().includes(q) || l.region.toLowerCase().includes(q) || l.notes.toLowerCase().includes(q))
    ),
  })).filter(g => g.list.length > 0);
}

function ColBadge({ colIndex }: { colIndex: number }) {
  const cls =
    colIndex < 80  ? 'text-green-600 bg-green-50' :
    colIndex < 95  ? 'text-emerald-600 bg-emerald-50' :
    colIndex < 110 ? 'text-slate-500 bg-slate-100' :
    colIndex < 130 ? 'text-amber-600 bg-amber-50' :
                     'text-red-600 bg-red-50';
  return <span className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 ${cls}`}>{colIndex}</span>;
}

function LocationRow({ loc, selected, onSelect }: {
  loc: typeof LOCATIONS[0]; selected: boolean; onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(loc.id)}
      className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 transition-colors text-left ${selected ? 'bg-blue-50' : ''}`}
    >
      <MapPin size={12} className={selected ? 'text-blue-500' : 'text-slate-300'} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${selected ? 'text-blue-700' : 'text-slate-700'}`}>{loc.name}</p>
        <p className="text-xs text-slate-400 truncate">
          {loc.stateTaxRate === 0 ? 'No income tax' : `${Math.round(loc.stateTaxRate * 100)}% state tax`}
          {loc.taxesSocialSecurity ? ' · taxes SS' : ''}
        </p>
      </div>
      <ColBadge colIndex={loc.colIndex} />
    </button>
  );
}

function LocationPicker({
  label, selectedId, onSelect, accent,
}: {
  label: string; selectedId: string; onSelect: (id: string) => void; accent: 'blue' | 'emerald';
}) {
  const selected = getLocation(selectedId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const groups = groupedFilter(query);
  const accentRing = accent === 'blue' ? 'hover:border-blue-400 focus-within:border-blue-400' : 'hover:border-emerald-400 focus-within:border-emerald-400';
  const iconColor  = accent === 'blue' ? 'text-blue-500' : 'text-emerald-500';

  return (
    <div className="relative" ref={ref}>
      <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-xl bg-white transition-colors text-left ${accentRing}`}
      >
        <MapPin size={13} className={`${iconColor} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">{selected.name}</p>
          <p className="text-xs text-slate-400 truncate">{selected.region}</p>
        </div>
        <ColBadge colIndex={selected.colIndex} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 border border-slate-200 rounded-xl bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 text-xs outline-none placeholder:text-slate-400 text-slate-800"
            />
            {query && <button onClick={() => setQuery('')}><X size={13} className="text-slate-400" /></button>}
          </div>
          <div className="overflow-y-auto max-h-56">
            {groups.map(g => (
              <div key={g.key}>
                <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wide bg-slate-50 sticky top-0">
                  {g.flag} {g.label} <span className="font-normal normal-case text-slate-300">({g.list.length})</span>
                </div>
                {g.list.map(loc => (
                  <LocationRow key={loc.id} loc={loc} selected={loc.id === selectedId}
                    onSelect={id => { onSelect(id); setOpen(false); setQuery(''); }} />
                ))}
              </div>
            ))}
            {groups.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No results for &ldquo;{query}&rdquo;</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function LocationSelector() {
  const { inputs, setInputs } = useRetirementStore();

  const current    = getLocation(inputs.currentLocationId);
  const retirement = getLocation(inputs.retirementLocationId);
  const factor     = relativeLocationFactor(current, retirement);
  const same       = inputs.currentLocationId === inputs.retirementLocationId;

  const retirementEffTax = Math.min(0.5, FEDERAL_EFFECTIVE_TAX_RATE + retirement.stateTaxRate);
  const colDiff    = retirement.colIndex - current.colIndex;
  const colDiffPct = Math.round(Math.abs(colDiff / current.colIndex) * 100);

  return (
    <div className="space-y-3">
      {/* Two pickers */}
      <div className="grid grid-cols-1 gap-2">
        <LocationPicker
          label="📍 Current Location (where you live now)"
          selectedId={inputs.currentLocationId}
          onSelect={id => setInputs({ currentLocationId: id })}
          accent="blue"
        />
        <LocationPicker
          label="🏖️ Retirement Location (where you plan to retire)"
          selectedId={inputs.retirementLocationId}
          onSelect={id => setInputs({ retirementLocationId: id })}
          accent="emerald"
        />
      </div>

      {/* Arrow connector showing the move */}
      {!same && (
        <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
          <span className="font-medium text-slate-700 truncate">{current.name}</span>
          <ArrowRight size={13} className="text-slate-400 shrink-0" />
          <span className="font-medium text-slate-700 truncate">{retirement.name}</span>
        </div>
      )}

      {/* Impact card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <Info size={12} className="text-slate-400" />
          {same ? 'No location change — using same COL as baseline' : 'Retirement cost-of-living impact'}
        </p>

        {!same && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white rounded-lg p-2 border border-slate-100 text-center">
              <p className="text-slate-400 mb-0.5">Current COL</p>
              <p className="font-bold text-slate-700">{current.colIndex}</p>
              <p className="text-slate-400 text-xs truncate">{current.name.split(',')[0]}</p>
            </div>
            <div className="flex items-center justify-center">
              {colDiff < 0
                ? <TrendingDown size={20} className="text-green-500" />
                : colDiff > 0
                ? <TrendingUp size={20} className="text-amber-500" />
                : <ArrowRight size={20} className="text-slate-400" />}
            </div>
            <div className="bg-white rounded-lg p-2 border border-slate-100 text-center">
              <p className="text-slate-400 mb-0.5">Retirement COL</p>
              <p className="font-bold text-slate-700">{retirement.colIndex}</p>
              <p className="text-slate-400 text-xs truncate">{retirement.name.split(',')[0]}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white rounded-lg p-2 border border-slate-100">
            <p className="text-slate-500 mb-0.5">COL change</p>
            {same
              ? <p className="font-bold text-slate-500">No change</p>
              : <p className={`font-bold ${colDiff < 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {colDiff < 0 ? '▼' : '▲'} {colDiffPct}% {colDiff < 0 ? 'cheaper' : 'more expensive'}
                </p>}
          </div>
          <div className="bg-white rounded-lg p-2 border border-slate-100">
            <p className="text-slate-500 mb-0.5">Retirement tax rate</p>
            <p className="font-bold text-slate-700">{Math.round(retirementEffTax * 100)}%</p>
            <p className="text-slate-400">Fed ~{Math.round(FEDERAL_EFFECTIVE_TAX_RATE * 100)}% + {Math.round(retirement.stateTaxRate * 100)}% local</p>
          </div>
        </div>

        {/* Combined factor */}
        <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-600">Expense adjustment factor</p>
            <p className="text-xs text-slate-400">Applied to your retirement expenses in all calculations</p>
          </div>
          <span className={`text-lg font-bold px-3 py-1 rounded-lg ${
            factor < 0.85 ? 'text-green-700 bg-green-50' :
            factor > 1.25 ? 'text-red-700 bg-red-50' :
            'text-amber-700 bg-amber-50'
          }`}>
            ×{factor.toFixed(2)}
          </span>
        </div>

        {/* Flags */}
        {retirement.stateTaxRate === 0 && (
          <div className="flex items-center gap-1.5 text-xs text-green-700">
            <CheckCircle2 size={12} /> No income tax at retirement destination
          </div>
        )}
        {retirement.taxesSocialSecurity && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700">
            <AlertCircle size={12} /> Retirement location taxes Social Security benefits
          </div>
        )}
        {retirement.country === 'International' && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600">
            <Info size={12} /> {retirement.notes}
          </div>
        )}
      </div>
    </div>
  );
}
