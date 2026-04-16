// ============================================
// RentaVision V2 — Projection Patrimoniale 15 ans
// ============================================

export interface YearProjection {
  annee: number;
  cashflowAnnuel: number;
  cashflowCumule: number;
  capitalRestantDu: number;
  impotAnnuel: number;
  amortissementRestant: number;
  alerteAmortissement: boolean; // true = l'amortissement se termine cette année
}

export interface ProjectionResult {
  projections: YearProjection[];
  anneeAutofinancement: number | null; // année où cashflow cumulé > 0
  anneeFinAmortissement: number | null; // année où l'amortissement prend fin
  totalCashflow15Ans: number;
  capitalRestantFinal: number;
}

/**
 * Simule l'évolution financière sur 15 ans pour le scénario optimal.
 *
 * - Cash-flow cumulé (vert) : somme des flux nets chaque année
 * - Capital restant dû (rouge) : baisse linéaire du crédit
 * - Effet LMNP : l'amortissement comptable prend fin → les impôts augmentent
 *   Mobilier/frais : ~8-10 ans, Murs : ~25 ans
 *   On simule la fin du mobilier (10 ans) + décroissance progressive
 */
export function calculate15YearProjection(
  cashflowNetAnnuel: number,
  revenuBrutAnnuel: number,
  chargesAnnuelles: number,
  mensualiteCredit: number,
  dureeCredit: number, // années restantes
  capitalEmprunt: number, // = mensualité × durée × 12 (approximation)
  valeurBien: number,
  renovationBudget: number,
  isMeuble: boolean,
  tmi: number,
  isRegimeReel: boolean,
  annualAmortization: import('./calculations/loan').AmortizationYear[] = []
): ProjectionResult {
  const projections: YearProjection[] = [];

  // Calcul du capital initial restant dû (approximation : amortissement linéaire)
  const creditAnnuel = mensualiteCredit * 12;
  const capitalInitial = capitalEmprunt > 0 ? capitalEmprunt : creditAnnuel * dureeCredit;
  const remboursementAnnuel = dureeCredit > 0 ? capitalInitial / dureeCredit : 0;

  // Amortissements LMNP
  const amortBienAnnuel = valeurBien * 0.85 / 25; // 3.4% / an sur 25 ans
  const amortMobilierAnnuel = valeurBien * 0.15 / 10; // mobilier sur 10 ans
  const amortTravauxAnnuel = renovationBudget > 0 ? renovationBudget / 10 : 0; // travaux sur 10 ans
  const totalAmortInitial = amortBienAnnuel + amortMobilierAnnuel + amortTravauxAnnuel;

  const PRELEVEMENTS_SOCIAUX = 0.172;
  let cashflowCumule = 0;
  let anneeAutofinancement: number | null = null;
  let anneeFinAmortissement: number | null = null;

  for (let annee = 1; annee <= 15; annee++) {
    // Récupération des données d'amortissement de l'année (si disponible)
    const amortYearInfo = annualAmortization[annee - 1]; // annee 1 = index 0
    const capitalRestant = amortYearInfo ? amortYearInfo.capitalRestantDu : Math.max(0, capitalInitial - remboursementAnnuel * annee);
    const creditCetteAnnee = amortYearInfo ? amortYearInfo.mensualites : (annee <= dureeCredit ? creditAnnuel : 0);
    const interetsCetteAnnee = amortYearInfo ? amortYearInfo.interetsPayes : 0;

    // Amortissement cette année (LMNP Réel uniquement)
    let amortissementCetteAnnee = 0;
    let alerteAmortissement = false;

    if (isRegimeReel && isMeuble) {
      // Le mobilier/travaux s'amortissent sur 10 ans
      const mobilierActif = annee <= 10;
      // Les murs s'amortissent sur 25 ans (toujours actif sur 15 ans)
      amortissementCetteAnnee = amortBienAnnuel;
      if (mobilierActif) {
        amortissementCetteAnnee += amortMobilierAnnuel + amortTravauxAnnuel;
      }

      // Alerte : le mobilier/travaux finit à l'année 10
      if (annee === 10 && (amortMobilierAnnuel > 0 || amortTravauxAnnuel > 0)) {
        alerteAmortissement = true;
        anneeFinAmortissement = 10;
      }
    }

    // Impôt cette année
    let revenuImposable = revenuBrutAnnuel;
    if (isRegimeReel) {
      // Régime Réel (Foncier ou LMNP) : déduction des charges, amortissements (LMNP uniquement) et intérêts réels
      revenuImposable = Math.max(0, revenuBrutAnnuel - chargesAnnuelles - amortissementCetteAnnee - interetsCetteAnnee);
    } else if (isMeuble) {
      // Micro-BIC : abattement forfaitaire
      // (Abattement 50% ou 71%. La projection garde 50% par défaut pour la simplification)
      revenuImposable = revenuBrutAnnuel * 0.50;
    } else {
      // Micro-Foncier : abattement 30%
      revenuImposable = Math.max(0, revenuBrutAnnuel * 0.70);
    }

    const impotAnnuel = revenuImposable * tmi + revenuImposable * PRELEVEMENTS_SOCIAUX;

    // Cash-flow net de l'année
    const cashflowAnnuel = revenuBrutAnnuel - chargesAnnuelles - creditCetteAnnee - impotAnnuel;
    cashflowCumule += cashflowAnnuel;

    // Détection de l'année d'autofinancement
    if (cashflowCumule >= 0 && anneeAutofinancement === null && annee > 1) {
      anneeAutofinancement = annee;
    }

    projections.push({
      annee,
      cashflowAnnuel: Math.round(cashflowAnnuel),
      cashflowCumule: Math.round(cashflowCumule),
      capitalRestantDu: Math.round(capitalRestant),
      impotAnnuel: Math.round(impotAnnuel),
      amortissementRestant: Math.round(amortissementCetteAnnee),
      alerteAmortissement,
    });
  }

  // Si le cashflow est positif dès la première année
  if (projections[0]?.cashflowAnnuel >= 0 && anneeAutofinancement === null) {
    anneeAutofinancement = 1;
  }

  return {
    projections,
    anneeAutofinancement,
    anneeFinAmortissement,
    totalCashflow15Ans: Math.round(cashflowCumule),
    capitalRestantFinal: Math.round(projections[14]?.capitalRestantDu || 0),
  };
}
