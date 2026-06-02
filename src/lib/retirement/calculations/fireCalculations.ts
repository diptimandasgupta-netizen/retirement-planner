import { RetirementInputs, FIREMetrics, FIREType } from '../types';
import { FIRE_MULTIPLIERS, HOUSEHOLD_EXPENSE_MULTIPLIER } from '../constants';
import { getLocation, relativeLocationFactor } from '../data/locations';

export function computeFIRE(inputs: RetirementInputs): FIREMetrics {
  const {
    currentAge, currentSavings, monthlyContribution, spouseMonthlyContribution,
    expectedReturnRate, annualExpenses, householdType, numChildren,
    currentLocationId, retirementLocationId,
  } = inputs;

  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;

  // Apply relative location factor: expenses entered in current-location terms,
  // FIRE numbers must reflect what it costs to live at the retirement destination.
  const locFactor = relativeLocationFactor(
    getLocation(currentLocationId),
    getLocation(retirementLocationId),
  );

  const adjustedAnnualExpenses = annualExpenses * expMultiplier * locFactor;

  const leanFIRENumber    = adjustedAnnualExpenses * FIRE_MULTIPLIERS.lean;
  const regularFIRENumber = adjustedAnnualExpenses * FIRE_MULTIPLIERS.regular;
  const fatFIRENumber     = adjustedAnnualExpenses * FIRE_MULTIPLIERS.fat;

  let totalMonthlyContrib = monthlyContribution;
  if (householdType === 'spouse' || householdType === 'family') {
    totalMonthlyContrib += spouseMonthlyContribution;
  }
  const annualContrib = totalMonthlyContrib * 12;

  // Also include spouse savings in the starting portfolio for couple modes
  const startingPortfolio = currentSavings +
    ((householdType === 'spouse' || householdType === 'family') ? inputs.spouseCurrentSavings : 0);

  function yearsToTarget(target: number): number | null {
    if (startingPortfolio >= target) return 0;
    let portfolio = startingPortfolio;
    for (let year = 1; year <= 80; year++) {
      portfolio = portfolio * (1 + expectedReturnRate) + annualContrib;
      if (portfolio >= target) return year;
    }
    return null;
  }

  const yearsToLean    = yearsToTarget(leanFIRENumber);
  const yearsToRegular = yearsToTarget(regularFIRENumber);
  const yearsToFat     = yearsToTarget(fatFIRENumber);

  let currentFIREStatus: FIREType | null = null;
  if (startingPortfolio >= fatFIRENumber)     currentFIREStatus = 'fat';
  else if (startingPortfolio >= regularFIRENumber) currentFIREStatus = 'regular';
  else if (startingPortfolio >= leanFIRENumber)    currentFIREStatus = 'lean';

  return {
    adjustedAnnualExpenses: Math.round(adjustedAnnualExpenses),
    leanFIRENumber:    Math.round(leanFIRENumber),
    regularFIRENumber: Math.round(regularFIRENumber),
    fatFIRENumber:     Math.round(fatFIRENumber),
    yearsToLeanFIRE:    yearsToLean,
    yearsToRegularFIRE: yearsToRegular,
    yearsToFatFIRE:     yearsToFat,
    ageAtLeanFIRE:    yearsToLean    !== null ? currentAge + yearsToLean    : null,
    ageAtRegularFIRE: yearsToRegular !== null ? currentAge + yearsToRegular : null,
    ageAtFatFIRE:     yearsToFat     !== null ? currentAge + yearsToFat     : null,
    currentFIREStatus,
  };
}
