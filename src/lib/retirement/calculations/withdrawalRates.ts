import { RetirementInputs, SWRPoint } from '../types';
import { SWR_RATES, HOUSEHOLD_EXPENSE_MULTIPLIER } from '../constants';
import { getLocation, relativeLocationFactor } from '../data/locations';
import { getJointRetirementAge } from './portfolioGrowth';

export function computeSWRAnalysis(inputs: RetirementInputs): SWRPoint[] {
  const { retirementAnnualExpenses, householdType, numChildren, currentAge, inflationRate } = inputs;

  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;
  const locFactor = relativeLocationFactor(
    getLocation(inputs.currentLocationId),
    getLocation(inputs.retirementLocationId),
  );

  // Inflate expenses to the year when the LAST person retires
  const jointAge = getJointRetirementAge(inputs);
  const yearsToRetirement = jointAge - currentAge;
  const expAtRetirement = retirementAnnualExpenses * expMultiplier * locFactor * (1 + inflationRate) ** yearsToRetirement;

  return SWR_RATES.map(rate => ({
    rate,
    annualIncome: Math.round(expAtRetirement),
    corpusNeeded: Math.round(expAtRetirement / rate),
  }));
}
