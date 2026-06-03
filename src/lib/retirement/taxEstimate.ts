/**
 * Simplified US federal income tax estimate (2024 brackets, single filer).
 * Monthly income is annualised, tax computed, then converted back to monthly.
 * Approximation — does not account for filing status, AMT, or state-specific deductions.
 *
 * 401(k) treatment: pre-tax, reduces both federal and state taxable income.
 *                   Does NOT reduce FICA (Social Security + Medicare).
 * Roth IRA treatment: post-tax, deducted from net take-home AFTER taxes.
 */

interface TaxBracket { upTo: number; rate: number }

const FEDERAL_BRACKETS_SINGLE: TaxBracket[] = [
  { upTo: 11_600,   rate: 0.10 },
  { upTo: 47_150,   rate: 0.12 },
  { upTo: 100_525,  rate: 0.22 },
  { upTo: 191_950,  rate: 0.24 },
  { upTo: 243_725,  rate: 0.32 },
  { upTo: 609_350,  rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

const STANDARD_DEDUCTION_SINGLE = 14_600; // 2024

// IRS contribution limits by year (update annually each November when IRS announces)
const CONTRIBUTION_LIMITS_BY_YEAR: Record<number, { k401Annual: number; rothIRAAnnual: number }> = {
  2023: { k401Annual: 22_500, rothIRAAnnual: 6_500 },
  2024: { k401Annual: 23_000, rothIRAAnnual: 7_000 },
  2025: { k401Annual: 23_500, rothIRAAnnual: 7_000 },
  2026: { k401Annual: 24_000, rothIRAAnnual: 7_000 }, // projected COLA (+$500)
};

function getLimitsForYear(year: number) {
  // Use the known limit for the exact year, or the nearest past year as fallback
  const knownYears = Object.keys(CONTRIBUTION_LIMITS_BY_YEAR).map(Number).sort((a, b) => b - a);
  const bestYear = knownYears.find(y => y <= year) ?? knownYears[knownYears.length - 1];
  return CONTRIBUTION_LIMITS_BY_YEAR[bestYear];
}

const CURRENT_YEAR = new Date().getFullYear();
const _limits = getLimitsForYear(CURRENT_YEAR);

export const CONTRIBUTION_LIMITS = {
  year:           CURRENT_YEAR,
  k401Annual:     _limits.k401Annual,
  rothIRAAnnual:  _limits.rothIRAAnnual,
  k401Monthly:    _limits.k401Annual  / 12,
  rothIRAMonthly: _limits.rothIRAAnnual / 12,
};

// Keep old export name for backward compatibility
export const LIMITS_2024 = CONTRIBUTION_LIMITS;

function federalTaxAnnual(taxableAnnual: number): number {
  const taxable = Math.max(0, taxableAnnual - STANDARD_DEDUCTION_SINGLE);
  let tax = 0, prev = 0;
  for (const { upTo, rate } of FEDERAL_BRACKETS_SINGLE) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, upTo) - prev) * rate;
    prev = upTo;
  }
  return tax;
}

export interface TaxBreakdown {
  grossMonthly: number;
  contribution401kMonthly: number;    // pre-tax deduction
  taxableIncomeMonthly: number;       // gross - 401k
  federalTaxMonthly: number;
  stateTaxMonthly: number;
  ficaMonthly: number;                // SS 6.2% + Medicare 1.45%
  totalTaxMonthly: number;
  netMonthly: number;                 // gross - 401k - taxes
  rothIRAMonthly: number;             // post-tax deduction from net
  otherInvestmentMonthly: number;     // post-tax deduction from net
  disposableMonthly: number;          // net - rothIRA - other
  totalInvestedMonthly: number;       // 401k + rothIRA + other
  effectiveFederalRate: number;
  effectiveTotalRate: number;         // all taxes / gross
  taxSavings401k: number;             // monthly tax saved by 401k contribution
}

export function estimateTax(
  grossMonthly: number,
  stateTaxRate: number,
  contribution401kMonthly = 0,
  rothIRAMonthly = 0,
  otherInvestmentMonthly = 0,
): TaxBreakdown {
  const zero: TaxBreakdown = {
    grossMonthly: 0, contribution401kMonthly: 0, taxableIncomeMonthly: 0,
    federalTaxMonthly: 0, stateTaxMonthly: 0, ficaMonthly: 0, totalTaxMonthly: 0,
    netMonthly: 0, rothIRAMonthly: 0, otherInvestmentMonthly: 0,
    disposableMonthly: 0, totalInvestedMonthly: 0,
    effectiveFederalRate: 0, effectiveTotalRate: 0, taxSavings401k: 0,
  };
  if (grossMonthly <= 0) return zero;

  const k401Monthly    = Math.min(contribution401kMonthly, grossMonthly);
  const grossAnnual    = grossMonthly * 12;
  const k401Annual     = k401Monthly * 12;

  // Taxable income for federal + state (401k reduces both)
  const taxableAnnual  = Math.max(0, grossAnnual - k401Annual);

  // Federal
  const fedAnnual  = federalTaxAnnual(taxableAnnual);
  const fedMonthly = fedAnnual / 12;

  // Compare what tax would be without 401k
  const fedWithout401k = federalTaxAnnual(grossAnnual) / 12;
  const taxSavings401k = Math.max(0, fedWithout401k - fedMonthly +
    (grossMonthly - k401Monthly) * stateTaxRate - grossMonthly * stateTaxRate);

  // State (flat rate on taxable income)
  const stateMonthly = (taxableAnnual / 12) * stateTaxRate;

  // FICA: 401k does NOT reduce FICA base
  const ssMonthly   = Math.min(grossMonthly, 168_600 / 12) * 0.062;
  const medMonthly  = grossMonthly * 0.0145;
  const ficaMonthly = ssMonthly + medMonthly;

  const totalTaxMonthly = fedMonthly + stateMonthly + ficaMonthly;
  // Net = gross minus 401k (pre-tax) minus taxes
  const netMonthly = Math.max(0, grossMonthly - k401Monthly - totalTaxMonthly);

  const rothCapped  = Math.min(rothIRAMonthly, netMonthly);
  const otherCapped = Math.min(otherInvestmentMonthly, Math.max(0, netMonthly - rothCapped));
  const disposable  = Math.max(0, netMonthly - rothCapped - otherCapped);
  const totalInvested = k401Monthly + rothCapped + otherCapped;

  return {
    grossMonthly:            Math.round(grossMonthly),
    contribution401kMonthly: Math.round(k401Monthly),
    taxableIncomeMonthly:    Math.round(taxableAnnual / 12),
    federalTaxMonthly:       Math.round(fedMonthly),
    stateTaxMonthly:         Math.round(stateMonthly),
    ficaMonthly:             Math.round(ficaMonthly),
    totalTaxMonthly:         Math.round(totalTaxMonthly),
    netMonthly:              Math.round(netMonthly),
    rothIRAMonthly:          Math.round(rothCapped),
    otherInvestmentMonthly:  Math.round(otherCapped),
    disposableMonthly:       Math.round(disposable),
    totalInvestedMonthly:    Math.round(totalInvested),
    effectiveFederalRate:    grossAnnual > 0 ? fedAnnual / grossAnnual : 0,
    effectiveTotalRate:      grossMonthly > 0 ? totalTaxMonthly / grossMonthly : 0,
    taxSavings401k:          Math.round(Math.max(0, taxSavings401k)),
  };
}
