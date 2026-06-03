import { RetirementInputs } from '../types';
import { HOUSEHOLD_EXPENSE_MULTIPLIER } from '../constants';
import { getLocation, relativeLocationFactor } from '../data/locations';
import { computeFIRE, FIRE_TIER_EXPENSE_SCALE } from './fireCalculations';

export interface RetirementScenario {
  tier: 'lean' | 'regular' | 'fat';
  label: string;
  swrRate: number;
  multiplier: number;
  suggestedAge: number | null;       // earliest age where portfolio survives to lifeExpectancy
  portfolioAtSuggestedAge: number;
  corpusNeededAtSuggestedAge: number;
  yearsVsTarget: number;             // negative = earlier, positive = later than target
  alreadyPossible: boolean;          // portfolio already exceeds corpus at current age
}

export interface SuggestedRetirementResult {
  scenarios: RetirementScenario[];
  earliestAnyTier: number | null;
  constraintDriver: 'savings' | 'expenses' | 'balanced';
  monthlyInvestmentToHitTarget: number;
  expenseReductionToHitTarget: number;
  projectedSavingsRateNeeded: number;
  locationFactor: number;                 // relative COL × tax factor applied
  currentLocationName: string;
  retirementLocationName: string;
  locationImpactPct: number;              // % change in expenses due to location move
}

/** Simulate the portfolio from currentAge to lifeExpectancy with a given retirement age */
function simulatePortfolio(inputs: RetirementInputs, testRetirementAge: number): {
  portfolioAtRetirement: number;
  survivesToEnd: boolean;
  depletionAge: number | null;
} {
  const {
    currentAge, lifeExpectancy, currentSavings, expectedReturnRate: r, inflationRate: π,
    retirementAnnualExpenses, monthlyContribution, spouseMonthlyContribution,
    spouseAge, spouseRetirementAge, spouseCurrentSavings,
    householdType, numChildren, survivorBenefitRate,
    currentLocationId, retirementLocationId,
    properties, postRetirementMonthlyIncome,
  } = inputs;

  const isCouple = householdType === 'spouse' || householdType === 'family';
  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;
  const locFactor = relativeLocationFactor(getLocation(currentLocationId), getLocation(retirementLocationId));

  let portfolio = currentSavings + (isCouple ? spouseCurrentSavings : 0);
  let portfolioAtRetirement = 0;
  let depletionAge: number | null = null;

  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const t = age - currentAge;
    const spouseCurrentAge = spouseAge + t;
    const primaryRetired = age >= testRetirementAge;
    const spouseRetired = !isCouple || spouseCurrentAge >= spouseRetirementAge;

    const primaryContrib = primaryRetired ? 0 : monthlyContribution * 12;
    const spouseContrib  = (isCouple && !spouseRetired) ? spouseMonthlyContribution * 12 : 0;

    // Property proceeds at test retirement year
    if (age === testRetirementAge && properties?.length) {
      const yearsToRetirement = testRetirementAge - currentAge;
      portfolio += properties
        .filter(p => p.sellAtRetirement)
        .reduce((sum, p) => sum + p.currentValue * (1 + p.appreciationRate) ** yearsToRetirement, 0);
    }

    if (!primaryRetired) {
      portfolio = portfolio * (1 + r) + primaryContrib + spouseContrib;
    } else {
      if (age === testRetirementAge) portfolioAtRetirement = portfolio;
      const yearsRetired = age - testRetirementAge;
      let baseExpenses = retirementAnnualExpenses * expMultiplier * locFactor;
      if (isCouple && !spouseRetired) baseExpenses *= 0.6;
      if (isCouple && age > Math.max(currentAge, spouseAge) + 55) baseExpenses *= survivorBenefitRate;
      const passiveIncome = (postRetirementMonthlyIncome ?? 0) * 12 * (1 + π) ** yearsRetired;
      const withdrawal = Math.max(0, baseExpenses * (1 + π) ** yearsRetired - passiveIncome);
      portfolio = portfolio * (1 + r) + spouseContrib - withdrawal;
      if (portfolio < 0 && depletionAge === null) depletionAge = age;
      portfolio = Math.max(0, portfolio);
    }
  }

  return {
    portfolioAtRetirement,
    survivesToEnd: depletionAge === null,
    depletionAge,
  };
}

/** Find the earliest retirement age (starting from minAge) at which the portfolio survives */
function findEarliestRetirementAge(inputs: RetirementInputs, minAge: number): {
  age: number | null;
  portfolioAtAge: number;
  corpusNeeded: number;
} {
  const { currentAge } = inputs;

  for (let testAge = minAge; testAge <= 80; testAge++) {
    const result = simulatePortfolio(inputs, testAge);
    if (result.survivesToEnd) {
      // corpusNeeded is filled in by the caller from FIRE tab numbers — return 0 here as placeholder
      return { age: testAge, portfolioAtAge: result.portfolioAtRetirement, corpusNeeded: 0 };
    }
  }
  return { age: null, portfolioAtAge: 0, corpusNeeded: 0 };
}

/** Binary-search the monthly contribution needed to retire at a specific age */
function findContributionForAge(inputs: RetirementInputs, targetAge: number): number {
  let lo = 0, hi = 50000;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const result = simulatePortfolio({ ...inputs, monthlyContribution: mid }, targetAge);
    if (result.survivesToEnd) hi = mid; else lo = mid;
  }
  return Math.max(0, Math.round(hi - inputs.monthlyContribution));
}

