import { RetirementInputs, YearlyDataPoint, RetirementCorpus } from '../types';
import { HOUSEHOLD_EXPENSE_MULTIPLIER } from '../constants';

function pvifa(r: number, n: number): number {
  if (r === 0) return n;
  return ((1 + r) ** n - 1) / r;
}

export function calcRealReturn(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}

function annualContributionForYear(inputs: RetirementInputs, age: number): number {
  let contrib = inputs.monthlyContribution * 12;

  if (inputs.householdType === 'spouse' || inputs.householdType === 'family') {
    contrib += inputs.spouseMonthlyContribution * 12;
  }

  if (inputs.householdType === 'family') {
    // Deduct child expenses while children are dependents
    const childExpense = inputs.numChildren * inputs.childAnnualExpense;
    const youngestChildAgeOut = inputs.currentAge + inputs.childExpenseYears;
    if (age < youngestChildAgeOut) {
      contrib = Math.max(0, contrib - childExpense);
    }
  }

  return contrib;
}

function educationLumpSum(inputs: RetirementInputs, age: number): number {
  if (inputs.householdType !== 'family' || inputs.numChildren === 0) return 0;
  // Each child goes to college at currentAge + 18
  // Simplification: spread education cost over ages currentAge+16 to currentAge+20
  // We deduct for child 1 at currentAge+18, child 2 at currentAge+21, etc.
  let deduction = 0;
  for (let i = 0; i < inputs.numChildren; i++) {
    const collegeAge = inputs.currentAge + 18 + i * 4;
    if (age === collegeAge) {
      deduction += inputs.educationCostPerChild * (1 + inputs.inflationRate) ** (collegeAge - inputs.currentAge);
    }
  }
  return deduction;
}

export function computeYearlyData(inputs: RetirementInputs): YearlyDataPoint[] {
  const { currentAge, retirementAge, lifeExpectancy, currentSavings, expectedReturnRate, inflationRate, annualExpenses, retirementAnnualExpenses, householdType, numChildren, survivorBenefitRate } = inputs;

  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;
  const r = expectedReturnRate;
  const π = inflationRate;

  let portfolio = currentSavings;
  const data: YearlyDataPoint[] = [];
  let depleted = false;
  let depletionAge: number | null = null;

  const jointLifeExpectancy = householdType === 'spouse' || householdType === 'family'
    ? Math.max(inputs.currentAge, inputs.spouseAge) + 30   // approx joint survival
    : null;

  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const t = age - currentAge;
    const isRetirement = age === retirementAge;
    const inRetirement = age >= retirementAge;

    let annualContrib = 0;
    let withdrawal = 0;

    if (!inRetirement) {
      annualContrib = annualContributionForYear(inputs, age);
      const edLump = educationLumpSum(inputs, age);
      portfolio = portfolio * (1 + r) + annualContrib - edLump;
    } else {
      // Withdrawal = inflation-adjusted retirement expenses * household multiplier
      const yearsRetired = age - retirementAge;
      let baseExpenses = retirementAnnualExpenses * expMultiplier;

      // After survivor event (approx joint life expectancy), reduce expenses
      if (jointLifeExpectancy && age > jointLifeExpectancy) {
        baseExpenses *= survivorBenefitRate;
      }

      withdrawal = baseExpenses * (1 + π) ** yearsRetired;
      portfolio = portfolio * (1 + r) - withdrawal;
    }

    const isDepletionYear = portfolio < 0 && !depleted;
    if (isDepletionYear) {
      depletionAge = age;
      depleted = true;
    }

    portfolio = Math.max(0, portfolio);

    data.push({
      age,
      year: new Date().getFullYear() + t,
      portfolioNominal: Math.round(portfolio),
      portfolioReal: Math.round(portfolio / (1 + π) ** t),
      annualContribution: Math.round(annualContrib),
      withdrawalAmount: Math.round(withdrawal),
      isRetirementYear: isRetirement,
      isDepletionYear: isDepletionYear,
    });
  }

  return data;
}

export function computeCorpus(inputs: RetirementInputs, yearlyData: YearlyDataPoint[]): RetirementCorpus {
  const { retirementAge, retirementAnnualExpenses, expectedReturnRate, inflationRate, householdType, numChildren, currentAge, monthlyContribution, spouseMonthlyContribution } = inputs;

  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;
  const yearsToRetirement = retirementAge - currentAge;
  const expAtRetirement = retirementAnnualExpenses * expMultiplier * (1 + inflationRate) ** yearsToRetirement;
  const nominalNeeded = expAtRetirement / 0.04; // 4% SWR baseline

  const retirementPoint = yearlyData.find(d => d.age === retirementAge);
  const projectedAtRetirement = retirementPoint?.portfolioNominal ?? 0;

  const gap = projectedAtRetirement - nominalNeeded;

  // Monthly savings needed to close gap: gap / FVIFA(r/12, n*12)
  const monthlyRate = expectedReturnRate / 12;
  const nMonths = yearsToRetirement * 12;
  const fvifa = nMonths === 0 ? 1 : ((1 + monthlyRate) ** nMonths - 1) / monthlyRate;
  const additionalMonthlySavingsNeeded = gap < 0 ? Math.abs(gap) / fvifa : 0;

  return {
    nominalNeeded: Math.round(nominalNeeded),
    projectedAtRetirement: Math.round(projectedAtRetirement),
    gap: Math.round(gap),
    additionalMonthlySavingsNeeded: Math.round(additionalMonthlySavingsNeeded),
  };
}
