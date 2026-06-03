'use client';
import { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { CONTRIBUTION_LIMITS } from '@/lib/retirement/taxEstimate';
import { useRetirementStore } from '@/store/retirementStore';
import { DEFAULTS } from '@/lib/retirement/constants';
import { RetirementInputs, RetirementProperty } from '@/lib/retirement/types';

// ── CSV helpers ───────────────────────────────────────────────────────────────

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function row(...cells: unknown[]): string {
  return cells.map(csvCell).join(',');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['﻿' + content, ''], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Schema definition (single source of truth for template + export + import) ─

interface FieldDef {
  key: string;
  section: string;
  label: string;
  description: string;
  type: 'number' | 'string' | 'boolean' | 'percent';
  example?: string;
}

const FIELDS: FieldDef[] = [
  // ── YOU ──────────────────────────────────────────────────────────────────
  { key: 'alreadyRetired',       section: 'YOU — BASIC INFORMATION',    label: 'alreadyRetired',       type: 'boolean', description: 'true = already retired (retirementAge is set to currentAge automatically)' },
  { key: 'currentAge',           section: 'YOU — BASIC INFORMATION',    label: 'currentAge',           type: 'number',  description: 'Your current age (18–80)' },
  { key: 'retirementAge',        section: 'YOU — BASIC INFORMATION',    label: 'retirementAge',        type: 'number',  description: 'Age you plan to retire (must be > currentAge)' },
  { key: 'lifeExpectancy',       section: 'YOU — BASIC INFORMATION',    label: 'lifeExpectancy',       type: 'number',  description: 'Life expectancy used for simulation (70–100)' },
  // ── YOU — Savings & Contributions breakdown ───────────────────────────
  { key: 'savingsCash',          section: 'YOU — SAVINGS & CONTRIBUTIONS', label: 'savingsCash',          type: 'number',  description: 'Cash savings: savings accounts, CDs, money market (USD)' },
  { key: 'savingsInvestments',   section: 'YOU — SAVINGS & CONTRIBUTIONS', label: 'savingsInvestments',   type: 'number',  description: 'Investments: 401k, IRA, stocks, bonds, ETFs (USD)' },
  { key: 'savingsOtherAssets',   section: 'YOU — SAVINGS & CONTRIBUTIONS', label: 'savingsOtherAssets',   type: 'number',  description: 'Other assets: business equity, collectibles, etc. (USD)' },
  { key: 'currentSavings',       section: 'YOU — SAVINGS & CONTRIBUTIONS', label: 'currentSavings',       type: 'number',  description: 'Total investable savings (auto-sum of above; override if not using breakdown)' },
  { key: 'monthlyContribution',  section: 'YOU — SAVINGS & CONTRIBUTIONS', label: 'monthlyContribution',  type: 'number',  description: 'Total monthly investment = 401k + Roth + other (auto-computed; can override)' },

  // ── SPOUSE (fill when householdType = spouse or family) ───────────────
  { key: 'householdType',        section: 'HOUSEHOLD TYPE',             label: 'householdType',        type: 'string',  description: 'single | spouse | family  (determines which spouse fields apply)' },
  { key: 'spouseAlreadyRetired', section: 'SPOUSE — BASIC INFORMATION', label: 'spouseAlreadyRetired', type: 'boolean', description: 'true = spouse is already retired (spouseRetirementAge locked to spouseAge)' },
  { key: 'spouseAge',            section: 'SPOUSE — BASIC INFORMATION', label: 'spouseAge',            type: 'number',  description: "Spouse's current age" },
  { key: 'spouseRetirementAge',  section: 'SPOUSE — BASIC INFORMATION', label: 'spouseRetirementAge',  type: 'number',  description: "Age spouse plans to retire" },
  // ── SPOUSE — Savings & Contributions breakdown ────────────────────────
  { key: 'spouseSavingsCash',         section: 'SPOUSE — SAVINGS & CONTRIBUTIONS', label: 'spouseSavingsCash',         type: 'number', description: "Spouse's cash savings (USD)" },
  { key: 'spouseSavingsInvestments',  section: 'SPOUSE — SAVINGS & CONTRIBUTIONS', label: 'spouseSavingsInvestments',  type: 'number', description: "Spouse's investments: 401k, IRA, stocks, etc. (USD)" },
  { key: 'spouseSavingsOtherAssets',  section: 'SPOUSE — SAVINGS & CONTRIBUTIONS', label: 'spouseSavingsOtherAssets',  type: 'number', description: "Spouse's other assets (USD)" },
  { key: 'spouseCurrentSavings',      section: 'SPOUSE — SAVINGS & CONTRIBUTIONS', label: 'spouseCurrentSavings',      type: 'number', description: "Spouse's total investable savings (auto-sum of above; override if not using breakdown)" },
  { key: 'spouseMonthlyContribution', section: 'SPOUSE — SAVINGS & CONTRIBUTIONS', label: 'spouseMonthlyContribution', type: 'number', description: "Spouse's total monthly investment (auto-computed; can override)" },
  { key: 'survivorBenefitRate',  section: 'SPOUSE — SURVIVOR BENEFIT',  label: 'survivorBenefitRate',  type: 'percent', description: 'Expenses fraction after one partner passes (e.g. 67 for 67%)', example: '67' },

  // ── SHARED — RETURNS & INFLATION ─────────────────────────────────────
  { key: 'expectedReturnRate',   section: 'SHARED — RETURNS & INFLATION', label: 'expectedReturnRate', type: 'percent', description: 'Expected annual portfolio return (e.g. 7 for 7%)', example: '7' },
  { key: 'inflationRate',        section: 'SHARED — RETURNS & INFLATION', label: 'inflationRate',      type: 'percent', description: 'Annual inflation rate (e.g. 3 for 3%)',            example: '3' },

  // ── SHARED — EXPENSES ────────────────────────────────────────────────
  { key: 'annualExpenses',       section: 'SHARED — EXPENSES',          label: 'annualExpenses',       type: 'number',  description: 'Annual living expenses today — used for FIRE calculations (USD)' },
  { key: 'retirementAnnualExpenses', section: 'SHARED — EXPENSES',      label: 'retirementAnnualExpenses', type: 'number', description: 'Planned yearly spending in retirement in today\'s dollars (USD)' },

  // ── FAMILY ────────────────────────────────────────────────────────────
  { key: 'numChildren',          section: 'FAMILY (family mode only)',  label: 'numChildren',          type: 'number',  description: 'Number of dependent children' },
  { key: 'childAnnualExpense',   section: 'FAMILY (family mode only)',  label: 'childAnnualExpense',   type: 'number',  description: 'Annual cost per child while dependent (USD)' },
  { key: 'educationCostPerChild',section: 'FAMILY (family mode only)',  label: 'educationCostPerChild',type: 'number',  description: 'Total college fund per child (USD)' },
  { key: 'childExpenseYears',    section: 'FAMILY (family mode only)',  label: 'childExpenseYears',    type: 'number',  description: 'Years child expenses apply per child' },

  // ── LOCATION ──────────────────────────────────────────────────────────
  { key: 'currentLocationId',    section: 'LOCATION',                   label: 'currentLocationId',    type: 'string',  description: 'Where you live now — e.g. us-national | fl | ny | ca | in-goa | pt | th' },
  { key: 'retirementLocationId', section: 'LOCATION',                   label: 'retirementLocationId', type: 'string',  description: 'Where you plan to retire — same IDs as currentLocationId' },

  // ── YOU — INCOME & MONTHLY INVESTMENT ────────────────────────────────────
  { key: 'incomeSalary',      section: 'YOU — INCOME & MONTHLY INVESTMENT', label: 'incomeSalary',      type: 'number', description: 'Gross monthly salary / wages (USD/mo)' },
  { key: 'incomeBonus',       section: 'YOU — INCOME & MONTHLY INVESTMENT', label: 'incomeBonus',       type: 'number', description: 'Average monthly bonus or commission (USD/mo)' },
  { key: 'incomeRental',      section: 'YOU — INCOME & MONTHLY INVESTMENT', label: 'incomeRental',      type: 'number', description: 'Net rental income after expenses (USD/mo)' },
  { key: 'incomeSideIncome',  section: 'YOU — INCOME & MONTHLY INVESTMENT', label: 'incomeSideIncome',  type: 'number', description: 'Side business / freelance (USD/mo)' },
  { key: 'incomeDividends',   section: 'YOU — INCOME & MONTHLY INVESTMENT', label: 'incomeDividends',   type: 'number', description: 'Dividends and interest income (USD/mo)' },
  { key: 'incomePension',     section: 'YOU — INCOME & MONTHLY INVESTMENT', label: 'incomePension',     type: 'number', description: 'Monthly pension benefit (USD/mo)' },
  { key: 'incomeSocialSec',   section: 'YOU — INCOME & MONTHLY INVESTMENT', label: 'incomeSocialSec',   type: 'number', description: 'Estimated Social Security benefit (USD/mo)' },
  { key: 'incomeOther',       section: 'YOU — INCOME & MONTHLY INVESTMENT', label: 'incomeOther',       type: 'number', description: 'Other income: alimony, royalties, etc. (USD/mo)' },

  // ── SPOUSE — INCOME & MONTHLY INVESTMENT ─────────────────────────────────
  { key: 'spouseIncomeSalary',      section: 'SPOUSE — INCOME & MONTHLY INVESTMENT', label: 'spouseIncomeSalary',      type: 'number', description: "Spouse's gross monthly salary / wages (USD/mo)" },
  { key: 'spouseIncomeBonus',       section: 'SPOUSE — INCOME & MONTHLY INVESTMENT', label: 'spouseIncomeBonus',       type: 'number', description: "Spouse's monthly bonus or commission (USD/mo)" },
  { key: 'spouseIncomeRental',      section: 'SPOUSE — INCOME & MONTHLY INVESTMENT', label: 'spouseIncomeRental',      type: 'number', description: "Spouse's net rental income (USD/mo)" },
  { key: 'spouseIncomeSideIncome',  section: 'SPOUSE — INCOME & MONTHLY INVESTMENT', label: 'spouseIncomeSideIncome',  type: 'number', description: "Spouse's side business / freelance (USD/mo)" },
  { key: 'spouseIncomeDividends',   section: 'SPOUSE — INCOME & MONTHLY INVESTMENT', label: 'spouseIncomeDividends',   type: 'number', description: "Spouse's dividends and interest (USD/mo)" },
  { key: 'spouseIncomePension',     section: 'SPOUSE — INCOME & MONTHLY INVESTMENT', label: 'spouseIncomePension',     type: 'number', description: "Spouse's monthly pension benefit (USD/mo)" },
  { key: 'spouseIncomeSocialSec',   section: 'SPOUSE — INCOME & MONTHLY INVESTMENT', label: 'spouseIncomeSocialSec',   type: 'number', description: "Spouse's Social Security estimate (USD/mo)" },
  { key: 'spouseIncomeOther',       section: 'SPOUSE — INCOME & MONTHLY INVESTMENT', label: 'spouseIncomeOther',       type: 'number', description: "Spouse's other income (USD/mo)" },

  // ── YOU — INVESTMENTS ─────────────────────────────────────────────────────
  { key: 'monthly401k',                  section: 'YOU — INVESTMENTS',    label: 'monthly401k',                  type: 'number', description: `Monthly 401(k)/403(b) pre-tax contribution (${CONTRIBUTION_LIMITS.year} limit: $${Math.round(CONTRIBUTION_LIMITS.k401Monthly)}/mo = $${CONTRIBUTION_LIMITS.k401Annual.toLocaleString()}/yr)` },
  { key: 'monthlyRothIRA',               section: 'YOU — INVESTMENTS',    label: 'monthlyRothIRA',               type: 'number', description: `Monthly Roth IRA post-tax contribution (${CONTRIBUTION_LIMITS.year} limit: $${Math.round(CONTRIBUTION_LIMITS.rothIRAMonthly)}/mo = $${CONTRIBUTION_LIMITS.rothIRAAnnual.toLocaleString()}/yr)` },
  { key: 'monthlyOtherInvestment',       section: 'YOU — INVESTMENTS',    label: 'monthlyOtherInvestment',       type: 'number', description: 'Other monthly investments from net pay: brokerage, HSA, etc. (USD)' },

  // ── SPOUSE — INVESTMENTS ─────────────────────────────────────────────────
  { key: 'spouseMonthly401k',            section: 'SPOUSE — INVESTMENTS', label: 'spouseMonthly401k',            type: 'number', description: "Spouse's monthly 401(k)/403(b) pre-tax contribution (USD)" },
  { key: 'spouseMonthlyRothIRA',         section: 'SPOUSE — INVESTMENTS', label: 'spouseMonthlyRothIRA',         type: 'number', description: "Spouse's monthly Roth IRA post-tax contribution (USD)" },
  { key: 'spouseMonthlyOtherInvestment', section: 'SPOUSE — INVESTMENTS', label: 'spouseMonthlyOtherInvestment', type: 'number', description: "Spouse's other monthly investments (USD)" },

  // ── RETIREMENT INCOME ─────────────────────────────────────────────────────
  { key: 'postRetirementMonthlyIncome',  section: 'RETIREMENT INCOME',    label: 'postRetirementMonthlyIncome',  type: 'number', description: 'Monthly passive income in retirement: rental + pension + SS + dividends (USD)' },
];

// ── Value formatters for CSV export ──────────────────────────────────────────

function formatForCsv(key: string, value: unknown): string {
  const def = FIELDS.find(f => f.key === key);
  if (!def) return String(value ?? '');
  if (def.type === 'percent') return String(Math.round(Number(value) * 100));
  if (def.type === 'boolean') return String(value);
  return String(value ?? '');
}

function parseFromCsv(key: string, raw: string): unknown {
  const def = FIELDS.find(f => f.key === key);
  const trimmed = raw.trim();
  if (!def || trimmed === '') return undefined;
  if (def.type === 'percent') return Number(trimmed) / 100;
  if (def.type === 'number')  return Number(trimmed);
  if (def.type === 'boolean') return trimmed.toLowerCase() === 'true';
  return trimmed; // string
}

// ── CSV builder ───────────────────────────────────────────────────────────────

function buildCsv(inputs: RetirementInputs, isTemplate: boolean): string {
  const inputMap = inputs as unknown as Record<string, unknown>;
  const defaultMap = DEFAULTS as unknown as Record<string, unknown>;

  const lines: string[] = [];

  // Header
  lines.push(row('FIELD', 'VALUE', 'DESCRIPTION'));

  let lastSection = '';
  for (const f of FIELDS) {
    // Section header row
    if (f.section !== lastSection) {
      lines.push(''); // blank line
      lines.push(row(`--- ${f.section} ---`, '', ''));
      lastSection = f.section;
    }
    const rawVal = isTemplate ? defaultMap[f.key] : inputMap[f.key];
    const displayVal = formatForCsv(f.key, rawVal);
    lines.push(row(f.label, displayVal, f.description));
  }

  // Properties section
  lines.push('');
  lines.push(row('--- PROPERTIES (household assets — add a block per property, increment the number) ---', '', ''));
  lines.push(row('', '', 'Each property block has 4 rows. Default appreciation: 1.56%/yr (US historical avg)'));

  const properties: RetirementProperty[] = isTemplate
    ? [
        { id: '1', label: 'Primary Residence',   currentValue: 400000, appreciationRate: 0.0156, sellAtRetirement: false },
        { id: '2', label: 'Spouse Property / Investment Property', currentValue: 250000, appreciationRate: 0.0156, sellAtRetirement: true  },
      ]
    : ((inputs.properties ?? []).length > 0
        ? inputs.properties
        : [{ id: '1', label: 'Primary Residence', currentValue: 400000, appreciationRate: 0.0156, sellAtRetirement: false }]);

  properties.forEach((p, i) => {
    const n = i + 1;
    lines.push('');
    lines.push(row(`property_${n}_label`,           p.label,                                          `Property ${n} name / owner (e.g. "Spouse - Rental")`));
    lines.push(row(`property_${n}_currentValue`,     String(p.currentValue),                          'Current market value (USD)'));
    lines.push(row(`property_${n}_appreciationRate`, String(Math.round(p.appreciationRate * 10000) / 100), 'Annual appreciation % (e.g. 1.56)'));
    lines.push(row(`property_${n}_sellAtRetirement`, String(p.sellAtRetirement),                      'true = proceeds added to portfolio at retirement | false = keep'));
  });

  return lines.join('\n');
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCsv(text: string): { inputs: Partial<RetirementInputs>; warnings: string[] } {
  const warnings: string[] = [];
  const result: Record<string, unknown> = {};
  const props: Record<string, Partial<RetirementProperty>> = {};

  const lines = text.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Tokenise respecting quoted fields
    const cols: string[] = [];
    let inQ = false, cur = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur);

    const field = (cols[0] ?? '').trim();
    const value = (cols[1] ?? '').trim();

    // Skip header row, blank first col, section rows
    if (!field || field === 'FIELD' || field.startsWith('---')) continue;

    // Property rows
    const propMatch = field.match(/^property_(\d+)_(.+)$/);
    if (propMatch) {
      const [, num, prop] = propMatch;
      if (!props[num]) props[num] = {};
      if (prop === 'label')             props[num].label = value;
      else if (prop === 'currentValue') props[num].currentValue = Number(value);
      else if (prop === 'appreciationRate') props[num].appreciationRate = Number(value) / 100;
      else if (prop === 'sellAtRetirement') props[num].sellAtRetirement = value.toLowerCase() === 'true';
      continue;
    }

    // Regular field
    const def = FIELDS.find(f => f.key === field);
    if (!def) { warnings.push(`Unknown field "${field}" — skipped.`); continue; }
    const parsed = parseFromCsv(field, value);
    if (parsed !== undefined) result[field] = parsed;
  }

  // Assemble properties array
  const propertiesArray: RetirementProperty[] = Object.values(props)
    .filter(p => p.label || p.currentValue)
    .map((p, i) => ({
      id: String(i + 1),
      label: p.label ?? `Property ${i + 1}`,
      currentValue: p.currentValue ?? 0,
      appreciationRate: p.appreciationRate ?? 0.0156,
      sellAtRetirement: p.sellAtRetirement ?? false,
    }));
  result.properties = propertiesArray;

  // Merge with defaults for missing fields
  const defaults = DEFAULTS as unknown as Record<string, unknown>;
  for (const key of Object.keys(defaults)) {
    if (!(key in result)) result[key] = defaults[key];
  }

  return { inputs: result as unknown as Partial<RetirementInputs>, warnings };
}

// ── Component ─────────────────────────────────────────────────────────────────

type Status = { type: 'success' | 'error'; message: string; warnings?: string[] } | null;

export function ImportExport() {
  const { inputs, setInputs, computeResults } = useRetirementStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);

  function show(s: Status) {
    setStatus(s);
    if (s?.type === 'success') setTimeout(() => setStatus(null), 5000);
  }

  function handleTemplate() {
    downloadCsv(buildCsv(DEFAULTS as unknown as RetirementInputs, true), 'firesmart-template.csv');
    show({ type: 'success', message: 'Template downloaded. Open in Excel, fill in the VALUE column, then import.' });
  }

  function handleExport() {
    const date = new Date().toISOString().split('T')[0];
    downloadCsv(buildCsv(inputs, false), `firesmart-profile-${date}.csv`);
    show({ type: 'success', message: 'Profile exported. Open in Excel or save to re-import later.' });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(csv|txt)$/i)) {
      show({ type: 'error', message: 'Please upload a .csv file (exported from FireSmart or filled-in template).' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const { inputs: parsed, warnings } = parseCsv(text);
        setInputs(parsed as RetirementInputs);
        computeResults();
        show({
          type: 'success',
          message: 'Profile imported successfully — all fields updated.',
          warnings: warnings.length ? warnings : undefined,
        });
      } catch {
        show({ type: 'error', message: 'Could not read the file. Make sure it is a valid FireSmart CSV.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <button onClick={handleTemplate}
          className="flex flex-col items-center gap-1 px-2 py-2.5 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
          <FileSpreadsheet size={15} />
          <span>Get Template</span>
        </button>

        <button onClick={handleExport}
          className="flex flex-col items-center gap-1 px-2 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-600 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors">
          <Download size={15} />
          <span>Export (.csv)</span>
        </button>

        <button onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-1 px-2 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
          <Upload size={15} />
          <span>Import (.csv)</span>
        </button>

        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
      </div>

      {status && (
        <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ${
          status.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {status.type === 'success'
            ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
            : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="font-semibold">{status.message}</p>
            {status.warnings?.map((w, i) => <p key={i} className="text-amber-600 mt-0.5">{w}</p>)}
          </div>
          <button onClick={() => setStatus(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X size={12} />
          </button>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">CSV · opens in Excel, Google Sheets, Numbers</p>
    </div>
  );
}
