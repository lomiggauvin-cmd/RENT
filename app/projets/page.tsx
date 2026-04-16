'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Plus, Pencil, Trash2, Rocket, RefreshCw, Filter,
  TrendingUp, ShieldCheck, Scale, Loader2, FolderOpen, Check, X
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import AuthModal from '@/components/layout/AuthModal';
import { useAuth } from '@/components/layout/AuthProvider';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatPercent } from '@/lib/calculations/scenarios';
import type { Project } from '@/types';

type ScenarioColor = { color: string; label: string; Icon: React.ElementType };

const SCENARIO_CONFIG: Record<string, ScenarioColor> = {
  long_term: { color: '#3b82f6', label: 'Longue Durée', Icon: ShieldCheck },
  short_term: { color: '#f59e0b', label: 'Courte Durée', Icon: TrendingUp },
  mixed: { color: '#8b5cf6', label: 'Mixte', Icon: Scale },
};

function getBestScenario(project: Project): ScenarioColor & { cashflow: number; yield: number } {
  const scenarios = project.scenario_results ?? [];
  const best = scenarios.reduce((a, b) => (a.monthly_cash_flow > b.monthly_cash_flow ? a : b), scenarios[0]);
  if (!best) return { ...SCENARIO_CONFIG.long_term, cashflow: 0, yield: 0 };
  const cfg = SCENARIO_CONFIG[best.scenario_type] ?? SCENARIO_CONFIG.long_term;
  return { ...cfg, cashflow: best.monthly_cash_flow, yield: best.net_yield };
}

