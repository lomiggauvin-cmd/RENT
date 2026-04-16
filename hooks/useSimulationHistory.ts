'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PropertyInputs, AnalysisResult } from '@/lib/taxCalculator';
import type { MarketDataResponse } from '@/lib/market-api';

// ============================================================
// Historique des simulations — stockage localStorage
// Clé : rentavision_history  (tableau d'HistoryEntry)
// Déclenchement : uniquement sur clic "Sauvegarder" (dashboard)
// ============================================================

export interface HistoryEntry {
  id: string;
  name: string;                  // nom du projet (éditable)
  timestamp: string;             // ISO date de la dernière sauvegarde
  propertyValue: number;         // prix du bien
  surface: number;               // m²
  dpe: string;                   // classe DPE
  codePostal: string;
  // Résultats clés pour les mini-cartes
  bestScenarioType: 'longue' | 'courte' | 'mixte';
  rendementBrut: number;
  rendementNet: number;
  cashflowLD: number;
  cashflowCD: number;
  cashflowMixte: number;
  // Données complètes pour recharger les résultats directement dans le dashboard
  inputs: PropertyInputs;
  market: MarketDataResponse;
  results: AnalysisResult;
}

const STORAGE_KEY = 'rentavision_history';
const MAX_ENTRIES = 20;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function readFromStorage(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota exceeded — on ignore silencieusement
  }
}

export function useSimulationHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Lecture initiale côté client uniquement (évite les erreurs d'hydratation SSR)
  useEffect(() => {
    setHistory(readFromStorage());
    setHydrated(true);
  }, []);

  /**
   * Sauvegarde une simulation dans l'historique avec le nom fourni.
   * Si une entrée avec le même id existe déjà (re-save), elle est mise à jour.
   * Sinon une nouvelle entrée est créée en tête de liste.
   */
  const saveToHistory = useCallback(
    (
      name: string,
      inputs: PropertyInputs,
      results: AnalysisResult,
      market: MarketDataResponse,
      existingId?: string
    ) => {
      const scenarios = results.scenarios;
      const best = results.meilleurScenario;

      const scenarioLD = scenarios.find((s) => s.type === 'longue');
      const scenarioCD = scenarios.find((s) => s.type === 'courte');
      const scenarioMixte = scenarios.find((s) => s.type === 'mixte');

      const entry: HistoryEntry = {
        id: existingId ?? generateId(),
        name: name.trim() || `${inputs.codePostal || 'Projet'} — ${inputs.surface}m²`,
        timestamp: new Date().toISOString(),
        codePostal: inputs.codePostal,
        propertyValue: inputs.propertyValue,
        surface: inputs.surface,
        dpe: inputs.dpe,
        bestScenarioType: best.type,
        rendementBrut: best.rendementBrut,
        rendementNet: best.rendementNet,
        cashflowLD: scenarioLD?.cashflowNetMensuel ?? 0,
        cashflowCD: scenarioCD?.cashflowNetMensuel ?? 0,
        cashflowMixte: scenarioMixte?.cashflowNetMensuel ?? 0,
        inputs,
        market,
        results,
      };

      setHistory((prev) => {
        // Si re-save d'une entrée existante : on la remplace à sa position
        const idx = existingId ? prev.findIndex((e) => e.id === existingId) : -1;
        let updated: HistoryEntry[];
        if (idx >= 0) {
          updated = [...prev];
          updated[idx] = entry;
        } else {
          // Nouvelle entrée en tête, max MAX_ENTRIES
          updated = [entry, ...prev].slice(0, MAX_ENTRIES);
        }
        writeToStorage(updated);
        return updated;
      });

      return entry.id;
    },
    []
  );

  /** Renomme une entrée sans modifier les données */
  const updateName = useCallback((id: string, newName: string) => {
    setHistory((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, name: newName.trim() || e.name } : e
      );
      writeToStorage(updated);
      return updated;
    });
  }, []);

  /** Supprime une entrée par son id */
  const deleteEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      writeToStorage(updated);
      return updated;
    });
  }, []);

  /** Vide tout l'historique */
  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  /**
   * Charge une entrée directement dans le dashboard :
   * remet results + inputs + market dans le localStorage principal.
   * L'appelant fait router.push('/dashboard').
   */
  const loadEntryToDashboard = useCallback((entry: HistoryEntry) => {
    localStorage.setItem('rentavision_results', JSON.stringify(entry.results));
    localStorage.setItem('rentavision_inputs', JSON.stringify(entry.inputs));
    localStorage.setItem('rentavision_market', JSON.stringify(entry.market));
  }, []);

  return {
    history,
    hydrated,
    saveToHistory,
    updateName,
    deleteEntry,
    clearHistory,
    loadEntryToDashboard,
  };
}
