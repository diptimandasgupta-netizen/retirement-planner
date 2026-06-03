import { RetirementInputs, FIREMetrics, FIREType } from '../types';
import { HOUSEHOLD_EXPENSE_MULTIPLIER } from '../constants';
import { getLocation, relativeLocationFactor } from '../data/locations';

// Tier expense scaling — mirrors the Retire When? scenarios exactly
export const FIRE_TIER_EXPENSE_SCALE = {
  lean:    0.80,   // frugal: 80% of planned retirement spending → 5% SWR → 20× corpus
  regular: 1.00,   // as planned → 4% SWR → 25× corpus
  fat:     1.25,   // generous: 125% of planned → 3% SWR → 33× corpus
};

// SWR per tier (inverse of corpus multiple, used for annotation)
export const FIRE_TIER_SWR = { lean: 0.05, regular: 0.04, fat: 0.03 };

// Corpus multiple per tier
export const FIRE_TIER_MULTIPLE = { lean: 20, regular: 25, fat: 33 };

export function computeFIRE(inputs: RetirementInputs): FIREMetrics {
  const {
    currentAge, currentSavings, monthlyContribution, spouseMonthlyContribution,
    expectedReturnRate,
    retirementAnnualExpenses,   // ← use actual planned retirement spending (same as withdrawal calc)
    householdType, numChildren,
    currentLocationId, retirementLocationId,
  } = inputs;

  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;
  const locFactor = relativeLocationFactor(
    getLocation(currentLocationId),
    getLocation(retirementLocationId),
  );

  // Base: planned retirement spending adjusted for household size + location
  const baseAnnualExpenses = retirementAnnualExpenses * expMultiplier * locFactor;

  // Each tier uses its own expense level — Lean spends less, Fat spends more
  const leanExpenses    = baseAnnualExpenses * FIRE_TIER_EXPENSE_SCALE.lean;
  const regularExpenses = baseAnnualExpenses * FIRE_TIER_EXPENSE_SCALE.regular;
  const fatExpenses     = baseAnnualExpenses * FIRE_TIER_EXPENSE_SCALE.fat;

  const leanFIRENumber    = leanExpenses    * FIRE_TIER_MULTIPLE.lean;    // 0.8 × 20 = 16× base
  const regularFIRENumber = regularExpenses * FIRE_TIER_MULTIPLE.regular; // 1.0 × 25 = 25× base
  const fatFIRENumber     = fatExpenses     * FIRE_TIER_MULTIPLE.fat;     // 1.25 × 33 ≈ 41× base

  let totalMonthlyContrib = monthlyContribution;
  if (householdType === 'spouse' || householdType === 'family') {
    totalMonthlyContrib += spouseMonthlyContribution;
  }
  const annualContrib = totalMonthlyContrib * 12;

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
  if      (startingPortfolio >= fatFIRENumber)     currentFIREStatus = 'fat';
  else if (startingPortfolio >= regularFIRENumber) currentFIREStatus = 'regular';
  else if (startingPortfolio >= leanFIRENumber)    currentFIREStatus = 'lean';

  return {
    adjustedAnnualExpenses: Math.round(regularExpenses), // "regular" tier as the representative expense level
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
