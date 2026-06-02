import { RetirementInputs, YearlyDataPoint, RetirementCorpus } from '../types';
import { HOUSEHOLD_EXPENSE_MULTIPLIER } from '../constants';
import { getLocation, relativeLocationFactor } from '../data/locations';

export function calcRealReturn(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}

function educationLumpSum(inputs: RetirementInputs, age: number): number {
  if (inputs.householdType !== 'family' || inputs.numChildren === 0) return 0;
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
  const {
    currentAge, retirementAge, lifeExpectancy,
    currentSavings, monthlyContribution,
    spouseAge, spouseRetirementAge, spouseCurrentSavings, spouseMonthlyContribution,
    expectedReturnRate: r, inflationRate: π,
    retirementAnnualExpenses, householdType, numChildren, survivorBenefitRate,
  } = inputs;

  const isCouple = householdType === 'spouse' || householdType === 'family';
  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;
  const locFactor = relativeLocationFactor(
    getLocation(inputs.currentLocationId),
    getLocation(inputs.retirementLocationId),
  );

  // Both retire when the LATER of the two retires — full joint retirement
  // Withdrawals begin at primary retirement; spouse still contributes until their date
  const bothRetiredAge = isCouple
    ? retirementAge + Math.max(0, (spouseAge + (spouseRetirementAge - spouseAge)) - (currentAge + (retirementAge - currentAge)))
    : retirementAge;

  // Track primary and spouse portfolios independently for breakdown display
  let portfolioPrimary = currentSavings;
  let portfolioSpouse = isCouple ? spouseCurrentSavings : 0;

  const data: YearlyDataPoint[] = [];
  let depleted = false;

  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const t = age - currentAge;
    const spouseCurrentAge = spouseAge + t; // spouse's age this year

    const primaryRetired = age >= retirementAge;
    const spouseRetired = !isCouple || spouseCurrentAge >= spouseRetirementAge;

    // ── Contributions ─────────────────────────────────────────────────────
    const primaryContrib = primaryRetired ? 0 : monthlyContribution * 12;
    let spouseContrib = 0;
    if (isCouple && !spouseRetired) {
      spouseContrib = spouseMonthlyContribution * 12;
    }

    // Family: deduct child expenses during dependent years (from primary's budget)
    let childDeduction = 0;
    if (householdType === 'family') {
      const youngestAgeOut = currentAge + inputs.childExpenseYears;
      if (age < youngestAgeOut) {
        childDeduction = inputs.numChildren * inputs.childAnnualExpense;
      }
    }
    const edLump = educationLumpSum(inputs, age);

    const totalContrib = Math.max(0, primaryContrib + spouseContrib - childDeduction) - edLump;

    // ── Withdrawal ────────────────────────────────────────────────────────
    let withdrawal = 0;
    if (primaryRetired) {
      const yearsRetired = age - retirementAge;
      let baseExpenses = retirementAnnualExpenses * expMultiplier * locFactor;

      // After both are fully retired for 25+ years, apply survivor reduction
      if (isCouple && age > Math.max(currentAge, spouseAge) + 55) {
        baseExpenses *= survivorBenefitRate;
      }

      // While spouse is still working, they cover their share — net withdrawal is lower
      if (isCouple && !spouseRetired) {
        baseExpenses *= 0.6; // primary bears ~60% of household expenses while spouse works
      }

      withdrawal = baseExpenses * (1 + π) ** yearsRetired;
    }

    // ── Grow combined portfolio ───────────────────────────────────────────
    const combined = portfolioPrimary + portfolioSpouse;
    const newCombined = combined * (1 + r) + totalContrib - withdrawal;

    const isDepletionYear = newCombined < 0 && !depleted;
    if (isDepletionYear) depleted = true;

    const clampedCombined = Math.max(0, newCombined);

    // Keep individual portfolio breakdown proportional to their share
    const share = combined > 0 ? portfolioPrimary / combined : 0.5;
    portfolioPrimary = clampedCombined * share + primaryContrib * (1 - (isCouple ? 0.5 : 0));
    portfolioSpouse = clampedCombined * (1 - share);

    // Solo accumulation lines (no withdrawals, just show what each person contributes)
    const soloP = currentSavings * (1 + r) ** t + monthlyContribution * 12 * ((1 + r) ** t - 1) / r;
    const soloS = isCouple
      ? spouseCurrentSavings * (1 + r) ** t + spouseMonthlyContribution * 12 * ((1 + r) ** t - 1) / r
      : 0;

    data.push({
      age,
      year: new Date().getFullYear() + t,
      portfolioNominal: Math.round(clampedCombined),
      portfolioReal: Math.round(clampedCombined / (1 + π) ** t),
      portfolioNominalPrimary: Math.round(Math.max(0, soloP)),
      portfolioNominalSpouse: Math.round(Math.max(0, soloS)),
      annualContribution: Math.round(totalContrib),
      withdrawalAmount: Math.round(withdrawal),
      isRetirementYear: age === retirementAge,
      isSpouseRetirementYear: isCouple && spouseCurrentAge === spouseRetirementAge,
      isDepletionYear,
    });
  }

  return data;
}

export function computeCorpus(inputs: RetirementInputs, yearlyData: YearlyDataPoint[]): RetirementCorpus {
  const {
    retirementAge, retirementAnnualExpenses, expectedReturnRate,
    inflationRate, householdType, numChildren, currentAge,
    monthlyContribution, spouseMonthlyContribution, spouseCurrentSavings,
    spouseAge, spouseRetirementAge,
  } = inputs;

  const isCouple = householdType === 'spouse' || householdType === 'family';
  const expMultiplier = HOUSEHOLD_EXPENSE_MULTIPLIER[householdType]?.(numChildren) ?? 1;
  const locFactor = relativeLocationFactor(
    getLocation(inputs.currentLocationId),
    getLocation(inputs.retirementLocationId),
  );
  const yearsToRetirement = retirementAge - currentAge;
  const expAtRetirement = retirementAnnualExpenses * expMultiplier * locFactor * (1 + inflationRate) ** yearsToRetirement;
  const nominalNeeded = expAtRetirement / 0.04;

  const retirementPoint = yearlyData.find(d => d.age === retirementAge);
  const projectedAtRetirement = retirementPoint?.portfolioNominal ?? 0;
  const gap = projectedAtRetirement - nominalNeeded;

  // Total monthly savings = both people's contributions
  const totalMonthly = monthlyContribution + (isCouple ? spouseMonthlyContribution : 0);
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
