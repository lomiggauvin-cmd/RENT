// ============================================================
// RentaVision — Configuration des charges par défaut
//
// Fichier unique pour modifier facilement les valeurs de base
// utilisées dans tous les moteurs de calcul.
// ============================================================

export const DEFAULT_CHARGES = {
  // Abonnement internet fibré inclus dans la location
  internetMensuel: 30,          // €/mois

  // Assurance Propriétaire Non-Occupant (valeur par défaut si non saisie)
  assurancePnoAnnuelle: 150,    // €/an

  // Consommables kit d'accueil (PQ, savon, thé, café…) — courte durée uniquement
  consommablesLcdMensuel: 15,   // €/mois

  // Taux de vacance locative longue durée (logement inoccupé entre deux baux)
  vacanceLocativeLld: 0.07,     // 7% des revenus bruts annuels

  // Prix de l'eau (tarif moyen France 2024, charges comprises)
  prixEauM3: 4.10,              // €/m³

  // Prix du kWh électricité (tarif réglementé France 2024)
  prixKwh: 0.25,                // €/kWh
} as const;

export type DefaultCharges = typeof DEFAULT_CHARGES;
