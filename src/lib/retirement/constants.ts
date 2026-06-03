import { RetirementInputs } from './types';
import { DEFAULT_LOCATION_ID } from './data/locations';

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
  spouseRetirementAge: 63,
  spouseCurrentSavings: 75000,
  spouseMonthlyContribution: 1500,
  survivorBenefitRate: 0.67,
  numChildren: 2,
  childAnnualExpense: 15000,
  educationCostPerChild: 100000,
  childExpenseYears: 18,
  alreadyRetired: false,
  spouseAlreadyRetired: false,
  // Savings breakdown defaults (sum matches currentSavings / spouseCurrentSavings)
  savingsCash: 10000,
  savingsInvestments: 85000,
  savingsOtherAssets: 5000,
  spouseSavingsCash: 8000,
  spouseSavingsInvestments: 62000,
  spouseSavingsOtherAssets: 5000,
  // Income breakdown defaults (monthly)
  incomeSalary: 8000,
  incomeBonus: 500,
  incomeRental: 0,
  incomeSideIncome: 0,
  incomeDividends: 200,
  incomePension: 0,
  incomeSocialSec: 0,
  incomeOther: 0,
  spouseIncomeSalary: 6000,
  spouseIncomeBonus: 300,
  spouseIncomeRental: 0,
  spouseIncomeSideIncome: 0,
  spouseIncomeDividends: 100,
  spouseIncomePension: 0,
  spouseIncomeSocialSec: 0,
  spouseIncomeOther: 0,
  currentLocationId: DEFAULT_LOCATION_ID,
  retirementLocationId: DEFAULT_LOCATION_ID,
  properties: [],
  postRetirementMonthlyIncome: 0,
  monthly401k: 0,
  monthlyRothIRA: 0,
  monthlyOtherInvestment: 0,
  spouseMonthly401k: 0,
  spouseMonthlyRothIRA: 0,
  spouseMonthlyOtherInvestment: 0,
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
