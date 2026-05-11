import { RetirementInputs, SWRPoint } from '../types';
import { SWR_RATES, HOUSEHOLD_EXPENSE_MULTIPLIER } from '../constants';

export function computeSWRAnalysis(inputs: RetirementInputs): SWRPoint[] {
  const { retirementAnnualExpenses, householdType, numChildren, retirementAge, currentAge, inflationRate } = inputs;

  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;
  const yearsToRetirement = retirementAge - currentAge;
  const expAtRetirement = retirementAnnualExpenses * expMultiplier * (1 + inflationRate) ** yearsToRetirement;

  return SWR_RATES.map(rate => ({
    rate,
    annualIncome: Math.round(expAtRetirement),
    corpusNeeded: Math.round(expAtRetirement / rate),
  }));
}
