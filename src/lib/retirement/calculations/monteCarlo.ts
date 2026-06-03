import { RetirementInputs, MonteCarloResult } from '../types';
import { MONTE_CARLO, HOUSEHOLD_EXPENSE_MULTIPLIER } from '../constants';
import { getLocation, relativeLocationFactor } from '../data/locations';

function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.max(1e-10, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function runSingleSimulation(inputs: RetirementInputs): number[] {
  const {
    currentAge, retirementAge, lifeExpectancy,
    currentSavings, monthlyContribution,
    spouseAge, spouseRetirementAge, spouseCurrentSavings, spouseMonthlyContribution,
    expectedReturnRate, inflationRate, retirementAnnualExpenses,
    householdType, numChildren, survivorBenefitRate,
    properties, postRetirementMonthlyIncome,
  } = inputs;

  const isCouple = householdType === 'spouse' || householdType === 'family';
  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;
  const locFactor = relativeLocationFactor(
    getLocation(inputs.currentLocationId),
    getLocation(inputs.retirementLocationId),
  );

  let portfolio = currentSavings + (isCouple ? spouseCurrentSavings : 0);
  const history: number[] = [portfolio];

  for (let age = currentAge; age < lifeExpectancy; age++) {
    const t = age - currentAge;
    const spouseCurrentAge = spouseAge + t;
    const yearReturn = gaussianRandom(expectedReturnRate, MONTE_CARLO.returnStdDev);
    const yearInflation = gaussianRandom(inflationRate, MONTE_CARLO.inflationStdDev);

    const primaryRetired = age >= retirementAge;
    const spouseRetired = !isCouple || spouseCurrentAge >= spouseRetirementAge;

    const primaryContrib = primaryRetired ? 0 : monthlyContribution * 12;
    const spouseContrib = (isCouple && !spouseRetired) ? spouseMonthlyContribution * 12 : 0;

    // Property proceeds injected at retirement year
    if (age === retirementAge && properties?.length) {
      const yearsToRetirement = retirementAge - currentAge;
      portfolio += properties
        .filter(p => p.sellAtRetirement)
        .reduce((sum, p) => sum + p.currentValue * (1 + p.appreciationRate) ** yearsToRetirement, 0);
    }

    if (!primaryRetired) {
      portfolio = portfolio * (1 + yearReturn) + primaryContrib + spouseContrib;
    } else {
      const yearsRetired = age - retirementAge;
      let baseExpenses = retirementAnnualExpenses * expMultiplier * locFactor;
      if (isCouple && !spouseRetired) baseExpenses *= 0.6;
      if (yearsRetired > 25 && isCouple) baseExpenses *= survivorBenefitRate;
      const passiveIncome = (postRetirementMonthlyIncome ?? 0) * 12 * (1 + yearInflation) ** yearsRetired;
      const withdrawal = Math.max(0, baseExpenses * (1 + yearInflation) ** yearsRetired - passiveIncome);
      portfolio = portfolio * (1 + yearReturn) + spouseContrib - withdrawal;
      if (portfolio < 0) portfolio = 0;
    }

    history.push(Math.max(0, portfolio));
  }

  return history;
}

export function runMonteCarlo(inputs: RetirementInputs): MonteCarloResult {
  const { currentAge, lifeExpectancy } = inputs;
  const ages = Array.from({ length: lifeExpectancy - currentAge + 1 }, (_, i) => currentAge + i);
  const numYears = ages.length;

  const allRuns: number[][] = [];
  for (let i = 0; i < MONTE_CARLO.numSimulations; i++) {
    allRuns.push(runSingleSimulation(inputs));
  }

  const successCount = allRuns.filter(run => run[run.length - 1] > 0).length;
  const successRate = successCount / MONTE_CARLO.numSimulations;

  // Compute percentile bands by year
  const p10: number[] = [];
  const p25: number[] = [];
  const p50: number[] = [];
  const p75: number[] = [];
  const p90: number[] = [];

  for (let t = 0; t < numYears; t++) {
    const yearValues = allRuns.map(r => r[t] ?? 0).sort((a, b) => a - b);
    p10.push(Math.round(percentile(yearValues, 10)));
    p25.push(Math.round(percentile(yearValues, 25)));
    p50.push(Math.round(percentile(yearValues, 50)));
    p75.push(Math.round(percentile(yearValues, 75)));
    p90.push(Math.round(percentile(yearValues, 90)));
  }

  // Median depletion age among failed runs
  const failedRuns = allRuns.filter(run => run[run.length - 1] === 0);
  let medianDepletionAge: number | null = null;
  if (failedRuns.length > 0) {
    const depletionAges = failedRuns.map(run => {
      const firstZero = run.findIndex(v => v === 0);
      return firstZero >= 0 ? currentAge + firstZero : lifeExpectancy;
    }).sort((a, b) => a - b);
    medianDepletionAge = depletionAges[Math.floor(depletionAges.length / 2)];
  }

  return { successRate, p10, p25, p50, p75, p90, medianDepletionAge, ages };
}
