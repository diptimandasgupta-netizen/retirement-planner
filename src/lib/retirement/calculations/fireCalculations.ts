import { RetirementInputs, FIREMetrics, FIREType } from '../types';
import { FIRE_MULTIPLIERS, HOUSEHOLD_EXPENSE_MULTIPLIER } from '../constants';

export function computeFIRE(inputs: RetirementInputs): FIREMetrics {
  const { currentAge, currentSavings, monthlyContribution, spouseMonthlyContribution, expectedReturnRate, annualExpenses, householdType, numChildren } = inputs;

  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;
  const adjustedAnnualExpenses = annualExpenses * expMultiplier;

  const leanFIRENumber = adjustedAnnualExpenses * FIRE_MULTIPLIERS.lean;
  const regularFIRENumber = adjustedAnnualExpenses * FIRE_MULTIPLIERS.regular;
  const fatFIRENumber = adjustedAnnualExpenses * FIRE_MULTIPLIERS.fat;

  let totalMonthlyContrib = monthlyContribution;
  if (householdType === 'spouse' || householdType === 'family') {
    totalMonthlyContrib += spouseMonthlyContribution;
  }
  const annualContrib = totalMonthlyContrib * 12;

  function yearsToTarget(target: number): number | null {
    if (currentSavings >= target) return 0;
    let portfolio = currentSavings;
    for (let year = 1; year <= 80; year++) {
      portfolio = portfolio * (1 + expectedReturnRate) + annualContrib;
      if (portfolio >= target) return year;
    }
    return null;
  }

  const yearsToLean = yearsToTarget(leanFIRENumber);
  const yearsToRegular = yearsToTarget(regularFIRENumber);
  const yearsToFat = yearsToTarget(fatFIRENumber);

  let currentFIREStatus: FIREType | null = null;
  if (currentSavings >= fatFIRENumber) currentFIREStatus = 'fat';
  else if (currentSavings >= regularFIRENumber) currentFIREStatus = 'regular';
  else if (currentSavings >= leanFIRENumber) currentFIREStatus = 'lean';

  return {
    adjustedAnnualExpenses: Math.round(adjustedAnnualExpenses),
    leanFIRENumber: Math.round(leanFIRENumber),
    regularFIRENumber: Math.round(regularFIRENumber),
    fatFIRENumber: Math.round(fatFIRENumber),
    yearsToLeanFIRE: yearsToLean,
    yearsToRegularFIRE: yearsToRegular,
    yearsToFatFIRE: yearsToFat,
    ageAtLeanFIRE: yearsToLean !== null ? currentAge + yearsToLean : null,
    ageAtRegularFIRE: yearsToRegular !== null ? currentAge + yearsToRegular : null,
    ageAtFatFIRE: yearsToFat !== null ? currentAge + yearsToFat : null,
    currentFIREStatus,
  };
}
