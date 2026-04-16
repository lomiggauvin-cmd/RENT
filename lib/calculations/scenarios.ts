import type {
  PropertyData, FinancingData, WorksData, FiscalData, AdvancedParameters,
  MarketData, ShortTermParameters, ScenarioResult, YearProjection,
  CashFlowBreakdown, FiscalRegime, SimulationResults
} from '@/types';
import { calcElectricityCostST, calcWaterCostST } from './dpe';
import { DEFAULT_CHARGES } from './defaultCharges';

// ============================
// CONSTANTS
// ============================

const COPRO_MONTHLY = 150;        // €/mois charges copropriété (estimation)
const TAXE_FONCIERE_RATE = 0.012; // 1.2% du prix d'achat / an

// ============================
// FISCAL CONSTANTS (2024 Brackets)
// ============================

const TAX_BRACKETS = [
  { limit: 11294, rate: 0.00 },
  { limit: 28797, rate: 0.11 },
  { limit: 82341, rate: 0.30 },
  { limit: 177106, rate: 0.41 },
  { limit: Infinity, rate: 0.45 },
];

const CSG_CRDS_RATE = 0.172; // 17.2% Social contributions

// ============================
// LOAN CALCULATION
// ============================

export function calcMonthlyPayment(amount: number, rate: number, durationYears: number): number {
  if (!amount || !rate || !durationYears) return 0;
  const monthlyRate = rate / 100 / 12;
  const n = durationYears * 12;
  if (monthlyRate === 0) return amount / n;
  return (amount * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
}

// ============================
// FISCAL CALCULATIONS
// ============================

/**
 * Calculates French income tax + social contributions
 * @param propertyTaxableIncome Net taxable income from the property
 * @param currentTmi User's current marginal tax rate
 * @param familyParts Number of fiscal parts
 */
export function calcFrenchTax(
  propertyTaxableIncome: number,
  currentTmi: number,
  familyParts: number = 1
): number {
  if (propertyTaxableIncome <= 0) return 0;

  // 1. Social Contributions (flat 17.2%)
  const socialContributions = propertyTaxableIncome * CSG_CRDS_RATE;

  // 2. Income Tax (Progressive)
  // We simulate the starting point of total income based on the provided TMI.
  const currentBracketIndex = TAX_BRACKETS.findIndex(b => b.rate * 100 === currentTmi);
  let simulatedBaseIncomePerPart = 0;
  if (currentBracketIndex > 0) {
    // We assume they are at the beginning of their bracket for a conservative estimate
    simulatedBaseIncomePerPart = TAX_BRACKETS[currentBracketIndex - 1].limit + 1;
  }

  const incomePerPart = propertyTaxableIncome / familyParts;

  const calcTaxForTotal = (total: number) => {
    let tax = 0;
    let prevLimit = 0;
    for (const bracket of TAX_BRACKETS) {
      const taxableInThisBracket = Math.min(total - prevLimit, bracket.limit - prevLimit);
      if (taxableInThisBracket > 0) {
        tax += taxableInThisBracket * bracket.rate;
      }
      prevLimit = bracket.limit;
      if (total <= bracket.limit) break;
    }
    return tax;
  };

  const taxBefore = calcTaxForTotal(simulatedBaseIncomePerPart);
  const taxAfter = calcTaxForTotal(simulatedBaseIncomePerPart + incomePerPart);
  
  const incomeTax = (taxAfter - taxBefore) * familyParts;

  return incomeTax + socialContributions;
}

export function calcFiscalLMNPReel(
  annualRevenue: number,
  annualExpenses: number,
  furnitureCost: number,
  renovationCost: number,
  loanInterestAnnual: number,
  tmi: number,
  familyParts: number = 1
): number {
  // Amortissement mobilier sur 7 ans, rénovation sur 15 ans
  const furnitureDepreciation = furnitureCost / 7;
  const renovationDepreciation = renovationCost / 15;
  const totalDeductions = annualExpenses + furnitureDepreciation + renovationDepreciation + loanInterestAnnual;
  const taxableIncome = Math.max(0, annualRevenue - totalDeductions);
  return calcFrenchTax(taxableIncome, tmi, familyParts);
}

export function calcFiscalMicroBIC(annualRevenue: number, tmi: number, familyParts: number = 1): number {
  // Abattement 50% Micro-BIC meublé
  const taxableIncome = annualRevenue * 0.5;
  return calcFrenchTax(taxableIncome, tmi, familyParts);
}

export function calcFiscalFoncierReel(
  annualRevenue: number,
  annualExpenses: number,
  loanInterestAnnual: number,
  tmi: number,
  familyParts: number = 1
): number {
  const taxableIncome = Math.max(0, annualRevenue - annualExpenses - loanInterestAnnual);
  return calcFrenchTax(taxableIncome, tmi, familyParts);
}

export function calcFiscalMicroFoncier(annualRevenue: number, tmi: number, familyParts: number = 1): number {
  // Abattement 30% Micro-foncier (non meublé)
  const taxableIncome = annualRevenue * 0.7;
  return calcFrenchTax(taxableIncome, tmi, familyParts);
}

export function getBestFiscalRegime(
  annualRevenue: number,
  annualExpenses: number,
  furnitureCost: number,
  renovationCost: number,
  loanInterestAnnual: number,
  tmi: number,
  isFurnished: boolean,
  familyParts: number = 1
): { regime: FiscalRegime; tax: number } {
  if (isFurnished) {
    const lmnpReel = calcFiscalLMNPReel(annualRevenue, annualExpenses, furnitureCost, renovationCost, loanInterestAnnual, tmi, familyParts);
    const microBIC = calcFiscalMicroBIC(annualRevenue, tmi, familyParts);
    if (lmnpReel <= microBIC) return { regime: 'LMNP Réel', tax: lmnpReel };
    return { regime: 'Micro-BIC', tax: microBIC };
  } else {
    const foncierReel = calcFiscalFoncierReel(annualRevenue, annualExpenses, loanInterestAnnual, tmi, familyParts);
    const microFoncier = calcFiscalMicroFoncier(annualRevenue, tmi, familyParts);
    if (foncierReel <= microFoncier) return { regime: 'Foncier Réel', tax: foncierReel };
    return { regime: 'Micro-foncier', tax: microFoncier };
  }
}

// ============================
// ANNUAL EXPENSES (common)
// ============================

function calcAnnualExpenses(property: PropertyData): number {
  const taxeFonciere = property.purchasePrice * TAXE_FONCIERE_RATE;
  const copro = COPRO_MONTHLY * 12;
  return taxeFonciere + copro + DEFAULT_CHARGES.assurancePnoAnnuelle + DEFAULT_CHARGES.internetMensuel * 12;
}

function calcLoanInterestFirstYear(financing: FinancingData): number {
  if (!financing.hasLoan) return 0;
  return financing.loanAmount * (financing.interestRate / 100);
}

// ============================
// LONG TERM SCENARIO
// ============================

export function calcLongTermScenario(
  property: PropertyData,
  financing: FinancingData,
  works: WorksData,
  fiscal: FiscalData,
  advanced: AdvancedParameters,
  market: MarketData
): ScenarioResult {
  const monthlyRent = market.avgLongTermRent * (1 - DEFAULT_CHARGES.vacanceLocativeLld);
  const annualRevenue = monthlyRent * 12;

  const annualExpenses = calcAnnualExpenses(property);
  const annualLoanPayment = financing.hasLoan
    ? (financing.monthlyPayment + financing.insuranceMonthlyAmount) * 12
    : 0;
  const loanInterest = calcLoanInterestFirstYear(financing);

  const fiscal_calc = getBestFiscalRegime(
    annualRevenue, annualExpenses, works.furnitureCost, works.renovationCost,
    loanInterest, fiscal.tmi, true, fiscal.familyParts
  );

  const annualCashFlow = annualRevenue - annualExpenses - annualLoanPayment - fiscal_calc.tax;
  const monthlyCashFlow = annualCashFlow / 12;
  const totalAcquisitionPrice = property.purchasePrice * 1.08 + works.renovationCost + works.furnitureCost;
  const grossYield = (annualRevenue / totalAcquisitionPrice) * 100;
  const netYield = ((annualRevenue - annualExpenses) / totalAcquisitionPrice) * 100;

  const breakdown: CashFlowBreakdown = {
    annualRevenue,
    annualExpenses,
    annualLoanPayment,
    annualInsurance: financing.insuranceMonthlyAmount * 12,
    annualTax: fiscal_calc.tax,
    annualConcierge: 0,
    annualCleaning: 0,
    annualMandatoryWorks: 0,
    annualUtilities: 0,
    monthlyCashFlow,
    annualCashFlow,
    lostRevenue: 0,
    taxableIncome: 0,
  };

  return {
    type: 'long_term',
    grossYield,
    netYield,
    monthlyCashFlow,
    annualCashFlow,
    optimalFiscalRegime: fiscal_calc.regime,
    annualTaxAmount: fiscal_calc.tax,
    isRecommended: false,
    breakdown,
    fifteenYearProjection: calcProjection(property, financing, advanced, annualCashFlow, 'long_term'),
  };
}

// ============================
// SHORT TERM SCENARIO
// ============================

// ============================
// SHORT TERM SCENARIO
// ============================

const MONTHS_LIST = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function calcShortTermScenario(
  property: PropertyData,
  financing: FinancingData,
  works: WorksData,
  fiscal: FiscalData,
  advanced: AdvancedParameters,
  market: MarketData,
  shortTerm: ShortTermParameters
): ScenarioResult {
  let annualRevenue = 0;
  let annualCleaning = 0;
  let totalPersonalUseLostRevenue = 0;
  let totalOccupiedDays = 0;

  // Monthly breakdown
  for (const month of MONTHS_LIST) {
    const isSummer = ['Juin', 'Juillet', 'Août'].includes(month);
    const priceCoefficient = isSummer ? 1.2 : (['Novembre', 'Janvier'].includes(month) ? 0.8 : 1.0);
    const monthlyADR = market.avgNightlyRate * priceCoefficient;
    const monthlyOccupancy = (market.monthlyOccupancyRates?.[month] ?? market.airbnbOccupancyRate) / 100;

    const daysInMonth = 30.42; // Average days per month
    const isPersonalUseMonth = shortTerm.personalUseMonths.includes(month);

    if (isPersonalUseMonth) {
      // 100% loss for this month
      totalPersonalUseLostRevenue += daysInMonth * monthlyOccupancy * monthlyADR;
      continue;
    }

    const occupiedDays = daysInMonth * monthlyOccupancy;
    const revenue = occupiedDays * monthlyADR;
    const cleaning = (occupiedDays / shortTerm.avgStayDurationDays) * shortTerm.cleaningCostPerStay;

    annualRevenue += revenue;
    annualCleaning += cleaning;
    totalOccupiedDays += occupiedDays;
  }

  const annualConcierge = annualRevenue * shortTerm.conciergeFeePercent;
  const annualExpenses = calcAnnualExpenses(property);
  // Eau + électricité + consommables : à la charge du propriétaire en courte durée
  const annualUtilities =
    calcElectricityCostST(property.surfaceM2, property.dpeRating) +
    calcWaterCostST(totalOccupiedDays) +
    DEFAULT_CHARGES.consommablesLcdMensuel * 12;
  const annualLoanPayment = financing.hasLoan
    ? (financing.monthlyPayment + financing.insuranceMonthlyAmount) * 12
    : 0;
  const loanInterest = calcLoanInterestFirstYear(financing);

  const netRevenueBeforeTax = annualRevenue - annualConcierge - annualCleaning;
  const fiscal_calc = getBestFiscalRegime(
    netRevenueBeforeTax, annualExpenses + annualUtilities, works.furnitureCost, works.renovationCost,
    loanInterest, fiscal.tmi, true, fiscal.familyParts
  );

  const annualCashFlow = netRevenueBeforeTax - annualExpenses - annualUtilities - annualLoanPayment - fiscal_calc.tax;
  const monthlyCashFlow = annualCashFlow / 12;
  const totalAcquisitionPrice = property.purchasePrice * 1.08 + works.renovationCost + works.furnitureCost;
  const grossYield = (annualRevenue / totalAcquisitionPrice) * 100;
  const netYield = ((netRevenueBeforeTax - annualExpenses - annualUtilities) / totalAcquisitionPrice) * 100;

  const breakdown: CashFlowBreakdown = {
    annualRevenue,
    annualExpenses,
    annualLoanPayment,
    annualInsurance: financing.insuranceMonthlyAmount * 12,
    annualTax: fiscal_calc.tax,
    annualConcierge,
    annualCleaning,
    annualMandatoryWorks: 0,
    annualUtilities,
    monthlyCashFlow,
    annualCashFlow,
    lostRevenue: totalPersonalUseLostRevenue,
    taxableIncome: 0,
  };

  return {
    type: 'short_term',
    grossYield,
    netYield,
    monthlyCashFlow,
    annualCashFlow,
    optimalFiscalRegime: fiscal_calc.regime,
    annualTaxAmount: fiscal_calc.tax,
    isRecommended: false,
    breakdown,
    fifteenYearProjection: calcProjection(property, financing, advanced, annualCashFlow, 'short_term'),
  };
}

// ============================
// MIXED SCENARIO (9 months LT + 3 months ST — June/July/August)
// ============================

export function calcMixedScenario(
  property: PropertyData,
  financing: FinancingData,
  works: WorksData,
  fiscal: FiscalData,
  advanced: AdvancedParameters,
  market: MarketData,
  shortTerm: ShortTermParameters
): ScenarioResult {
  // 9 months long term
  const ltMonths = 9;
  const stMonths = 3; // June, July, August
  const ltRevenue = market.avgLongTermRent * (1 - DEFAULT_CHARGES.vacanceLocativeLld) * ltMonths;

  // 3 summer months short term (typically higher occupancy in summer)
  const summerOccupancyBoost = 1.15; // +15% occupancy in summer
  const summerOccupiedDays = (stMonths * 30) * (market.airbnbOccupancyRate / 100) * summerOccupancyBoost;
  const stRevenue = summerOccupiedDays * market.avgNightlyRate;
  const avgStays = summerOccupiedDays / shortTerm.avgStayDurationDays;
  const stConcierge = stRevenue * shortTerm.conciergeFeePercent;
  const stCleaning = avgStays * shortTerm.cleaningCostPerStay;

  const annualRevenue = ltRevenue + stRevenue;
  const annualExpenses = calcAnnualExpenses(property);
  // Eau + électricité : uniquement sur les 3 mois de courte durée (le locataire LT paie ses propres charges)
  // Électricité proratisée 3/12, eau sur nuits d'été occupées, consommables 3 mois
  const annualUtilities =
    calcElectricityCostST(property.surfaceM2, property.dpeRating, 3 / 12) +
    calcWaterCostST(summerOccupiedDays) +
    DEFAULT_CHARGES.consommablesLcdMensuel * 3;
  const annualLoanPayment = financing.hasLoan
    ? (financing.monthlyPayment + financing.insuranceMonthlyAmount) * 12
    : 0;
  const loanInterest = calcLoanInterestFirstYear(financing);

  const netRevenue = annualRevenue - stConcierge - stCleaning;
  const fiscal_calc = getBestFiscalRegime(
    netRevenue, annualExpenses + annualUtilities, works.furnitureCost, works.renovationCost,
    loanInterest, fiscal.tmi, true, fiscal.familyParts
  );

  const annualCashFlow = netRevenue - annualExpenses - annualUtilities - annualLoanPayment - fiscal_calc.tax;
  const monthlyCashFlow = annualCashFlow / 12;
  const totalAcquisitionPrice = property.purchasePrice * 1.08 + works.renovationCost + works.furnitureCost;
  const grossYield = (annualRevenue / totalAcquisitionPrice) * 100;
  const netYield = ((netRevenue - annualExpenses - annualUtilities) / totalAcquisitionPrice) * 100;

  const breakdown: CashFlowBreakdown = {
    annualRevenue,
    annualExpenses,
    annualLoanPayment,
    annualInsurance: financing.insuranceMonthlyAmount * 12,
    annualTax: fiscal_calc.tax,
    annualConcierge: stConcierge,
    annualCleaning: stCleaning,
    annualMandatoryWorks: 0,
    annualUtilities,
    monthlyCashFlow,
    annualCashFlow,
    lostRevenue: 0,
    taxableIncome: 0,
  };

  return {
    type: 'mixed',
    grossYield,
    netYield,
    monthlyCashFlow,
    annualCashFlow,
    optimalFiscalRegime: fiscal_calc.regime,
    annualTaxAmount: fiscal_calc.tax,
    isRecommended: false,
    breakdown,
    fifteenYearProjection: calcProjection(property, financing, advanced, annualCashFlow, 'mixed'),
  };
}

// ============================
// 15-YEAR PROJECTION
// ============================

export function calcProjection(
  property: PropertyData,
  financing: FinancingData,
  advanced: AdvancedParameters,
  year1CashFlow: number,
  scenario: string
): YearProjection[] {
  const results: YearProjection[] = [];
  let propertyValue = property.purchasePrice;
  let cumulativeCashFlow = 0;
  let capitalRepaid = 0;

  const loanAmount = financing.hasLoan ? financing.loanAmount : 0;
  const annualPrincipal = financing.hasLoan
    ? loanAmount / financing.loanDurationYears
    : 0;

  for (let year = 1; year <= 15; year++) {
    propertyValue *= (1 + advanced.propertyAppreciationRate);
    const yearCashFlow = year1CashFlow * Math.pow(1 + advanced.rentInflationRate, year - 1);
    cumulativeCashFlow += yearCashFlow;

    if (financing.hasLoan && year <= financing.loanDurationYears) {
      capitalRepaid += annualPrincipal;
    }

    const netWorth = propertyValue - (loanAmount - capitalRepaid) + cumulativeCashFlow;

    results.push({
      year,
      propertyValue: Math.round(propertyValue),
      capitalRepaid: Math.round(capitalRepaid),
      cumulativeCashFlow: Math.round(cumulativeCashFlow),
      netWorth: Math.round(netWorth),
    });
  }

  return results;
}

// ============================
// ORCHESTRATOR
// ============================

export function runSimulation(
  property: PropertyData,
  financing: FinancingData,
  works: WorksData,
  fiscal: FiscalData,
  advanced: AdvancedParameters,
  market: MarketData,
  shortTerm: ShortTermParameters
): SimulationResults {
  const longTerm = calcLongTermScenario(property, financing, works, fiscal, advanced, market);
  const shortTermResult = calcShortTermScenario(property, financing, works, fiscal, advanced, market, shortTerm);
  const mixed = calcMixedScenario(property, financing, works, fiscal, advanced, market, shortTerm);

  // Mark the best scenario
  const scenarios = [longTerm, shortTermResult, mixed];
  const best = scenarios.reduce((a, b) => a.monthlyCashFlow > b.monthlyCashFlow ? a : b);
  best.isRecommended = true;

  return {
    longTerm,
    shortTerm: shortTermResult,
    mixed,
    market,
    withLoan: financing.hasLoan,
  };
}

// ============================
// FISCAL OPTIMIZATION
// ============================

export interface TaxOptimization {
  currentRate: number;
  nextRate: number;
  remainingAmount: number;
}

export function getTaxOptimizationInfo(taxableIncome: number, familyParts: number = 1): TaxOptimization | null {
  const incomePerPart = taxableIncome / familyParts;
  const currentBracketIndex = TAX_BRACKETS.findIndex(b => b.limit > incomePerPart);
  const currentBracket = TAX_BRACKETS[currentBracketIndex === -1 ? TAX_BRACKETS.length - 1 : currentBracketIndex];
  const nextBracket = TAX_BRACKETS[currentBracketIndex + 1];
  
  if (!nextBracket) return null;

  const remainingBeforeNextBracket = (nextBracket.limit - incomePerPart) * familyParts;
  return {
    currentRate: currentBracket.rate * 100,
    nextRate: nextBracket.rate * 100,
    remainingAmount: Math.max(0, Math.round(remainingBeforeNextBracket)),
  };
}

// ============================
// FORMAT HELPERS
// ============================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