/** Binary-search the retirement expense reduction needed to retire at a specific age */
function findExpenseReductionForAge(inputs: RetirementInputs, targetAge: number): number {
  const current = inputs.retirementAnnualExpenses / 12;
  let lo = 0, hi = current;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const testMonthly = current - mid;
    const result = simulatePortfolio(
      { ...inputs, retirementAnnualExpenses: testMonthly * 12 },
      targetAge
    );
    if (result.survivesToEnd) hi = mid; else lo = mid;
  }
  return Math.max(0, Math.round(lo));
}

export function computeSuggestedRetirement(inputs: RetirementInputs): SuggestedRetirementResult {
  const { currentAge, retirementAge, monthlyContribution, spouseMonthlyContribution, currentLocationId, retirementLocationId } = inputs;
  const minSearchAge = Math.max(currentAge + 1, 35);
  const locFactor = relativeLocationFactor(getLocation(currentLocationId), getLocation(retirementLocationId));

  // ── Use the EXACT same FIRE numbers as the FIRE tab ─────────────────────
  const fire = computeFIRE(inputs);
  const fireNumbers = {
    lean:    fire.leanFIRENumber,
    regular: fire.regularFIRENumber,
    fat:     fire.fatFIRENumber,
  };

  const tiers: Array<{ tier: 'lean' | 'regular' | 'fat'; label: string; swrRate: number; multiplier: number; expenseScale: number }> = [
    { tier: 'lean',    label: 'Lean FIRE',    swrRate: 0.05, multiplier: 20, expenseScale: FIRE_TIER_EXPENSE_SCALE.lean    },
    { tier: 'regular', label: 'Regular FIRE', swrRate: 0.04, multiplier: 25, expenseScale: FIRE_TIER_EXPENSE_SCALE.regular },
    { tier: 'fat',     label: 'Fat FIRE',     swrRate: 0.03, multiplier: 33, expenseScale: FIRE_TIER_EXPENSE_SCALE.fat     },
  ];

  const scenarios: RetirementScenario[] = tiers.map(({ tier, label, swrRate, multiplier, expenseScale }) => {
    // Scale retirement expenses to match this tier (same as fireCalculations)
    const scaledInputs: RetirementInputs = {
      ...inputs,
      retirementAnnualExpenses: inputs.retirementAnnualExpenses * expenseScale,
    };

    const found = findEarliestRetirementAge(scaledInputs, minSearchAge);
    const alreadyPossible = found.age !== null && found.age <= currentAge;

    // Corpus needed = the FIRE number for this tier (same value shown in FIRE tab)
    const corpusNeeded = fireNumbers[tier];

    return {
      tier,
      label,
      swrRate,
      multiplier,
      suggestedAge: found.age,
      portfolioAtSuggestedAge: found.portfolioAtAge,
      corpusNeededAtSuggestedAge: corpusNeeded,   // ← now matches FIRE tab exactly
      yearsVsTarget: found.age !== null ? found.age - retirementAge : 0,
      alreadyPossible,
    };
  });

  // Constraint driver: compare income-side vs expense-side sensitivity
  const baseAge = scenarios.find(s => s.tier === 'regular')?.suggestedAge ?? retirementAge;
  const highIncomeResult = findEarliestRetirementAge(
    { ...inputs, monthlyContribution: inputs.monthlyContribution * 1.5 },
    minSearchAge
  );
  const lowExpenseResult = findEarliestRetirementAge(
    { ...inputs, retirementAnnualExpenses: inputs.retirementAnnualExpenses * 0.8 },
    minSearchAge
  );

  const incomeImprovement  = baseAge ? baseAge - (highIncomeResult.age ?? baseAge) : 0;
  const expenseImprovement = baseAge ? baseAge - (lowExpenseResult.age ?? baseAge) : 0;

  let constraintDriver: 'savings' | 'expenses' | 'balanced' = 'balanced';
  if (incomeImprovement > expenseImprovement + 2) constraintDriver = 'savings';
  else if (expenseImprovement > incomeImprovement + 2) constraintDriver = 'expenses';

  // How much extra monthly investment needed to hit user's target
  const regularResult = simulatePortfolio(inputs, retirementAge);
  const monthlyInvestmentToHitTarget = regularResult.survivesToEnd
    ? 0
    : findContributionForAge(inputs, retirementAge);

  const expenseReductionToHitTarget = regularResult.survivesToEnd
    ? 0
    : findExpenseReductionForAge(inputs, retirementAge);

  // Savings rate needed
  const totalMonthlyIncome = 8700; // fallback; ideally passed in from income breakdown
  const totalContrib = monthlyContribution + spouseMonthlyContribution;
  const projectedSavingsRateNeeded = totalMonthlyIncome > 0
    ? Math.round(((totalContrib + monthlyInvestmentToHitTarget) / totalMonthlyIncome) * 100)
    : 0;

  const earliestAnyTier = scenarios
    .map(s => s.suggestedAge)
    .filter((a): a is number => a !== null)
    .reduce((min, a) => Math.min(min, a), Infinity);

  const currentLoc    = getLocation(currentLocationId);
  const retirementLoc = getLocation(retirementLocationId);

  return {
    scenarios,
    earliestAnyTier: earliestAnyTier === Infinity ? null : earliestAnyTier,
    constraintDriver,
    monthlyInvestmentToHitTarget,
    expenseReductionToHitTarget,
    projectedSavingsRateNeeded,
    locationFactor: locFactor,
    currentLocationName: currentLoc.name,
    retirementLocationName: retirementLoc.name,
    locationImpactPct: Math.round((locFactor - 1) * 100),
  };
}
