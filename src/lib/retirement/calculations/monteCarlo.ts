import { RetirementInputs, MonteCarloResult } from '../types';
import { MONTE_CARLO, HOUSEHOLD_EXPENSE_MULTIPLIER } from '../constants';

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
  const { currentAge, retirementAge, lifeExpectancy, currentSavings, expectedReturnRate, inflationRate, retirementAnnualExpenses, householdType, numChildren, monthlyContribution, spouseMonthlyContribution, survivorBenefitRate } = inputs;

  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;
  let totalMonthlyContrib = monthlyContribution;
  if (householdType === 'spouse' || householdType === 'family') {
    totalMonthlyContrib += spouseMonthlyContribution;
  }
  const annualContrib = totalMonthlyContrib * 12;

  let portfolio = currentSavings;
  const history: number[] = [portfolio];

  for (let age = currentAge; age < lifeExpectancy; age++) {
    const yearReturn = gaussianRandom(expectedReturnRate, MONTE_CARLO.returnStdDev);
    const yearInflation = gaussianRandom(inflationRate, MONTE_CARLO.inflationStdDev);

    if (age < retirementAge) {
      portfolio = portfolio * (1 + yearReturn) + annualContrib;
    } else {
      const yearsRetired = age - retirementAge;
      let baseExpenses = retirementAnnualExpenses * expMultiplier;
      // After survivor age (approx 25 years into retirement), reduce
      if (yearsRetired > 25 && (householdType === 'spouse' || householdType === 'family')) {
        baseExpenses *= survivorBenefitRate;
      }
      const withdrawal = baseExpenses * (1 + yearInflation) ** yearsRetired;
      portfolio = portfolio * (1 + yearReturn) - withdrawal;
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
