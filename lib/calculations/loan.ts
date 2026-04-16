export interface AmortizationMonth {
  mois: number;
  mensualite: number;
  partCapital: number;
  partInterets: number;
  capitalRestantDu: number;
}

export interface AmortizationYear {
  annee: number;
  mensualites: number;
  capitalAmorti: number;
  interetsPayes: number;
  capitalRestantDu: number;
}

/**
 * Retrouve le capital emprunté (Principal) à partir de la mensualité, du taux et de la durée.
 * Formule: P = M / ( (r) / (1 - (1+r)^-n) )
 */
export function getPrincipalFromMensualite(
  mensualite: number,
  tauxAnnuel: number,
  dureeAnnees: number
): number {
  if (mensualite <= 0 || tauxAnnuel <= 0 || dureeAnnees <= 0) return 0;
  const r = (tauxAnnuel / 100) / 12; // taux mensuel décimal
  const n = dureeAnnees * 12;        // nombre total de mensualités

  const factor = r / (1 - Math.pow(1 + r, -n));
  return mensualite / factor;
}

/**
 * Génère le tableau d'amortissement mois par mois.
 * M = P * (r / (1 - (1 + r)^-n))
 */
export function generateAmortizationSchedule(
  montantEmprunte: number,
  tauxAnnuel: number, // en % (ex: 2.0 pour 2%)
  dureeAnnees: number
): AmortizationMonth[] {
  if (montantEmprunte <= 0 || tauxAnnuel <= 0 || dureeAnnees <= 0) {
    return [];
  }

  const r = (tauxAnnuel / 100) / 12;
  const n = dureeAnnees * 12;
  
  const mensualite = montantEmprunte * (r / (1 - Math.pow(1 + r, -n)));
  const schedule: AmortizationMonth[] = [];
  let capitalRestantDu = montantEmprunte;

  for (let mois = 1; mois <= n; mois++) {
    const partInterets = capitalRestantDu * r;
    const partCapital = mensualite - partInterets;
    capitalRestantDu -= partCapital;

    // Éviter un capital restant négatif dû aux erreurs de précision flottante
    if (capitalRestantDu < 0 && capitalRestantDu > -0.1) {
      capitalRestantDu = 0;
    }

    schedule.push({
      mois,
      mensualite,
      partCapital,
      partInterets,
      capitalRestantDu: Math.max(0, capitalRestantDu),
    });
  }

  return schedule;
}

/**
 * Agrége le tableau d'amortissement mensuel en un résumé annuel (Année 1, Année 2...).
 */
export function getAnnualAmortization(schedule: AmortizationMonth[]): AmortizationYear[] {
  const years: AmortizationYear[] = [];
  let currentInterests = 0;
  let currentCapital = 0;
  let currentMensualites = 0;

  schedule.forEach((month) => {
    currentInterests += month.partInterets;
    currentCapital += month.partCapital;
    currentMensualites += month.mensualite;
    
    // À la fin de chaque année (mois 12, 24, 36...)
    if (month.mois % 12 === 0) {
      years.push({
        annee: month.mois / 12,
        mensualites: currentMensualites,
        capitalAmorti: currentCapital,
        interetsPayes: currentInterests,
        capitalRestantDu: month.capitalRestantDu,
      });
      currentInterests = 0;
      currentCapital = 0;
      currentMensualites = 0;
    }
  });

  // Gérer si le nombre de mois n'est pas un multiple de 12
  if (schedule.length > 0 && schedule.length % 12 !== 0) {
    const lastMonth = schedule[schedule.length - 1];
    years.push({
      annee: Math.floor(lastMonth.mois / 12) + 1,
      mensualites: currentMensualites,
      capitalAmorti: currentCapital,
      interetsPayes: currentInterests,
      capitalRestantDu: lastMonth.capitalRestantDu,
    });
  }

  return years;
}
