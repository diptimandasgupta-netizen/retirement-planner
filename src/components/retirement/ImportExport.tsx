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

  // ── 1. HOUSEHOLD TYPE ─────────────────────────────────────────────────────
  { key: 'householdType',        section: '1. HOUSEHOLD TYPE',                  label: 'householdType',        type: 'string',  description: 'single | spouse | family  (determines which spouse/family fields are used)' },

  // ── 2. YOU — AGES & RETIREMENT ───────────────────────────────────────────
  { key: 'alreadyRetired',       section: '2. YOU — AGES & RETIREMENT',         label: 'alreadyRetired',       type: 'boolean', description: 'true = already retired (retirementAge is locked to currentAge automatically)' },
  { key: 'currentAge',           section: '2. YOU — AGES & RETIREMENT',         label: 'currentAge',           type: 'number',  description: 'Your current age (18–80)' },
  { key: 'retirementAge',        section: '2. YOU — AGES & RETIREMENT',         label: 'retirementAge',        type: 'number',  description: 'Age you plan to retire (must be > currentAge; ignored if alreadyRetired = true)' },
  { key: 'lifeExpectancy',       section: '2. YOU — AGES & RETIREMENT',         label: 'lifeExpectancy',       type: 'number',  description: 'Life expectancy used for portfolio simulation (70–100)' },

  // ── 3. SPOUSE — AGES & RETIREMENT (spouse / family mode only) ────────────
  { key: 'spouseAlreadyRetired', section: '3. SPOUSE — AGES & RETIREMENT',      label: 'spouseAlreadyRetired', type: 'boolean', description: 'true = spouse already retired (spouseRetirementAge locked to spouseAge)' },
  { key: 'spouseAge',            section: '3. SPOUSE — AGES & RETIREMENT',      label: 'spouseAge',            type: 'number',  description: "Spouse's current age" },
  { key: 'spouseRetirementAge',  section: '3. SPOUSE — AGES & RETIREMENT',      label: 'spouseRetirementAge',  type: 'number',  description: "Age spouse plans to retire (ignored if spouseAlreadyRetired = true)" },

  // ── 4. YOU — SAVINGS (Cash / Investments / Other Assets) ─────────────────
  { key: 'savingsCash',          section: '4. YOU — SAVINGS',                   label: 'savingsCash',          type: 'number',  description: 'Cash: savings accounts, CDs, money market (USD)' },
  { key: 'savingsInvestments',   section: '4. YOU — SAVINGS',                   label: 'savingsInvestments',   type: 'number',  description: 'Investments: 401k balance, IRA, stocks, bonds, ETFs (USD)' },
  { key: 'savingsOtherAssets',   section: '4. YOU — SAVINGS',                   label: 'savingsOtherAssets',   type: 'number',  description: 'Other assets: business equity, collectibles, crypto, etc. (USD)' },
  { key: 'currentSavings',       section: '4. YOU — SAVINGS',                   label: 'currentSavings',       type: 'number',  description: 'Total investable savings — auto-sum of Cash + Investments + Other (override if skipping breakdown)' },

  // ── 5. YOU — INCOME (Active income stops at retirement; passive continues) ─
  { key: 'incomeSalary',         section: '5. YOU — INCOME',                    label: 'incomeSalary',         type: 'number',  description: 'Gross monthly salary / wages — ACTIVE (stops at retirementAge) (USD/mo)' },
  { key: 'incomeBonus',          section: '5. YOU — INCOME',                    label: 'incomeBonus',          type: 'number',  description: 'Average monthly bonus or commission — ACTIVE (USD/mo)' },
  { key: 'incomeSideIncome',     section: '5. YOU — INCOME',                    label: 'incomeSideIncome',     type: 'number',  description: 'Side business / freelance — ACTIVE (USD/mo)' },
  { key: 'incomeRental',         section: '5. YOU — INCOME',                    label: 'incomeRental',         type: 'number',  description: 'Net rental income — PASSIVE (continues in retirement) (USD/mo)' },
  { key: 'incomeDividends',      section: '5. YOU — INCOME',                    label: 'incomeDividends',      type: 'number',  description: 'Dividends & interest income — PASSIVE (USD/mo)' },
  { key: 'incomePension',        section: '5. YOU — INCOME',                    label: 'incomePension',        type: 'number',  description: 'Monthly pension benefit — PASSIVE (USD/mo)' },
  { key: 'incomeSocialSec',      section: '5. YOU — INCOME',                    label: 'incomeSocialSec',      type: 'number',  description: 'Estimated Social Security benefit — PASSIVE (USD/mo)' },
  { key: 'incomeOther',          section: '5. YOU — INCOME',                    label: 'incomeOther',          type: 'number',  description: 'Other passive income: alimony, royalties, etc. (USD/mo)' },

  // ── 6. YOU — INVESTMENTS (401k / Roth IRA / Other — all stop at retirement)
  { key: 'monthly401k',          section: '6. YOU — INVESTMENTS',               label: 'monthly401k',          type: 'number',  description: `Monthly 401(k)/403(b) PRE-TAX contribution — reduces taxable income (${CONTRIBUTION_LIMITS.year} limit: $${CONTRIBUTION_LIMITS.k401Annual.toLocaleString()}/yr)` },
  { key: 'monthlyRothIRA',       section: '6. YOU — INVESTMENTS',               label: 'monthlyRothIRA',       type: 'number',  description: `Monthly Roth IRA POST-TAX contribution — tax-free growth (${CONTRIBUTION_LIMITS.year} limit: $${CONTRIBUTION_LIMITS.rothIRAAnnual.toLocaleString()}/yr)` },
  { key: 'monthlyOtherInvestment',section: '6. YOU — INVESTMENTS',              label: 'monthlyOtherInvestment',type: 'number', description: 'Other monthly investments from net pay: brokerage, HSA, 529, etc. (USD/mo)' },
  { key: 'monthlyContribution',  section: '6. YOU — INVESTMENTS',               label: 'monthlyContribution',  type: 'number',  description: 'Total monthly investment = 401k + Roth + other (auto-computed; can override)' },

  // ── 7. SPOUSE — SAVINGS (spouse / family mode) ───────────────────────────
  { key: 'spouseSavingsCash',         section: '7. SPOUSE — SAVINGS',           label: 'spouseSavingsCash',         type: 'number', description: "Spouse's cash savings (USD)" },
  { key: 'spouseSavingsInvestments',  section: '7. SPOUSE — SAVINGS',           label: 'spouseSavingsInvestments',  type: 'number', description: "Spouse's investments: 401k, IRA, stocks, etc. (USD)" },
  { key: 'spouseSavingsOtherAssets',  section: '7. SPOUSE — SAVINGS',           label: 'spouseSavingsOtherAssets',  type: 'number', description: "Spouse's other assets (USD)" },
  { key: 'spouseCurrentSavings',      section: '7. SPOUSE — SAVINGS',           label: 'spouseCurrentSavings',      type: 'number', description: "Spouse's total investable savings — auto-sum; override if skipping breakdown" },

  // ── 8. SPOUSE — INCOME ───────────────────────────────────────────────────
  { key: 'spouseIncomeSalary',      section: '8. SPOUSE — INCOME',              label: 'spouseIncomeSalary',      type: 'number', description: "Spouse's gross monthly salary / wages — ACTIVE (USD/mo)" },
  { key: 'spouseIncomeBonus',       section: '8. SPOUSE — INCOME',              label: 'spouseIncomeBonus',       type: 'number', description: "Spouse's monthly bonus or commission — ACTIVE (USD/mo)" },
  { key: 'spouseIncomeSideIncome',  section: '8. SPOUSE — INCOME',              label: 'spouseIncomeSideIncome',  type: 'number', description: "Spouse's side business / freelance — ACTIVE (USD/mo)" },
  { key: 'spouseIncomeRental',      section: '8. SPOUSE — INCOME',              label: 'spouseIncomeRental',      type: 'number', description: "Spouse's net rental income — PASSIVE (USD/mo)" },
  { key: 'spouseIncomeDividends',   section: '8. SPOUSE — INCOME',              label: 'spouseIncomeDividends',   type: 'number', description: "Spouse's dividends & interest — PASSIVE (USD/mo)" },
  { key: 'spouseIncomePension',     section: '8. SPOUSE — INCOME',              label: 'spouseIncomePension',     type: 'number', description: "Spouse's monthly pension benefit — PASSIVE (USD/mo)" },
  { key: 'spouseIncomeSocialSec',   section: '8. SPOUSE — INCOME',              label: 'spouseIncomeSocialSec',   type: 'number', description: "Spouse's Social Security estimate — PASSIVE (USD/mo)" },
  { key: 'spouseIncomeOther',       section: '8. SPOUSE — INCOME',              label: 'spouseIncomeOther',       type: 'number', description: "Spouse's other passive income (USD/mo)" },

  // ── 9. SPOUSE — INVESTMENTS ──────────────────────────────────────────────
  { key: 'spouseMonthly401k',            section: '9. SPOUSE — INVESTMENTS',    label: 'spouseMonthly401k',            type: 'number', description: "Spouse's monthly 401(k)/403(b) pre-tax contribution (USD/mo)" },
  { key: 'spouseMonthlyRothIRA',         section: '9. SPOUSE — INVESTMENTS',    label: 'spouseMonthlyRothIRA',         type: 'number', description: "Spouse's monthly Roth IRA post-tax contribution (USD/mo)" },
  { key: 'spouseMonthlyOtherInvestment', section: '9. SPOUSE — INVESTMENTS',    label: 'spouseMonthlyOtherInvestment', type: 'number', description: "Spouse's other monthly investments (USD/mo)" },
  { key: 'spouseMonthlyContribution',    section: '9. SPOUSE — INVESTMENTS',    label: 'spouseMonthlyContribution',    type: 'number', description: "Spouse's total monthly investment (auto-computed; can override)" },

  // ── 10. EXPENSES — PRE-RETIREMENT (monthly; sum × 12 = annualExpenses) ───
  { key: 'expenseHousing',       section: '10. EXPENSES — PRE-RETIREMENT',      label: 'expenseHousing',       type: 'number', description: 'Housing: rent or mortgage (USD/mo)' },
  { key: 'expenseFood',          section: '10. EXPENSES — PRE-RETIREMENT',      label: 'expenseFood',          type: 'number', description: 'Food & groceries (USD/mo)' },
  { key: 'expenseTransport',     section: '10. EXPENSES — PRE-RETIREMENT',      label: 'expenseTransport',     type: 'number', description: 'Transportation: car payment, fuel, transit (USD/mo)' },
  { key: 'expenseHealthcare',    section: '10. EXPENSES — PRE-RETIREMENT',      label: 'expenseHealthcare',    type: 'number', description: 'Healthcare & medical (USD/mo)' },
  { key: 'expenseEntertainment', section: '10. EXPENSES — PRE-RETIREMENT',      label: 'expenseEntertainment', type: 'number', description: 'Entertainment, dining out, hobbies (USD/mo)' },
  { key: 'expenseInsurance',     section: '10. EXPENSES — PRE-RETIREMENT',      label: 'expenseInsurance',     type: 'number', description: 'Insurance premiums (health, life, home, auto) (USD/mo)' },
  { key: 'expenseUtilities',     section: '10. EXPENSES — PRE-RETIREMENT',      label: 'expenseUtilities',     type: 'number', description: 'Utilities: electricity, gas, internet, phone (USD/mo)' },
  { key: 'expenseOther',         section: '10. EXPENSES — PRE-RETIREMENT',      label: 'expenseOther',         type: 'number', description: 'Other miscellaneous expenses (USD/mo)' },
  { key: 'annualExpenses',       section: '10. EXPENSES — PRE-RETIREMENT',      label: 'annualExpenses',       type: 'number', description: 'Total annual pre-retirement expenses (auto-sum of above × 12; used for FIRE) (USD/yr)' },

  // ── 11. EXPENSES — IN RETIREMENT (monthly; sum × 12 = retirementAnnualExpenses)
  { key: 'retExpenseHousing',       section: '11. EXPENSES — IN RETIREMENT',    label: 'retExpenseHousing',       type: 'number', description: 'Housing in retirement (USD/mo)' },
  { key: 'retExpenseFood',          section: '11. EXPENSES — IN RETIREMENT',    label: 'retExpenseFood',          type: 'number', description: 'Food & groceries in retirement (USD/mo)' },
  { key: 'retExpenseTransport',     section: '11. EXPENSES — IN RETIREMENT',    label: 'retExpenseTransport',     type: 'number', description: 'Transportation in retirement — often lower (USD/mo)' },
  { key: 'retExpenseHealthcare',    section: '11. EXPENSES — IN RETIREMENT',    label: 'retExpenseHealthcare',    type: 'number', description: 'Healthcare in retirement — often higher (USD/mo)' },
  { key: 'retExpenseEntertainment', section: '11. EXPENSES — IN RETIREMENT',    label: 'retExpenseEntertainment', type: 'number', description: 'Entertainment & travel in retirement (USD/mo)' },
  { key: 'retExpenseInsurance',     section: '11. EXPENSES — IN RETIREMENT',    label: 'retExpenseInsurance',     type: 'number', description: 'Insurance in retirement (USD/mo)' },
  { key: 'retExpenseUtilities',     section: '11. EXPENSES — IN RETIREMENT',    label: 'retExpenseUtilities',     type: 'number', description: 'Utilities in retirement (USD/mo)' },
  { key: 'retExpenseOther',         section: '11. EXPENSES — IN RETIREMENT',    label: 'retExpenseOther',         type: 'number', description: 'Other expenses in retirement (USD/mo)' },
  { key: 'retirementAnnualExpenses', section: '11. EXPENSES — IN RETIREMENT',   label: 'retirementAnnualExpenses', type: 'number', description: 'Total annual retirement expenses (auto-sum × 12; drives all withdrawal calculations) (USD/yr)' },

  // ── 12. RETIREMENT INCOME (passive income that offsets withdrawals) ───────
  { key: 'postRetirementMonthlyIncome', section: '12. RETIREMENT INCOME',       label: 'postRetirementMonthlyIncome', type: 'number', description: 'Total monthly passive income in retirement: rental + pension + SS + dividends (auto-set from passive income rows above) (USD/mo)' },

  // ── 13. LOCATION ──────────────────────────────────────────────────────────
  { key: 'currentLocationId',    section: '13. LOCATION',                       label: 'currentLocationId',    type: 'string',  description: 'Where you live now — e.g. us-national | fl | ny | ca | tx | wa | in-goa | gb | au | th | pt' },
  { key: 'retirementLocationId', section: '13. LOCATION',                       label: 'retirementLocationId', type: 'string',  description: 'Where you plan to retire — same IDs as currentLocationId (affects COL & tax in all calculations)' },

  // ── 14. RETURNS & INFLATION ───────────────────────────────────────────────
  { key: 'expectedReturnRate',   section: '14. RETURNS & INFLATION',            label: 'expectedReturnRate',   type: 'percent', description: 'Expected annual portfolio return (e.g. 7 for 7%; S&P 500 historical avg ~10% nominal)', example: '7' },
  { key: 'inflationRate',        section: '14. RETURNS & INFLATION',            label: 'inflationRate',        type: 'percent', description: 'Annual inflation rate (e.g. 3 for 3%; US long-run avg ~3%)',                              example: '3' },

  // ── 15. SURVIVOR BENEFIT (spouse / family mode) ───────────────────────────
  { key: 'survivorBenefitRate',  section: '15. SURVIVOR BENEFIT',               label: 'survivorBenefitRate',  type: 'percent', description: 'Fraction of expenses after one partner passes (e.g. 67 for 67%)', example: '67' },

  // ── 16. CHILDREN & EDUCATION (family mode only) ───────────────────────────
  { key: 'numChildren',                   section: '16. CHILDREN & EDUCATION',  label: 'numChildren',                   type: 'number', description: 'Number of dependent children (1–6)' },
  { key: 'childExpenseDaycare',           section: '16. CHILDREN & EDUCATION',  label: 'childExpenseDaycare',           type: 'number', description: 'Daycare / Preschool — ages 0–5 (default $18,000/yr per child; 0 = not selected)' },
  { key: 'childExpensePublicExtras',      section: '16. CHILDREN & EDUCATION',  label: 'childExpensePublicExtras',      type: 'number', description: 'Public School Extras — ages 5–18 (default $3,000/yr; 0 = not selected)' },
  { key: 'childExpensePrivateSchool',     section: '16. CHILDREN & EDUCATION',  label: 'childExpensePrivateSchool',     type: 'number', description: 'Private School K-12 — ages 5–18 (default $35,000/yr; 0 = not selected)' },
  { key: 'childExpenseActivities',        section: '16. CHILDREN & EDUCATION',  label: 'childExpenseActivities',        type: 'number', description: 'Activities & Sports — ages 3–18 (default $5,000/yr; 0 = not selected)' },
  { key: 'childExpensePremiumActivities', section: '16. CHILDREN & EDUCATION',  label: 'childExpensePremiumActivities', type: 'number', description: 'Premium Activities (travel team, private lessons) — ages 5–18 (default $15,000/yr; 0 = not selected)' },
  { key: 'childExpenseHealthcare',        section: '16. CHILDREN & EDUCATION',  label: 'childExpenseHealthcare',        type: 'number', description: 'Child Healthcare — ages 0–26 (default $3,000/yr; 0 = not selected)' },
  { key: 'childExpenseCollegeSavings',    section: '16. CHILDREN & EDUCATION',  label: 'childExpenseCollegeSavings',    type: 'number', description: 'College Savings 529 — ages 0–18 (default $12,000/yr; 0 = not selected)' },
  { key: 'childExpenseCollegeTuition',    section: '16. CHILDREN & EDUCATION',  label: 'childExpenseCollegeTuition',    type: 'number', description: 'College Tuition 4 years — ages 18–22 (default $45,000/yr; 0 = not selected)' },
  { key: 'childExpenseBabysitter',        section: '16. CHILDREN & EDUCATION',  label: 'childExpenseBabysitter',        type: 'number', description: 'Babysitter / Nanny — ages 0–12 (default $8,000/yr; 0 = not selected)' },
  { key: 'childExpenseFoodClothing',      section: '16. CHILDREN & EDUCATION',  label: 'childExpenseFoodClothing',      type: 'number', description: 'Food & Clothing — ages 0–18 (default $4,000/yr; 0 = not selected)' },
  { key: 'childAnnualExpense',            section: '16. CHILDREN & EDUCATION',  label: 'childAnnualExpense',            type: 'number', description: 'Total per child/yr — auto-sum of selected categories above (USD/yr per child)' },
  { key: 'childExpenseYears',             section: '16. CHILDREN & EDUCATION',  label: 'childExpenseYears',             type: 'number', description: 'Years child expenses apply per child (default 18)' },
  { key: 'educationCostPerChild',         section: '16. CHILDREN & EDUCATION',  label: 'educationCostPerChild',         type: 'number', description: 'Total college fund / education lump-sum per child (USD)' },
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
  const { inputs, setInputs, computeResults, bumpImportVersion } = useRetirementStore();
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
        bumpImportVersion(); // force InputPanel to remount so local state re-initialises
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