export default function ProjetsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<Project | null>(null);
  const [renameModal, setRenameModal] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
      setLoading(false);
      return;
    }
    if (user) fetchProjects();
  }, [user, authLoading]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/projects?id=${deleteModal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      setProjects(p => p.filter(x => x.id !== deleteModal.id));
      setDeleteModal(null);
    } catch { /* ignore */ } finally { setActionLoading(false); }
  };

  const handleRename = async () => {
    if (!renameModal || !renameValue.trim()) return;
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/projects?id=${renameModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      setProjects(p => p.map(x => x.id === renameModal.id ? { ...x, name: renameValue.trim() } : x));
      setRenameModal(null);
      setRenameValue('');
    } catch { /* ignore */ } finally { setActionLoading(false); }
  };

  const handleReload = (project: Project) => {
    // Reconstruct results from saved data and navigate
    const scenarioResults = project.scenario_results ?? [];
    const toResult = (type: string) => {
      const s = scenarioResults.find(r => r.scenario_type === type);
      if (!s) return null;
      return {
        type, grossYield: s.gross_yield, netYield: s.net_yield,
        monthlyCashFlow: s.monthly_cash_flow, annualCashFlow: s.annual_cash_flow,
        optimalFiscalRegime: s.optimal_fiscal_regime, annualTaxAmount: s.annual_tax_amount,
        isRecommended: s.is_recommended, breakdown: {} as unknown,
        fifteenYearProjection: s.fifteen_year_projection,
      };
    };
    const results = {
      longTerm: toResult('long_term'),
      shortTerm: toResult('short_term'),
      mixed: toResult('mixed'),
      market: project.market_data,
      withLoan: project.financing_details?.has_loan ?? false,
    };
    const formData = {
      property: {
        address: project.property_address, city: project.property_city,
        propertyType: project.property_type, surfaceM2: project.surface_m2,
        purchasePrice: project.purchase_price, dpeRating: project.dpe_rating,
        propertyCondition: project.property_condition,
      },
      financing: project.financing_details ? {
        hasLoan: project.financing_details.has_loan,
        loanAmount: project.financing_details.loan_amount,
        loanDurationYears: project.financing_details.loan_duration_years,
        interestRate: project.financing_details.interest_rate,
        monthlyPayment: project.financing_details.monthly_payment,
        insuranceMonthlyAmount: project.financing_details.insurance_monthly_amount,
      } : { hasLoan: false, loanAmount: 0, loanDurationYears: 20, interestRate: 0, monthlyPayment: 0, insuranceMonthlyAmount: 0 },
      works: project.works_furniture ? {
        renovationCost: project.works_furniture.renovation_cost,
        furnitureCost: project.works_furniture.furniture_cost,
        startDate: project.works_furniture.start_date,
      } : { renovationCost: 0, furnitureCost: 0, startDate: '' },
      fiscal: { tmi: 30, familyParts: 1 },
      advanced: project.advanced_parameters ? {
        rentInflationRate: project.advanced_parameters.rent_inflation_rate,
        propertyAppreciationRate: project.advanced_parameters.property_appreciation_rate,
        expenseGrowthRate: project.advanced_parameters.expense_growth_rate,
      } : { rentInflationRate: 0.02, propertyAppreciationRate: 0.025, expenseGrowthRate: 0.015 },
      market: project.market_data ?? {},
    };
    localStorage.setItem('rentavision_results', JSON.stringify(results));
    localStorage.setItem('rentavision_form', JSON.stringify(formData));
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0c1222] font-['Inter'] text-[#f8fafc]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-8 pt-28 pb-16">

        {/* ─── Header ─── */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-white/[0.08] pb-6">
          <div>
            <h1 className="font-['DM_Sans'] text-3xl font-bold text-[#f8fafc] tracking-tight">Mes Projets d'Investissement</h1>
            <p className="font-['Inter'] text-[#94a3b8] text-sm mt-1">Gérez et comparez vos analyses patrimoniales</p>
          </div>
          <div className="flex items-center gap-4">
            {projects.length > 0 && (
              <button className="px-5 py-2.5 rounded-lg border border-white/[0.10] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/[0.05] font-['Inter'] text-sm font-medium transition-all flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filtrer
              </button>
            )}
            <button
              onClick={() => user ? router.push('/simulation') : setShowAuthModal(true)}
              className="px-5 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#34d399] text-[#0c1222] text-sm font-['Inter'] font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nouvelle Analyse
            </button>
          </div>
        </header>

        {/* ─── Content ─── */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
          </div>
        ) : !user ? (
          /* Not logged in */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#3b82f6]/20 to-[#8b5cf6]/20 border border-white/[0.10] flex items-center justify-center mb-6">
              <FolderOpen className="w-10 h-10 text-[#60a5fa]" />
            </div>
            <h2 className="font-['DM_Sans'] text-2xl font-bold text-[#f8fafc] mb-3">Connectez-vous pour voir vos projets</h2>
            <p className="text-[#94a3b8] font-['Inter'] mb-8 max-w-md">Vos simulations sauvegardées apparaîtront ici.</p>
            <button onClick={() => setShowAuthModal(true)} className="px-8 py-4 rounded-full bg-[#10b981] hover:bg-[#34d399] text-[#0c1222] font-['Inter'] font-bold transition-all">
              Se connecter
            </button>
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#3b82f6]/20 to-[#8b5cf6]/20 border border-white/[0.10] flex items-center justify-center mb-8 shadow-2xl">
              <FolderOpen className="w-12 h-12 text-[#60a5fa]" />
            </div>
            <h2 className="font-['DM_Sans'] text-2xl font-bold text-[#f8fafc] mb-3">Vous n'avez pas encore de projet sauvegardé</h2>
            <p className="text-[#94a3b8] font-['Inter'] mb-8 max-w-md">
              Lancez votre première simulation et sauvegardez-la pour la retrouver ici.
            </p>
            <button onClick={() => router.push('/simulation')} className="px-8 py-4 rounded-full bg-[#10b981] hover:bg-[#34d399] text-[#0c1222] font-['Inter'] font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              Créer ma première analyse
            </button>
          </div>
        ) : (
          /* Projects grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => {
              const best = getBestScenario(project);
              const cfColor = best.cashflow > 0 ? 'text-[#10b981]' : 'text-[#ef4444]';
              return (
                <div key={project.id} className="group relative rounded-2xl bg-[#0f172a] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02] hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 overflow-hidden flex flex-col">
                  {/* Accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 opacity-80" style={{ backgroundColor: best.color }} />

                  {/* Header */}
                  <div className="p-6 pb-4 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-[#94a3b8]" />
                        <h3 className="font-['DM_Sans'] font-bold text-[#f8fafc] text-lg truncate">{project.name}</h3>
                      </div>
                      <p className="text-xs text-[#64748b] font-['Inter'] mb-3 truncate">{project.property_address}</p>
                      <div className="flex items-center gap-2 text-xs font-['Inter'] text-[#94a3b8]">
                        <span className="bg-white/[0.03] px-2 py-1 rounded border border-white/[0.05]">{project.surface_m2} m²</span>
                        <span className="bg-white/[0.03] px-2 py-1 rounded border border-white/[0.05]">{(project.purchase_price / 1000).toFixed(0)}k€</span>
                        <span className="bg-white/[0.03] px-2 py-1 rounded border border-white/[0.05]">DPE {project.dpe_rating}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="px-2 py-1 rounded text-[10px] font-bold font-['Inter'] uppercase tracking-wider border"
                        style={{ color: best.color, backgroundColor: `${best.color}15`, borderColor: `${best.color}30` }}>
                        {best.label}
                      </div>
                      <button onClick={() => { setRenameModal(project); setRenameValue(project.name); }}
                        className="p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/[0.05] transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="px-6 pb-4 grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="text-[10px] text-[#94a3b8] font-['Inter'] uppercase tracking-wider mb-1">Cash-flow/mois</div>
                      <div className={`text-lg font-['JetBrains_Mono'] font-bold ${cfColor}`}>
                        {best.cashflow > 0 ? '+' : ''}{Math.round(best.cashflow)} €
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="text-[10px] text-[#94a3b8] font-['Inter'] uppercase tracking-wider mb-1">Rendement net</div>
                      <div className="text-lg font-['JetBrains_Mono'] font-bold text-[#10b981]">{formatPercent(best.yield)}</div>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="px-6 pb-4">
                    <p className="text-[10px] text-[#64748b] font-['Inter']">
                      Créé le {new Date(project.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto px-6 pb-6 flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                    <button
                      onClick={() => handleReload(project)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] font-['Inter'] text-sm font-medium hover:bg-[#3b82f6]/20 transition-all"
                    >
                      <Rocket className="w-4 h-4" /> Lancer
                    </button>
                    <button
                      onClick={() => handleReload(project)}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/[0.05] transition-all"
                      title="Recharger"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteModal(project)}
                      className="p-2.5 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Delete Modal ─── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0c1222]/80 backdrop-blur-md" onClick={() => setDeleteModal(null)} />
          <div className="relative bg-[#0f172a] border border-white/[0.10] rounded-2xl w-full max-w-md p-8 shadow-2xl animate-fade-in-down">
            <div className="w-12 h-12 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-[#ef4444]" />
            </div>
            <h3 className="font-['DM_Sans'] text-xl font-bold text-[#f8fafc] text-center mb-2">Supprimer ce projet ?</h3>
            <p className="text-[#94a3b8] font-['Inter'] text-sm text-center mb-8">
              Le projet <strong className="text-[#f8fafc]">"{deleteModal.name}"</strong> sera définitivement supprimé.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-3 rounded-xl border border-white/[0.10] text-[#94a3b8] font-['Inter'] font-medium hover:text-[#f8fafc] hover:bg-white/[0.05] transition-colors">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={actionLoading} className="flex-1 py-3 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white font-['Inter'] font-bold transition-colors flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Rename Modal ─── */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0c1222]/80 backdrop-blur-md" onClick={() => setRenameModal(null)} />
          <div className="relative bg-[#0f172a] border border-white/[0.10] rounded-2xl w-full max-w-md p-8 shadow-2xl animate-fade-in-down">
            <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center mx-auto mb-4">
              <Pencil className="w-6 h-6 text-[#3b82f6]" />
            </div>
            <h3 className="font-['DM_Sans'] text-xl font-bold text-[#f8fafc] text-center mb-6">Renommer le projet</h3>
            <input
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['Inter'] focus:outline-none focus:border-[#3b82f6] transition-colors mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setRenameModal(null)} className="flex-1 py-3 rounded-xl border border-white/[0.10] text-[#94a3b8] font-['Inter'] font-medium hover:text-[#f8fafc] hover:bg-white/[0.05] transition-colors">
                Annuler
              </button>
              <button onClick={handleRename} disabled={actionLoading || !renameValue.trim()} className="flex-1 py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-['Inter'] font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} redirectTo="/projets" />
      )}
    </div>
  );
}
