import { RetirementInputs, SWRPoint } from '../types';
import { SWR_RATES, HOUSEHOLD_EXPENSE_MULTIPLIER } from '../constants';
import { getLocation, relativeLocationFactor } from '../data/locations';

export function computeSWRAnalysis(inputs: RetirementInputs): SWRPoint[] {
  const { retirementAnnualExpenses, householdType, numChildren, retirementAge, currentAge, inflationRate } = inputs;

  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;
  const locFactor = relativeLocationFactor(
    getLocation(inputs.currentLocationId),
    getLocation(inputs.retirementLocationId),
  );
  const yearsToRetirement = retirementAge - currentAge;
  const expAtRetirement = retirementAnnualExpenses * expMultiplier * locFactor * (1 + inflationRate) ** yearsToRetirement;

  return SWR_RATES.map(rate => ({
    rate,
    annualIncome: Math.round(expAtRetirement),
    corpusNeeded: Math.round(expAtRetirement / rate),
  }));
}
