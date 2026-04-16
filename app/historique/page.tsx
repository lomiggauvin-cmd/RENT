'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, Trash2, PlayCircle, TrendingUp, Home, AlertCircle,
  History, ArrowRight, Pencil, Check, X,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { useSimulationHistory, type HistoryEntry } from '@/hooks/useSimulationHistory';

// ── Helpers ──────────────────────────────────────────────────

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

const DPE_COLORS: Record<string, string> = {
  A: 'text-emerald-400 border-emerald-400',
  B: 'text-green-400 border-green-400',
  C: 'text-yellow-400 border-yellow-400',
  D: 'text-orange-400 border-orange-400',
  E: 'text-orange-500 border-orange-500',
  F: 'text-red-500 border-red-500',
  G: 'text-red-600 border-red-600',
};

const SCENARIO_LABELS: Record<string, string> = {
  longue: 'LLD',
  courte: 'LCD',
  mixte: 'Mixte',
};

const SCENARIO_COLORS: Record<string, string> = {
  longue: 'bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30',
  courte: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30',
  mixte: 'bg-[#8b5cf6]/15 text-[#8b5cf6] border-[#8b5cf6]/30',
};

// ── CashFlow line ─────────────────────────────────────────────

function CashFlowRow({ label, value }: { label: string; value: number }) {
  const positive = value >= 0;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#64748b] font-['Inter']">{label}</span>
      <span className={`font-bold font-['JetBrains_Mono'] ${positive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
        {positive ? '+' : ''}{formatCurrency(value)}/m
      </span>
    </div>
  );
}

// ── Nom éditable inline ───────────────────────────────────────

function EditableName({
  id,
  name,
  onSave,
}: {
  id: string;
  name: string;
  onSave: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onSave(id, trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          className="flex-1 min-w-0 bg-white/[0.06] border border-[#3b82f6]/40 rounded-lg px-2.5 py-1 text-sm font-['Inter'] text-[#f8fafc] outline-none focus:border-[#3b82f6]"
        />
        <button onClick={commit} className="p-1 rounded hover:bg-[#10b981]/10 text-[#10b981] transition-colors">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancel} className="p-1 rounded hover:bg-white/[0.05] text-[#64748b] transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0 group/name">
      <span className="text-sm font-semibold font-['Inter'] text-[#f8fafc] truncate">{name}</span>
      <button
        onClick={() => { setDraft(name); setEditing(true); }}
        className="p-1 rounded text-[#475569] hover:text-[#94a3b8] opacity-0 group-hover/name:opacity-100 transition-all shrink-0"
        title="Renommer"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Mini-carte d'une simulation ───────────────────────────────

function SimulationCard({
  entry,
  onLoad,
  onDelete,
  onRename,
}: {
  entry: HistoryEntry;
  onLoad: (e: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  return (
    <div className="group relative bg-[#0f172a] border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.16] transition-all duration-200 flex flex-col gap-4">

      {/* Header : nom éditable + DPE + poubelle */}
      <div className="flex items-start gap-2">
        <EditableName id={entry.id} name={entry.name} onSave={onRename} />
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`w-7 h-7 rounded-lg border text-xs font-bold font-['JetBrains_Mono'] flex items-center justify-center ${
              DPE_COLORS[entry.dpe] ?? 'text-[#94a3b8] border-[#94a3b8]'
            }`}
          >
            {entry.dpe}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors opacity-0 group-hover:opacity-100"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sous-titre : adresse + surface */}
      <div className="flex items-center gap-1.5 -mt-2">
        <Home className="w-3.5 h-3.5 text-[#475569] shrink-0" />
        <span className="text-xs text-[#64748b] font-['Inter'] truncate">
          {entry.codePostal} · {entry.surface} m² · {entry.propertyValue > 0 ? formatCurrency(entry.propertyValue) : '—'}
        </span>
      </div>

      {/* Meilleur scénario */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
        <span className="text-[11px] text-[#94a3b8] font-['Inter']">Meilleur scénario</span>
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold font-['Inter'] ${SCENARIO_COLORS[entry.bestScenarioType]}`}>
          {SCENARIO_LABELS[entry.bestScenarioType]}
        </span>
      </div>

      {/* Rendements */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl bg-white/[0.03] text-center">
          <p className="text-[10px] text-[#64748b] font-['Inter'] mb-0.5">Rdt brut</p>
          <p className="text-sm font-bold font-['JetBrains_Mono'] text-[#f8fafc]">{entry.rendementBrut.toFixed(2)}%</p>
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.03] text-center">
          <p className="text-[10px] text-[#64748b] font-['Inter'] mb-0.5">Rdt net</p>
          <p className="text-sm font-bold font-['JetBrains_Mono'] text-[#f8fafc]">{entry.rendementNet.toFixed(2)}%</p>
        </div>
      </div>

      {/* Cash-flows */}
      <div className="flex flex-col gap-1.5 py-3 border-t border-b border-white/[0.06]">
        <CashFlowRow label="Location Longue Durée" value={entry.cashflowLD} />
        <CashFlowRow label="Location Courte Durée" value={entry.cashflowCD} />
        <CashFlowRow label="Stratégie Mixte" value={entry.cashflowMixte} />
      </div>

      {/* Footer : date + bouton charger */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] text-[#475569] font-['Inter']">
          <Clock className="w-3 h-3" />
          {formatDate(entry.timestamp)}
        </span>
        <button
          onClick={() => onLoad(entry)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] text-xs font-['Inter'] font-semibold transition-colors"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          Charger les résultats
        </button>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────

export default function HistoriquePage() {
  const router = useRouter();
  const { history, hydrated, deleteEntry, clearHistory, updateName, loadEntryToDashboard } =
    useSimulationHistory();

  const handleLoad = (entry: HistoryEntry) => {
    loadEntryToDashboard(entry);
    router.push('/dashboard');
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#060d1a] pt-20">
        <div className="max-w-6xl mx-auto px-6 py-12">

          {/* Header */}
          <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3b82f6]/20 to-[#8b5cf6]/20 border border-white/[0.08] flex items-center justify-center">
                <History className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <div>
                <h1 className="font-['DM_Sans'] font-bold text-2xl text-[#f8fafc]">
                  Historique des simulations
                </h1>
                <p className="text-sm text-[#64748b] font-['Inter'] mt-0.5">
                  {hydrated
                    ? history.length === 0
                      ? 'Aucune simulation sauvegardée'
                      : `${history.length} simulation${history.length > 1 ? 's' : ''} sauvegardée${history.length > 1 ? 's' : ''} — cliquez sur le crayon pour renommer`
                    : '…'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hydrated && history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#ef4444]/30 text-[#ef4444] text-sm font-['Inter'] font-medium hover:bg-[#ef4444]/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Tout supprimer
                </button>
              )}
              <button
                onClick={() => router.push('/simulation')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#0c1222] text-sm font-['Inter'] font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                Nouvelle analyse
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* État vide */}
          {hydrated && history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-[#334155]" />
              </div>
              <div>
                <p className="text-lg font-['DM_Sans'] font-semibold text-[#f8fafc] mb-2">
                  Aucune simulation dans l&apos;historique
                </p>
                <p className="text-sm text-[#64748b] font-['Inter'] max-w-sm">
                  Lancez une analyse, puis cliquez sur le bouton{' '}
                  <span className="text-[#f8fafc] font-semibold">Sauvegarder</span>{' '}
                  dans le tableau de bord pour l&apos;enregistrer ici.
                </p>
              </div>
              <button
                onClick={() => router.push('/simulation')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#3b82f6] text-sm font-['Inter'] font-semibold transition-colors"
              >
                Lancer une analyse
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Skeleton SSR */}
          {!hydrated && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-80 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
              ))}
            </div>
          )}

          {/* Grille */}
          {hydrated && history.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {history.map((entry) => (
                <SimulationCard
                  key={entry.id}
                  entry={entry}
                  onLoad={handleLoad}
                  onDelete={deleteEntry}
                  onRename={updateName}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
