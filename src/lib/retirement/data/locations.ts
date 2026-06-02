export interface RetirementLocation {
  id: string;
  name: string;
  region: string;          // state abbreviation or country
  country: 'US' | 'International';
  colIndex: number;        // Cost-of-living vs US national average (100 = average)
  stateTaxRate: number;    // Marginal state/local income tax on retirement income (decimal)
  taxesSocialSecurity: boolean;
  healthcareMultiplier: number; // Relative to US national average
  notes: string;
}

// Federal effective tax rate assumption for typical middle-income retiree
export const FEDERAL_EFFECTIVE_TAX_RATE = 0.12;

/** Absolute adjustment factor for a single location (used as fallback).
 *  Factor = (COL / 100) × tax-gross-up
 */
export function locationAdjustmentFactor(loc: RetirementLocation): number {
  const combinedTax = Math.min(0.5, FEDERAL_EFFECTIVE_TAX_RATE + loc.stateTaxRate);
  const taxGrossUp  = 1 / (1 - combinedTax);
  return (loc.colIndex / 100) * taxGrossUp;
}

/** Relative adjustment factor: expenses entered at currentLoc's COL,
 *  adjusted to what they'll cost in retirementLoc after local taxes.
 *
 *  Factor = (retirementCOL / currentCOL) × retirementTaxGrossUp
 *
 *  Example: living in NYC (148), retiring to Florida (107, 0% tax):
 *    factor = (107/148) × (1/0.88) ≈ 0.82  →  retirement costs 18% less
 */
export function relativeLocationFactor(
  current: RetirementLocation,
  retirement: RetirementLocation,
): number {
  const retirementTax = Math.min(0.5, FEDERAL_EFFECTIVE_TAX_RATE + retirement.stateTaxRate);
  const taxGrossUp    = 1 / (1 - retirementTax);
  return (retirement.colIndex / current.colIndex) * taxGrossUp;
}

