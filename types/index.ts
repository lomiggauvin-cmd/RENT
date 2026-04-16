// ============================
// ENUMS
// ============================

export type PropertyType = 'apartment' | 'house' | 'studio' | 'loft';
export type DPEGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type PropertyCondition = 'new' | 'good' | 'toRenovate';
export type ScenarioType = 'long_term' | 'short_term' | 'mixed';
export type FiscalRegime = 'LMNP Réel' | 'Micro-BIC' | 'Foncier Réel' | 'Micro-foncier';

// ============================
// SIMULATION FORM STATE
// ============================

export interface PropertyData {
  address: string;
  city: string;
  propertyType: PropertyType;
  surfaceM2: number;
  purchasePrice: number;
  dpeRating: DPEGrade;
  propertyCondition: PropertyCondition;
}

export interface FinancingData {
  hasLoan: boolean;
  loanAmount: number;
  loanDurationYears: number;
  interestRate: number;
  monthlyPayment: number;
  insuranceMonthlyAmount: number;
}

export interface WorksData {
  renovationCost: number;
  furnitureCost: number;
  startDate: string; // ISO date string
}

export interface FiscalData {
  tmi: number; // 0, 11, 30, 41, 45
  familyParts: number;
}

export interface AdvancedParameters {
  rentInflationRate: number;    // default 0.02
  propertyAppreciationRate: number; // default 0.025
  expenseGrowthRate: number;    // default 0.015
}

export interface MarketData {
  avgLongTermRent: number;
  avgNightlyRate: number;
  airbnbOccupancyRate: number;
  monthlyOccupancyRates: Record<string, number>;
  monthlyTravelerEstimates: Record<string, number>;
  pricePerM2: number;
  cityTourismScore: number;
  dataSource: 'ExternalAPI' | 'ManualInput';
}

export interface ShortTermParameters {
  conciergeFeePercent: number;  // 0-0.30
  cleaningCostPerStay: number;
  avgStayDurationDays: number;
  personalUseDays: number;
  personalUseMonths: string[];
  lostRevenueFromPersonalUse: number;
}

export interface SimulationFormData {
  property: Partial<PropertyData>;
  financing: Partial<FinancingData>;
  works: Partial<WorksData>;
  fiscal: Partial<FiscalData>;
  advanced: Partial<AdvancedParameters>;
  market: Partial<MarketData>;
  shortTerm: ShortTermParameters;
  photos: string[];
}

// ============================
// CALCULATION RESULTS
// ============================

export interface CashFlowBreakdown {
  annualRevenue: number;
  annualExpenses: number;       // copro + taxe foncière + assurance PNO
  annualLoanPayment: number;
  annualInsurance: number;
  annualTax: number;
  annualConcierge: number;
  annualCleaning: number;
  annualMandatoryWorks: number;
  annualUtilities: number;      // eau + électricité (courte durée uniquement, 0 en longue durée)
  monthlyCashFlow: number;
  annualCashFlow: number;
  lostRevenue: number;
  taxableIncome: number;
}

export interface ScenarioResult {
  type: ScenarioType;
  grossYield: number;
  netYield: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  optimalFiscalRegime: FiscalRegime;
  annualTaxAmount: number;
  isRecommended: boolean;
  breakdown: CashFlowBreakdown;
  fifteenYearProjection: YearProjection[];
}

export interface YearProjection {
  year: number;
  propertyValue: number;
  capitalRepaid: number;
  cumulativeCashFlow: number;
  netWorth: number;
}

export interface SimulationResults {
  longTerm: ScenarioResult;
  shortTerm: ScenarioResult;
  mixed: ScenarioResult;
  market: MarketData;
  withLoan: boolean;
}

// ============================
// DATABASE TYPES (Supabase)
// ============================

export interface Project {
  id: string;
  user_id: string;
  name: string;
  property_address: string;
  property_city: string;
  property_type: PropertyType;
  surface_m2: number;
  purchase_price: number;
  dpe_rating: DPEGrade;
  property_condition: PropertyCondition;
  photos: string[];
  airbnb_potential_score: number | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  // Relations (joined)
  financing_details?: DbFinancingDetails;
  works_furniture?: DbWorksFurniture;
  advanced_parameters?: DbAdvancedParameters;
  market_data?: DbMarketData;
  scenario_results?: DbScenarioResult[];
  short_term_parameters?: DbShortTermParameters;
}

export interface DbFinancingDetails {
  id: string;
  project_id: string;
  has_loan: boolean;
  loan_amount: number;
  loan_duration_years: number;
  interest_rate: number;
  monthly_payment: number;
  insurance_monthly_amount: number;
}

export interface DbWorksFurniture {
  id: string;
  project_id: string;
  renovation_cost: number;
  furniture_cost: number;
  furniture_depreciation_years: number;
  start_date: string;
}

export interface DbAdvancedParameters {
  id: string;
  project_id: string;
  rent_inflation_rate: number;
  property_appreciation_rate: number;
  expense_growth_rate: number;
  projection_years: number;
}

export interface DbMarketData {
  id: string;
  project_id: string;
  avg_long_term_rent: number;
  avg_nightly_rate: number;
  airbnb_occupancy_rate: number;
  monthly_occupancy_rates: Record<string, number>;
  monthly_traveler_estimates: Record<string, number>;
  price_per_m2: number;
  city_tourism_score: number;
  data_source: 'ExternalAPI' | 'ManualInput';
  fetched_at: string;
}

export interface DbScenarioResult {
  id: string;
  project_id: string;
  scenario_type: ScenarioType;
  monthly_cash_flow: number;
  annual_cash_flow: number;
  gross_yield: number;
  net_yield: number;
  optimal_fiscal_regime: FiscalRegime;
  annual_tax_amount: number;
  is_recommended: boolean;
  fifteen_year_projection: YearProjection[];
}

export interface DbShortTermParameters {
  id: string;
  project_id: string;
  concierge_fee_percent: number;
  cleaning_cost_per_stay: number;
  avg_stay_duration_days: number;
  personal_use_days: number;
  personal_use_months: string[];
  lost_revenue_from_personal_use: number;
}

// ============================
// UI HELPERS
// ============================

export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const SUMMER_MONTHS = ['Juin', 'Juillet', 'Août'];

export const TMI_OPTIONS = [
  { value: 0, label: '0% (non imposable)' },
  { value: 11, label: '11%' },
  { value: 30, label: '30%' },
  { value: 41, label: '41%' },
  { value: 45, label: '45%' },
];

export const DPE_COLORS: Record<DPEGrade, string> = {
  A: 'text-emerald-400 border-emerald-400',
  B: 'text-green-400 border-green-400',
  C: 'text-yellow-400 border-yellow-400',
  D: 'text-orange-400 border-orange-400',
  E: 'text-orange-500 border-orange-500',
  F: 'text-red-500 border-red-500',
  G: 'text-red-600 border-red-600',
};
