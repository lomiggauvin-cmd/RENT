// ============================================================
// Charges énergétiques — Location Courte Durée
//
// En location courte durée, c'est le PROPRIÉTAIRE qui prend en
// charge l'électricité et l'eau (incluses dans le prix de la nuit).
// En longue durée, c'est le LOCATAIRE : ces charges n'entrent
// donc pas dans le calcul du propriétaire.
// ============================================================

import type { DPEGrade } from '@/types';
import { DEFAULT_CHARGES } from './defaultCharges';

// Consommation énergétique moyenne par classe DPE (kWh/m²/an)
// Source : plafonds des étiquettes DPE — réglementation RE2020
export const DPE_KWH_PER_M2: Record<DPEGrade, number> = {
  A: 50,
  B: 90,
  C: 150,
  D: 210,
  E: 290,
  F: 380,
  G: 450,
};

// Consommation d'eau par jour de location effective
export const WATER_DAILY_M3 = 0.3; // m³/jour occupé

/**
 * Coût annuel d'électricité pour une location courte durée.
 * Formule : surface (m²) × consommation DPE (kWh/m²/an) × prix kWh (€)
 * Pour la stratégie Mixte, passer electricityMonthRatio = 3/12.
 */
export function calcElectricityCostST(
  surfaceM2: number,
  dpeRating: DPEGrade,
  electricityMonthRatio = 1
): number {
  const kwhPerM2 = DPE_KWH_PER_M2[dpeRating] ?? DPE_KWH_PER_M2['D'];
  return surfaceM2 * kwhPerM2 * DEFAULT_CHARGES.prixKwh * electricityMonthRatio;
}

/**
 * Coût d'eau pour une location courte durée.
 * Formule : 0,3 m³ × prix eau (€/m³) × jours occupés
 *
 * Les jours occupés s'obtiennent par : 365 × tauxRemplissage
 * ou en sommant directement les nuits louées sur la période.
 */
export function calcWaterCostST(occupiedDays: number): number {
  return WATER_DAILY_M3 * DEFAULT_CHARGES.prixEauM3 * occupiedDays;
}