export const LOCATIONS: RetirementLocation[] = [
  // ── US States ──────────────────────────────────────────────────────────────
  {
    id: 'us-national',  name: 'US National Average', region: 'US', country: 'US',
    colIndex: 100, stateTaxRate: 0.05, taxesSocialSecurity: false,
    healthcareMultiplier: 1.0, notes: 'Baseline — average across all US states',
  },
  {
    id: 'fl', name: 'Florida', region: 'FL', country: 'US',
    colIndex: 107, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 1.02, notes: 'No state income tax; warm climate; popular retirement hub',
  },
  {
    id: 'tx', name: 'Texas', region: 'TX', country: 'US',
    colIndex: 93, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.98, notes: 'No state income tax; no state taxes on retirement income',
  },
  {
    id: 'nv', name: 'Nevada', region: 'NV', country: 'US',
    colIndex: 114, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 1.00, notes: 'No state income tax; Las Vegas, Reno metro areas',
  },
  {
    id: 'wa', name: 'Washington', region: 'WA', country: 'US',
    colIndex: 131, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 1.05, notes: 'No state income tax; higher COL especially Seattle area',
  },
  {
    id: 'tn', name: 'Tennessee', region: 'TN', country: 'US',
    colIndex: 88, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.93, notes: 'No income tax; low COL; Nashville & Smoky Mountains',
  },
  {
    id: 'az', name: 'Arizona', region: 'AZ', country: 'US',
    colIndex: 106, stateTaxRate: 0.025, taxesSocialSecurity: false,
    healthcareMultiplier: 1.01, notes: 'Flat 2.5% income tax; warm dry climate; Scottsdale, Tucson',
  },
  {
    id: 'sc', name: 'South Carolina', region: 'SC', country: 'US',
    colIndex: 89, stateTaxRate: 0.064, taxesSocialSecurity: false,
    healthcareMultiplier: 0.91, notes: 'Retirement income deduction up to $15K; coastal towns',
  },
  {
    id: 'nc', name: 'North Carolina', region: 'NC', country: 'US',
    colIndex: 93, stateTaxRate: 0.0525, taxesSocialSecurity: false,
    healthcareMultiplier: 0.95, notes: 'Flat 5.25% rate; military/govt pensions exempt; Asheville',
  },
  {
    id: 'ga', name: 'Georgia', region: 'GA', country: 'US',
    colIndex: 95, stateTaxRate: 0.055, taxesSocialSecurity: false,
    healthcareMultiplier: 0.95, notes: 'Retirement exclusion up to $65K; mild climate; Savannah',
  },
  {
    id: 'co', name: 'Colorado', region: 'CO', country: 'US',
    colIndex: 130, stateTaxRate: 0.044, taxesSocialSecurity: false,
    healthcareMultiplier: 1.07, notes: 'Flat 4.4%; pension exclusion up to $24K; outdoor lifestyle',
  },
  {
    id: 'pa', name: 'Pennsylvania', region: 'PA', country: 'US',
    colIndex: 100, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.97, notes: 'No tax on retirement income (SS, pensions, 401k); flat 3.07% on wages only',
  },
  {
    id: 'ms', name: 'Mississippi', region: 'MS', country: 'US',
    colIndex: 83, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.88, notes: 'No tax on retirement income; lowest COL in the US',
  },
  {
    id: 'al', name: 'Alabama', region: 'AL', country: 'US',
    colIndex: 85, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.89, notes: 'SS, pensions, 401k exempt from tax; low COL',
  },
  {
    id: 'ny', name: 'New York', region: 'NY', country: 'US',
    colIndex: 148, stateTaxRate: 0.0685, taxesSocialSecurity: false,
    healthcareMultiplier: 1.20, notes: 'High COL; NYC adds further 3.876% city tax; SS exempt from state tax',
  },
  {
    id: 'ca', name: 'California', region: 'CA', country: 'US',
    colIndex: 149, stateTaxRate: 0.093, taxesSocialSecurity: false,
    healthcareMultiplier: 1.18, notes: 'Highest state income tax; SS exempt; high COL statewide',
  },
  {
    id: 'ma', name: 'Massachusetts', region: 'MA', country: 'US',
    colIndex: 150, stateTaxRate: 0.05, taxesSocialSecurity: false,
    healthcareMultiplier: 1.15, notes: 'Flat 5%; SS exempt; high COL; strong healthcare system',
  },
  {
    id: 'or', name: 'Oregon', region: 'OR', country: 'US',
    colIndex: 133, stateTaxRate: 0.099, taxesSocialSecurity: false,
    healthcareMultiplier: 1.08, notes: 'High state tax up to 9.9%; SS exempt; no sales tax',
  },
  {
    id: 'mn', name: 'Minnesota', region: 'MN', country: 'US',
    colIndex: 107, stateTaxRate: 0.0785, taxesSocialSecurity: true,
    healthcareMultiplier: 1.08, notes: 'Taxes Social Security; high tax on retirement income',
  },
  {
    id: 'va', name: 'Virginia', region: 'VA', country: 'US',
    colIndex: 115, stateTaxRate: 0.0575, taxesSocialSecurity: false,
    healthcareMultiplier: 1.02, notes: '$12K exemption age 65+; good healthcare infrastructure',
  },
  {
    id: 'hi', name: 'Hawaii', region: 'HI', country: 'US',
    colIndex: 192, stateTaxRate: 0.079, taxesSocialSecurity: false,
    healthcareMultiplier: 1.22, notes: 'Highest COL in US; SS and pensions exempt from state tax',
  },

  // ── International ──────────────────────────────────────────────────────────
  {
    id: 'pt', name: 'Portugal', region: 'Europe', country: 'International',
    colIndex: 72, stateTaxRate: 0.10, taxesSocialSecurity: false,
    healthcareMultiplier: 0.65, notes: 'NHR tax regime (10% flat for 10 yrs); Lisbon, Porto, Algarve; EU healthcare',
  },
  {
    id: 'es', name: 'Spain', region: 'Europe', country: 'International',
    colIndex: 75, stateTaxRate: 0.19, taxesSocialSecurity: false,
    healthcareMultiplier: 0.60, notes: 'Non-Lucrative Visa available; Costa del Sol, Barcelona, Madrid',
  },
  {
    id: 'gr', name: 'Greece', region: 'Europe', country: 'International',
    colIndex: 68, stateTaxRate: 0.07, taxesSocialSecurity: false,
    healthcareMultiplier: 0.55, notes: '7% flat tax on foreign pension income for 15 yrs; islands & Athens',
  },
  {
    id: 'it', name: 'Italy', region: 'Europe', country: 'International',
    colIndex: 82, stateTaxRate: 0.07, taxesSocialSecurity: false,
    healthcareMultiplier: 0.62, notes: '7% flat tax in southern Italy for 10 yrs; EUR/USD exposure',
  },
  {
    id: 'mx', name: 'Mexico', region: 'Latin America', country: 'International',
    colIndex: 45, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.35, notes: 'Very low COL; no tax on US-source income; Puerto Vallarta, CDMX',
  },
  {
    id: 'cr', name: 'Costa Rica', region: 'Latin America', country: 'International',
    colIndex: 55, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.40, notes: 'Pensionado visa requires $1K/mo income; excellent healthcare',
  },
  {
    id: 'pa', name: 'Panama', region: 'Latin America', country: 'International',
    colIndex: 58, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.45, notes: 'Pensionado visa with discounts; USD currency; modern infrastructure',
  },
  {
    id: 'co-country', name: 'Colombia', region: 'Latin America', country: 'International',
    colIndex: 42, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.30, notes: 'Medellín popular with expats; low COL; improving safety',
  },
  {
    id: 'th', name: 'Thailand', region: 'Asia', country: 'International',
    colIndex: 35, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.28, notes: 'Retirement visa requires $2K/mo income or $25K in bank; Chiang Mai, Hua Hin',
  },
  {
    id: 'ph', name: 'Philippines', region: 'Asia', country: 'International',
    colIndex: 38, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.30, notes: 'SRRV visa; English-speaking; low COL; Cebu, Davao, Tagaytay',
  },
  {
    id: 'vn', name: 'Vietnam', region: 'Asia', country: 'International',
    colIndex: 33, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.25, notes: 'Extremely low COL; Da Nang, Hội An popular; improving infrastructure',
  },
  {
    id: 'my', name: 'Malaysia', region: 'Asia', country: 'International',
    colIndex: 40, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.32, notes: 'MM2H visa; Penang & KL expat communities; English-speaking',
  },
  {
    id: 'ec', name: 'Ecuador', region: 'Latin America', country: 'International',
    colIndex: 40, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.35, notes: 'USD currency; Cuenca popular with retirees; Andean climate',
  },

  // ── India ──────────────────────────────────────────────────────────────────
  {
    id: 'in-goa', name: 'Goa, India', region: 'India', country: 'International',
    colIndex: 28, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.18, notes: 'Most popular expat retirement destination in India; beaches; NRI foreign income generally exempt',
  },
  {
    id: 'in-kerala', name: 'Kerala, India', region: 'India', country: 'International',
    colIndex: 22, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.16, notes: 'Highest human development index in India; excellent healthcare; backwaters & hill stations',
  },
  {
    id: 'in-pune', name: 'Pune, India', region: 'India', country: 'International',
    colIndex: 25, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.17, notes: 'Pleasant climate; large expat community; good hospitals; Maharashtra',
  },
  {
    id: 'in-pondicherry', name: 'Pondicherry, India', region: 'India', country: 'International',
    colIndex: 20, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.15, notes: 'Former French colony; beach town; very low COL; Tamil Nadu',
  },
  {
    id: 'in-himachal', name: 'Himachal Pradesh, India', region: 'India', country: 'International',
    colIndex: 18, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.14, notes: 'Hill stations (Shimla, Dharamsala, Manali); cool climate; scenic',
  },
  {
    id: 'in-coorg', name: 'Coorg (Kodagu), India', region: 'India', country: 'International',
    colIndex: 19, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.14, notes: 'Coffee country; hill station; Karnataka; very peaceful retirement locale',
  },
  {
    id: 'in-jaipur', name: 'Jaipur, India', region: 'India', country: 'International',
    colIndex: 21, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.15, notes: 'Pink City; Rajasthan; affordable; good connectivity; cultural richness',
  },
  {
    id: 'in-bangalore', name: 'Bengaluru, India', region: 'India', country: 'International',
    colIndex: 27, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.19, notes: 'Garden City; pleasant weather year-round; world-class hospitals; Karnataka',
  },
  {
    id: 'in-chennai', name: 'Chennai, India', region: 'India', country: 'International',
    colIndex: 24, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.17, notes: 'Tamil Nadu capital; excellent medical infrastructure; Marina Beach; cultural hub; strong NRI community',
  },
  {
    id: 'in-kolkata', name: 'Kolkata, India', region: 'India', country: 'International',
    colIndex: 20, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.16, notes: 'City of Joy; lowest COL among major Indian metros; rich culture & cuisine; West Bengal',
  },
  {
    id: 'in-delhi', name: 'New Delhi, India', region: 'India', country: 'International',
    colIndex: 26, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.18, notes: 'Capital region (NCR); world-class private hospitals; well-connected; Noida & Gurgaon suburbs popular',
  },

  // ── Caribbean ──────────────────────────────────────────────────────────────
  {
    id: 'bb', name: 'Barbados', region: 'Caribbean', country: 'International',
    colIndex: 95, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.72, notes: 'Welcome Stamp visa; territorial tax (foreign income exempt); English-speaking',
  },
  {
    id: 'jm', name: 'Jamaica', region: 'Caribbean', country: 'International',
    colIndex: 55, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.45, notes: 'Foreign-source pension/retirement income tax-exempt; English-speaking; Montego Bay',
  },
  {
    id: 'ky', name: 'Cayman Islands', region: 'Caribbean', country: 'International',
    colIndex: 155, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 1.10, notes: 'No income, capital gains or inheritance tax; British Overseas Territory; very high COL',
  },
  {
    id: 'bs', name: 'Bahamas', region: 'Caribbean', country: 'International',
    colIndex: 120, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.85, notes: 'No income or capital gains tax; Annual Residence permit; Nassau & Out Islands',
  },
  {
    id: 'pr', name: 'Puerto Rico (US)', region: 'Caribbean', country: 'International',
    colIndex: 85, stateTaxRate: 0.04, taxesSocialSecurity: false,
    healthcareMultiplier: 0.70, notes: 'US territory; Act 22/60 tax incentives; no federal income tax on local income; San Juan',
  },
  {
    id: 'tt', name: 'Trinidad & Tobago', region: 'Caribbean', country: 'International',
    colIndex: 68, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.55, notes: 'Foreign-source income not taxed; Tobago is quieter & scenic; diverse culture',
  },
  {
    id: 'ag', name: 'Antigua & Barbuda', region: 'Caribbean', country: 'International',
    colIndex: 90, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.68, notes: 'No income tax; 365 beaches; English-speaking; citizenship by investment available',
  },
  {
    id: 'kn', name: 'St. Kitts & Nevis', region: 'Caribbean', country: 'International',
    colIndex: 88, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.65, notes: 'No income, capital gains or inheritance tax; citizenship by investment; scenic federation',
  },
  {
    id: 'lc', name: 'St. Lucia', region: 'Caribbean', country: 'International',
    colIndex: 82, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.60, notes: 'Foreign income generally tax-exempt; Citizenship by Investment; volcanic landscapes',
  },
  {
    id: 'gd', name: 'Grenada', region: 'Caribbean', country: 'International',
    colIndex: 72, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.55, notes: 'Spice Isle; territorial tax; CBI program; English-speaking; peaceful',
  },
  {
    id: 'vc', name: 'St. Vincent & Grenadines', region: 'Caribbean', country: 'International',
    colIndex: 68, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.52, notes: 'Territorial tax system; stunning Grenadines islands; very affordable',
  },
  {
    id: 'dm', name: 'Dominica', region: 'Caribbean', country: 'International',
    colIndex: 62, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.50, notes: 'Nature Isle; CBI program from $100K; territorial taxation; lush rainforest',
  },
  {
    id: 'do', name: 'Dominican Republic', region: 'Caribbean', country: 'International',
    colIndex: 50, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.40, notes: 'Pensionado/Rentista visa; foreign income tax-exempt; Punta Cana, Santo Domingo',
  },
  {
    id: 'tc', name: 'Turks & Caicos', region: 'Caribbean', country: 'International',
    colIndex: 132, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.95, notes: 'British Overseas Territory; no income tax; very high COL; stunning beaches',
  },
  {
    id: 'aw', name: 'Aruba', region: 'Caribbean', country: 'International',
    colIndex: 110, stateTaxRate: 0.185, taxesSocialSecurity: false,
    healthcareMultiplier: 0.78, notes: 'Constituent country of Netherlands; low crime; very stable; USD widely accepted',
  },
  {
    id: 'cw', name: 'Curaçao', region: 'Caribbean', country: 'International',
    colIndex: 90, stateTaxRate: 0.10, taxesSocialSecurity: false,
    healthcareMultiplier: 0.70, notes: 'Dutch-influenced; multi-lingual; colorful Willemstad; good quality of life',
  },
  {
    id: 'ht', name: 'Haiti', region: 'Caribbean', country: 'International',
    colIndex: 38, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.25, notes: 'Very low COL; instability is a major consideration; primarily for research purposes',
  },
  {
    id: 'bz', name: 'Belize', region: 'Caribbean', country: 'International',
    colIndex: 65, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.48, notes: 'QRP visa for retirees; English-speaking; foreign income exempt; Caribbean coast',
  },
  {
    id: 'cu', name: 'Cuba', region: 'Caribbean', country: 'International',
    colIndex: 35, stateTaxRate: 0.00, taxesSocialSecurity: false,
    healthcareMultiplier: 0.30, notes: 'Very low COL for foreigners; healthcare is strong; US travel restrictions apply',
  },

  // ── Europe (Additional) ────────────────────────────────────────────────────
  {
    id: 'fr', name: 'France', region: 'Europe', country: 'International',
    colIndex: 98, stateTaxRate: 0.30, taxesSocialSecurity: false,
    healthcareMultiplier: 0.65, notes: 'Universal healthcare; 30% flat tax (PFU) on investment income; Provence, Bordeaux, Brittany',
  },
  {
    id: 'de', name: 'Germany', region: 'Europe', country: 'International',
    colIndex: 102, stateTaxRate: 0.25, taxesSocialSecurity: false,
    healthcareMultiplier: 0.68, notes: '25% withholding on capital income; excellent public healthcare; Bavaria, Rhine Valley',
  },
  {
    id: 'ch', name: 'Switzerland', region: 'Europe', country: 'International',
    colIndex: 162, stateTaxRate: 0.20, taxesSocialSecurity: false,
    healthcareMultiplier: 0.95, notes: 'Very high COL; lump-sum taxation available for foreigners; Geneva, Zurich, Lugano',
  },
  {
    id: 'nl', name: 'Netherlands', region: 'Europe', country: 'International',
    colIndex: 110, stateTaxRate: 0.32, taxesSocialSecurity: false,
    healthcareMultiplier: 0.72, notes: '30% ruling for expats (tax advantage); Amsterdam, Utrecht, The Hague',
  },
  {
    id: 'be', name: 'Belgium', region: 'Europe', country: 'International',
    colIndex: 103, stateTaxRate: 0.30, taxesSocialSecurity: false,
    healthcareMultiplier: 0.65, notes: '30% withholding on dividends; Bruges, Ghent, Brussels; excellent chocolates & beer',
  },
  {
    id: 'at', name: 'Austria', region: 'Europe', country: 'International',
    colIndex: 99, stateTaxRate: 0.275, taxesSocialSecurity: false,
    healthcareMultiplier: 0.67, notes: '27.5% on capital income; Vienna consistently top livability rankings; Alps retirement',
  },
  {
    id: 'ie', name: 'Ireland', region: 'Europe', country: 'International',
    colIndex: 122, stateTaxRate: 0.20, taxesSocialSecurity: false,
    healthcareMultiplier: 0.80, notes: 'Remittance basis for foreign income; English-speaking; Dublin, Galway, Cork',
  },
  {
    id: 'cz', name: 'Czech Republic', region: 'Europe', country: 'International',
    colIndex: 68, stateTaxRate: 0.15, taxesSocialSecurity: false,
    healthcareMultiplier: 0.52, notes: '15% flat tax; Prague one of Europe\'s most livable cities; low COL vs Western Europe',
  },
  {
    id: 'hu', name: 'Hungary', region: 'Europe', country: 'International',
    colIndex: 58, stateTaxRate: 0.15, taxesSocialSecurity: false,
    healthcareMultiplier: 0.45, notes: '15% flat tax; Budapest outstanding quality/price ratio; thermal baths & culture',
  },
  {
    id: 'pl', name: 'Poland', region: 'Europe', country: 'International',
    colIndex: 52, stateTaxRate: 0.19, taxesSocialSecurity: false,
    healthcareMultiplier: 0.42, notes: '19% capital gains; Krakow & Wroclaw popular with expats; low COL; EU member',
  },
  {
    id: 'hr', name: 'Croatia', region: 'Europe', country: 'International',
    colIndex: 72, stateTaxRate: 0.10, taxesSocialSecurity: false,
    healthcareMultiplier: 0.55, notes: '10% flat tax on foreign pension; Digital Nomad Visa; Dubrovnik, Split, Istria; EU member',
  },
  {
    id: 'me', name: 'Montenegro', region: 'Europe', country: 'International',
    colIndex: 52, stateTaxRate: 0.09, taxesSocialSecurity: false,
    healthcareMultiplier: 0.40, notes: '9% flat income tax — lowest in Europe; Adriatic coast; EU candidate; growing expat scene',
  },
  {
    id: 'al', name: 'Albania', region: 'Europe', country: 'International',
    colIndex: 42, stateTaxRate: 0.15, taxesSocialSecurity: false,
    healthcareMultiplier: 0.32, notes: 'Emerging destination; low COL; stunning coast (Albanian Riviera); 15% flat tax',
  },
  {
    id: 'bg', name: 'Bulgaria', region: 'Europe', country: 'International',
    colIndex: 47, stateTaxRate: 0.10, taxesSocialSecurity: false,
    healthcareMultiplier: 0.38, notes: '10% flat tax — lowest in EU; Black Sea coast; Sofia & Plovdiv growing expat hubs',
  },
  {
    id: 'ro', name: 'Romania', region: 'Europe', country: 'International',
    colIndex: 50, stateTaxRate: 0.10, taxesSocialSecurity: false,
    healthcareMultiplier: 0.40, notes: '10% flat tax; Transylvania & Bucharest; low COL; EU member; improving infrastructure',
  },
  {
    id: 'cy', name: 'Cyprus', region: 'Europe', country: 'International',
    colIndex: 77, stateTaxRate: 0.05, taxesSocialSecurity: false,
    healthcareMultiplier: 0.58, notes: '5% flat tax on foreign pension; English widely spoken; Mediterranean climate; EU member',
  },
  {
    id: 'mt', name: 'Malta', region: 'Europe', country: 'International',
    colIndex: 78, stateTaxRate: 0.15, taxesSocialSecurity: false,
    healthcareMultiplier: 0.60, notes: '15% flat tax on remitted foreign income; English-speaking EU member; warm climate; Valletta',
  },
  {
    id: 'no', name: 'Norway', region: 'Europe', country: 'International',
    colIndex: 155, stateTaxRate: 0.22, taxesSocialSecurity: false,
    healthcareMultiplier: 0.90, notes: '22% flat capital income tax; very high COL; Oslo, Bergen; exceptional quality of life',
  },
  {
    id: 'se', name: 'Sweden', region: 'Europe', country: 'International',
    colIndex: 145, stateTaxRate: 0.30, taxesSocialSecurity: false,
    healthcareMultiplier: 0.85, notes: '30% capital gains tax; excellent welfare state; Stockholm, Gothenburg; high COL',
  },
  {
    id: 'dk', name: 'Denmark', region: 'Europe', country: 'International',
    colIndex: 155, stateTaxRate: 0.27, taxesSocialSecurity: false,
    healthcareMultiplier: 0.88, notes: '27% bottom rate; consistently happiest country; Copenhagen; very high COL',
  },
  {
    id: 'fi', name: 'Finland', region: 'Europe', country: 'International',
    colIndex: 130, stateTaxRate: 0.30, taxesSocialSecurity: false,
    healthcareMultiplier: 0.82, notes: '30% capital gains; excellent education & healthcare; Helsinki; high COL',
  },
  {
    id: 'rs', name: 'Serbia', region: 'Europe', country: 'International',
    colIndex: 44, stateTaxRate: 0.15, taxesSocialSecurity: false,
    healthcareMultiplier: 0.35, notes: '15% flat tax; Belgrade vibrant & affordable; growing expat community; not EU',
  },
  {
    id: 'sk', name: 'Slovakia', region: 'Europe', country: 'International',
    colIndex: 55, stateTaxRate: 0.19, taxesSocialSecurity: false,
    healthcareMultiplier: 0.44, notes: '19% flat tax; Bratislava proximity to Vienna; low COL; EU member; Tatra mountains',
  },
  {
    id: 'si', name: 'Slovenia', region: 'Europe', country: 'International',
    colIndex: 72, stateTaxRate: 0.25, taxesSocialSecurity: false,
    healthcareMultiplier: 0.56, notes: '25% capital gains; EU member; Ljubljana charming; Alps meets Adriatic; very safe',
  },
  {
    id: 'ba', name: 'Bosnia & Herzegovina', region: 'Europe', country: 'International',
    colIndex: 40, stateTaxRate: 0.10, taxesSocialSecurity: false,
    healthcareMultiplier: 0.30, notes: '10% flat tax; Mostar & Sarajevo; very low COL; emerging destination',
  },
  {
    id: 'mk', name: 'North Macedonia', region: 'Europe', country: 'International',
    colIndex: 38, stateTaxRate: 0.10, taxesSocialSecurity: false,
    healthcareMultiplier: 0.28, notes: '10% flat tax; Ohrid a UNESCO gem; very affordable; EU candidate',
  },
];

export const DEFAULT_LOCATION_ID = 'us-national';

export function getLocation(id: string): RetirementLocation {
  return LOCATIONS.find(l => l.id === id) ?? LOCATIONS[0];
}
