import { RetirementInputs } from './types';

export const DEFAULTS: RetirementInputs = {
  currentAge: 35,
  retirementAge: 65,
  lifeExpectancy: 95,
  currentSavings: 100000,
  monthlyContribution: 2000,
  expectedReturnRate: 0.07,
  inflationRate: 0.03,
  annualExpenses: 60000,
  retirementAnnualExpenses: 48000,  // slightly lower — common to spend less in retirement
  householdType: 'single',
  spouseAge: 33,
  spouseMonthlyContribution: 1500,
  survivorBenefitRate: 0.67,
  numChildren: 2,
  childAnnualExpense: 15000,
  educationCostPerChild: 100000,
  childExpenseYears: 18,
};

export const FIRE_MULTIPLIERS = {
  lean: 20,
  regular: 25,
  fat: 33,
};

export const HOUSEHOLD_EXPENSE_MULTIPLIER: Record<string, (numChildren?: number) => number> = {
  single: () => 1.0,
  spouse: () => 1.6,
  family: (n = 2) => Math.min(2.0 + 0.15 * n, 3.5),
};

export const MONTE_CARLO = {
  numSimulations: 1000,
  returnStdDev: 0.12,
  inflationStdDev: 0.01,
};

export const SWR_RATES = [0.03, 0.035, 0.04, 0.045, 0.05];

export const USD = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

export const USDM = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return USD(n);
};
