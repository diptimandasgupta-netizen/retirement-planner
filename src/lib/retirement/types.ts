export type HouseholdType = 'single' | 'spouse' | 'family';
export type FIREType = 'lean' | 'regular' | 'fat';

export interface RetirementInputs {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedReturnRate: number;       // nominal decimal, e.g. 0.07
  inflationRate: number;            // decimal, e.g. 0.03
  annualExpenses: number;           // today's dollars — used for FIRE calculations
  retirementAnnualExpenses: number; // today's dollars — actual spending in retirement
  householdType: HouseholdType;
  // Spouse
  spouseAge: number;
  spouseMonthlyContribution: number;
  survivorBenefitRate: number;      // fraction, e.g. 0.67
  // Family
  numChildren: number;
  childAnnualExpense: number;
  educationCostPerChild: number;
  childExpenseYears: number;        // how many years per child expenses run
}

export interface YearlyDataPoint {
  age: number;
  year: number;
  portfolioNominal: number;
  portfolioReal: number;
  annualContribution: number;
  withdrawalAmount: number;
  isRetirementYear: boolean;
  isDepletionYear: boolean;
}

export interface RetirementCorpus {
  nominalNeeded: number;
  projectedAtRetirement: number;
  gap: number;                      // positive = surplus, negative = shortfall
  additionalMonthlySavingsNeeded: number;
}

export interface FIREMetrics {
  adjustedAnnualExpenses: number;   // with household multiplier, in today's dollars
  leanFIRENumber: number;           // 20x — 5% SWR
  regularFIRENumber: number;        // 25x — 4% SWR
  fatFIRENumber: number;            // 33x — 3% SWR
  yearsToLeanFIRE: number | null;
  yearsToRegularFIRE: number | null;
  yearsToFatFIRE: number | null;
  ageAtLeanFIRE: number | null;
  ageAtRegularFIRE: number | null;
  ageAtFatFIRE: number | null;
  currentFIREStatus: FIREType | null;
}

export interface SWRPoint {
  rate: number;
  annualIncome: number;
  corpusNeeded: number;
}

export interface MonteCarloResult {
  successRate: number;
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
  medianDepletionAge: number | null;
  ages: number[];
}

export interface ComputedResults {
  yearlyData: YearlyDataPoint[];
  corpus: RetirementCorpus;
  fire: FIREMetrics;
  swrAnalysis: SWRPoint[];
  depletionAge: number | null;
  realReturnRate: number;
}
