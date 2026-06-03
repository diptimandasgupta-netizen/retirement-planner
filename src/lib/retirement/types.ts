export type HouseholdType = 'single' | 'spouse' | 'family';
export type FIREType = 'lean' | 'regular' | 'fat';

export interface RetirementProperty {
  id: string;
  label: string;
  currentValue: number;
  appreciationRate: number;   // annual decimal, default 0.0156
  sellAtRetirement: boolean;  // include proceeds in portfolio at retirement
}

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
  spouseRetirementAge: number;
  spouseCurrentSavings: number;
  spouseMonthlyContribution: number;
  survivorBenefitRate: number;      // fraction, e.g. 0.67
  // Family
  numChildren: number;
  childAnnualExpense: number;
  educationCostPerChild: number;
  childExpenseYears: number;        // how many years per child expenses run
  alreadyRetired: boolean;
  spouseAlreadyRetired: boolean;
  // ── Child expense categories (annual per child; 0 = not selected) ──────
  childExpenseDaycare: number;
  childExpensePublicExtras: number;
  childExpensePrivateSchool: number;
  childExpenseActivities: number;
  childExpensePremiumActivities: number;
  childExpenseHealthcare: number;
  childExpenseCollegeSavings: number;
  childExpenseCollegeTuition: number;
  childExpenseBabysitter: number;
  childExpenseFoodClothing: number;
  // ── Expense breakdown — pre-retirement (monthly) ──────────────────────
  expenseHousing: number;
  expenseFood: number;
  expenseTransport: number;
  expenseHealthcare: number;
  expenseEntertainment: number;
  expenseInsurance: number;
  expenseUtilities: number;
  expenseOther: number;
  // ── Expense breakdown — in retirement (monthly) ────────────────────────
  retExpenseHousing: number;
  retExpenseFood: number;
  retExpenseTransport: number;
  retExpenseHealthcare: number;
  retExpenseEntertainment: number;
  retExpenseInsurance: number;
  retExpenseUtilities: number;
  retExpenseOther: number;
  // ── Savings breakdown (Cash / Investments / Other Assets) ──────────────
  savingsCash: number;
  savingsInvestments: number;
  savingsOtherAssets: number;
  spouseSavingsCash: number;
  spouseSavingsInvestments: number;
  spouseSavingsOtherAssets: number;
  // ── Income breakdown (monthly amounts) ────────────────────────────────
  incomeSalary: number;
  incomeBonus: number;
  incomeRental: number;
  incomeSideIncome: number;
  incomeDividends: number;
  incomePension: number;
  incomeSocialSec: number;
  incomeOther: number;
  spouseIncomeSalary: number;
  spouseIncomeBonus: number;
  spouseIncomeRental: number;
  spouseIncomeSideIncome: number;
  spouseIncomeDividends: number;
  spouseIncomePension: number;
  spouseIncomeSocialSec: number;
  spouseIncomeOther: number;
  currentLocationId: string;
  retirementLocationId: string;
  properties: RetirementProperty[];
  postRetirementMonthlyIncome: number;
  // Tax-advantaged & other investments (primary)
  monthly401k: number;              // pre-tax — reduces federal + state taxable income
  monthlyRothIRA: number;           // post-tax — deducted from net take-home
  monthlyOtherInvestment: number;   // post-tax — any additional (brokerage, HSA, etc.)
  // Spouse
  spouseMonthly401k: number;
  spouseMonthlyRothIRA: number;
  spouseMonthlyOtherInvestment: number;
}

export interface YearlyDataPoint {
  age: number;
  year: number;
  portfolioNominal: number;        // combined household portfolio
  portfolioReal: number;           // combined, inflation-adjusted
  portfolioNominalPrimary: number; // primary's solo accumulation (for chart breakdown)
  portfolioNominalSpouse: number;  // spouse's solo accumulation (for chart breakdown)
  annualContribution: number;
  withdrawalAmount: number;
  isRetirementYear: boolean;       // primary retires
  isSpouseRetirementYear: boolean; // spouse retires
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
