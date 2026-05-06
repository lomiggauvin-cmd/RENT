'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck, TrendingUp, Scale, Star, SlidersHorizontal, Calendar,
  AlertTriangle, Info, XCircle, Sun, Cloud, Users, Zap, TrendingDown,
  ChevronDown, Pencil, Save, Plus,
  Check, X, BarChart3, Loader2, Eye
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, LabelList
} from 'recharts';
import Navbar from '@/components/layout/Navbar';
import { runAnalysis, getSeasonalityMatrix, getDynamicPriceMultiplier } from '@/lib/taxCalculator';
import { calculate15YearProjection } from '@/lib/projectionEngine';
import { getPrincipalFromMensualite } from '@/lib/calculations/loan';
import { DEFAULT_CHARGES } from '@/lib/calculations/defaultCharges';
import { useSimulationHistory } from '@/hooks/useSimulationHistory';
import type { AnalysisResult, ScenarioResult, TaxRegime, PropertyInputs, MarketDataLongTerm, MarketDataShortTerm, ShortTermFees } from '@/lib/taxCalculator';
import type { MarketDataResponse } from '@/lib/market-api';

const MONTHS = [
  { key: 'Janvier', short: 'Jan' }, { key: 'Février', short: 'Fév' },
  { key: 'Mars', short: 'Mar' }, { key: 'Avril', short: 'Avr' },
  { key: 'Mai', short: 'Mai' }, { key: 'Juin', short: 'Juin', summer: true },
  { key: 'Juillet', short: 'Juil', summer: true }, { key: 'Août', short: 'Août', summer: true },
  { key: 'Septembre', short: 'Sep' }, { key: 'Octobre', short: 'Oct' },
  { key: 'Novembre', short: 'Nov' }, { key: 'Décembre', short: 'Déc' },
];
const SUMMER_MONTHS = ['Juin', 'Juillet', 'Août'];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n));
}
function formatPercent(n: number): string {
  return `${n.toFixed(2)}%`;
}

// ─── Slider ──────────────────────────────────────────────────
function Slider({ value, min, max, step = 1, onChange, color = '#f59e0b' }: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative h-5 flex items-center">
      <div className="absolute w-full h-1.5 rounded-full bg-white/[0.08]" />
      <div className="absolute h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="absolute w-full opacity-0 h-5 cursor-pointer z-10" />
      <div className="absolute w-4 h-4 rounded-full border-2 bg-white shadow-md pointer-events-none transition-all"
        style={{ left: `calc(${pct}% - 8px)`, borderColor: color }} />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { saveToHistory } = useSimulationHistory();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [inputs, setInputs] = useState<PropertyInputs | null>(null);
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null);
  const [withLoan, setWithLoan] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fiscalDetailScenario, setFiscalDetailScenario] = useState<ScenarioResult | null>(null);

  // Editable project name
  const [projectName, setProjectName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftAddress, setDraftAddress] = useState<{ address?: string; selectedQuartier?: { nom: string } }>({});

  // Amortization Table Modal
  const [showAmortizationTable, setShowAmortizationTable] = useState(false);

  // Short term interactive fees
  const [conciergeFee, setConciergeFee] = useState(20); // percent
  const [cleaningFee, setCleaningFee] = useState(35); // €
  const [avgStayLength, setAvgStayLength] = useState(3);
  const [personalUseDays, setPersonalUseDays] = useState(0);
  const [personalUseMonths, setPersonalUseMonths] = useState<string[]>([]);

  // Load from localStorage
  useEffect(() => {
    try {
      const r = localStorage.getItem('rentavision_results');
      const inp = localStorage.getItem('rentavision_inputs');
      const mkt = localStorage.getItem('rentavision_market');
      if (r) { const parsed = JSON.parse(r); setAnalysisResult(parsed); setWithLoan(parsed.inputs.hasOngoingLoan); }
      if (inp) {
        const parsedInputs = JSON.parse(inp);
        setInputs(parsedInputs);
        // Initialize project name from inputs
        setProjectName(`${parsedInputs.codePostal || 'Projet'} — ${parsedInputs.surface}m²`);
      }
      if (mkt) setMarketData(JSON.parse(mkt));
      // Read address/quartier from draft for enriched header
      const draftRaw = localStorage.getItem('rentavision_draft');
      if (draftRaw) {
        const d = JSON.parse(draftRaw);
        setDraftAddress({ address: d.address, selectedQuartier: d.selectedQuartier });
      }
    } catch { router.push('/simulation'); }
  }, [router]);

  // Live re-analysis when fees or loan toggle change
  const liveResult = useMemo(() => {
    if (!inputs || !marketData) return analysisResult;
    const adjustedInputs = { ...inputs };
    if (!withLoan) {
      adjustedInputs.hasOngoingLoan = false;
      adjustedInputs.mensualiteCredit = 0;
    }
    const fees: ShortTermFees = {
      conciergeFee,
      cleaningFeePerStay: cleaningFee,
      averageStayLength: avgStayLength,
      personalUseDays,
      personalUseMonths,
    };
    try {
      return runAnalysis(adjustedInputs, marketData.long, marketData.short, { fees });
    } catch {
      return analysisResult;
    }
  }, [inputs, marketData, withLoan, conciergeFee, cleaningFee, avgStayLength, personalUseDays, analysisResult]);

  const toggleMonth = (month: string) => {
    const already = personalUseMonths.includes(month);
    const newMonths = already
      ? personalUseMonths.filter(m => m !== month)
      : [...personalUseMonths, month];
    setPersonalUseMonths(newMonths);
    setPersonalUseDays(newMonths.length * 30);
  };

  const handleSave = async () => {
    if (!analysisResult || !inputs || !marketData) {
      setSaveError('Données manquantes. Veuillez relancer l\'analyse.');
      setTimeout(() => setSaveError(null), 5000);
      return;
    }

    setSaving(true);
    setSaveError(null);

    saveToHistory(
      projectName || `${inputs.codePostal} — ${inputs.surface}m²`,
      inputs,
      analysisResult,
      marketData
    );

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!liveResult || !inputs || !marketData) {
    return (
      <div className="min-h-screen bg-[#0c1222] flex items-center justify-center">
        <Navbar />
        <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
      </div>
    );
  }

  // Extract scenarios from the analysis result
  const scenarioLD = liveResult.scenarios.find(s => s.type === 'longue')!;
  const scenarioCD = liveResult.scenarios.find(s => s.type === 'courte')!;
  const scenarioMixte = liveResult.scenarios.find(s => s.type === 'mixte')!;
  const meilleur = liveResult.meilleurScenario;

  const scenarios = [
    { key: 'lt', s: scenarioLD, title: scenarioLD.label, subtitle: scenarioLD.subtitle, Icon: ShieldCheck, color: '#3b82f6', accentBg: 'bg-[#3b82f6]/5', accentBorder: 'border-[#3b82f6]/30' },
    { key: 'st', s: scenarioCD, title: scenarioCD.label, subtitle: scenarioCD.subtitle, Icon: TrendingUp, color: '#f59e0b', accentBg: 'bg-[#f59e0b]/5', accentBorder: 'border-[#f59e0b]/30' },
    { key: 'mx', s: scenarioMixte, title: scenarioMixte.label, subtitle: scenarioMixte.subtitle, Icon: Scale, color: '#8b5cf6', accentBg: 'bg-[#8b5cf6]/5', accentBorder: 'border-[#8b5cf6]/30' },
  ];

  const bestCF = meilleur.cashflowNetMensuel;
  const hasPersonalUse = personalUseMonths.length > 0;
  const hasWinterPersonalUse = personalUseMonths.some(m => !SUMMER_MONTHS.includes(m));

  // Occupancy chart : données mensuelles locales si disponibles, sinon matrice dérivée
  const seasonality = getSeasonalityMatrix(marketData.short.tauxOccupationAnnuel, marketData.short.monthlyOccupancy);
  const adr = marketData.short.adr;
  const occupancyData = seasonality.map((m, i) => {
    const multiplier = getDynamicPriceMultiplier(m.occupancyRate);
    const effectiveAdr = Math.round(adr * multiplier);
    const nights = Math.round(m.days * m.occupancyRate);
    return {
      month: m.name,
      taux: Math.round(m.occupancyRate * 100),
      summer: m.isSummer,
      selected: personalUseMonths.includes(MONTHS[i]?.key ?? ''),
      ca: nights * effectiveAdr,       // CA brut mensuel estimé
      effectiveAdr,                    // ADR dynamique du mois
      nights,                          // nuits louées estimées
    };
  });

  // 15-year projection from projectionEngine
  const bestScenario = meilleur;
  const isLMNPReel = bestScenario.regimeOptimal.nom.includes('LMNP') || bestScenario.regimeOptimal.nom.includes('Réel');
  const projection = calculate15YearProjection(
    bestScenario.cashflowNetAnnuel,
    bestScenario.revenuBrutAnnuel,
    bestScenario.chargesAnnuelles,
    inputs.mensualiteCredit,
    inputs.dureeCredit,
    inputs.mensualiteCredit * inputs.dureeCredit * 12,
    inputs.propertyValue,
    inputs.renovationBudget,
    inputs.meuble,
    liveResult.tmi,
    isLMNPReel,
    liveResult.amortizationYearly
  );

  // Transform projection for chart
  const projectionChartData = projection.projections.map(p => ({
    year: p.annee,
    cashflowCumule: p.cashflowCumule,
    capitalRestant: p.capitalRestantDu,
    impotAnnuel: p.impotAnnuel,
  }));

  // Lost revenue for display
  const lostRevenue = scenarioCD.opportunityCost?.lostRevenue ?? 0;

  return (
    <div className="min-h-screen bg-[#0c1222] font-['Inter'] text-[#f8fafc]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-8 pt-28 pb-16">

        {/* ═══ HEADER ═══ */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/[0.08] pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isEditingName ? (
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') setIsEditingName(false); if (e.key === 'Escape') setIsEditingName(false); }}
                  onBlur={() => setIsEditingName(false)}
                  autoFocus
                  className="font-['DM_Sans'] text-3xl font-bold text-[#f8fafc] tracking-tight bg-transparent border-b-2 border-[#3b82f6] outline-none min-w-[200px]"
                />
              ) : (
                <h1
                  className="font-['DM_Sans'] text-3xl font-bold text-[#f8fafc] tracking-tight cursor-pointer hover:text-[#3b82f6] transition-colors group"
                  onClick={() => setIsEditingName(true)}
                  title="Cliquer pour renommer"
                >
                  {projectName || (() => {
                    const city = draftAddress.address?.split(',')[0] ?? inputs.codePostal ?? 'Votre bien';
                    const quartier = draftAddress.selectedQuartier?.nom;
                    return `${city}${quartier ? `, ${quartier}` : ''} — ${inputs.surface}m²`;
                  })()}
                  <Pencil className="w-4 h-4 inline-block ml-2 opacity-0 group-hover:opacity-50 transition-opacity -translate-y-0.5" />
                </h1>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-['Inter'] font-semibold tracking-wider uppercase ${
                ['F','G'].includes(inputs.dpe)
                  ? 'bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444]'
                  : 'bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981]'
              }`}>
                DPE {inputs.dpe}
              </span>
            </div>
            <p className="font-['Inter'] text-[#94a3b8] text-sm">
              Comparaison locative sur 15 ans • TMI : {(liveResult.tmi * 100).toFixed(0)}% • {liveResult.partsFiscales} part{liveResult.partsFiscales > 1 ? 's' : ''} fiscale{liveResult.partsFiscales > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Loan toggle */}
            <div className="flex items-center bg-[#0f172a] border border-white/[0.08] rounded-full p-1">
              <button onClick={() => setWithLoan(true)} className={`px-4 py-2 rounded-full text-sm font-['Inter'] font-medium transition-all ${withLoan ? 'bg-white/10 text-[#f8fafc]' : 'text-[#94a3b8] hover:text-[#f8fafc]'}`}>
                Avec Crédit
              </button>
              <button onClick={() => setWithLoan(false)} className={`px-4 py-2 rounded-full text-sm font-['Inter'] font-medium transition-all ${!withLoan ? 'bg-white/10 text-[#f8fafc]' : 'text-[#94a3b8] hover:text-[#f8fafc]'}`}>
                Sans Crédit
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setIsEditingName(true)} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/[0.05] transition-colors" title="Renommer le projet">
                <Pencil className="w-5 h-5" />
              </button>
              <button onClick={handleSave} disabled={saving} className={`p-2 rounded-lg border transition-colors ${saved ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' : 'bg-white/[0.02] border-white/[0.06] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/[0.05]'}`} title="Sauvegarder dans l'historique">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
              </button>

            </div>
          </div>
        </header>

        {/* ═══ MARKET SUMMARY BAR ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {[
            { Icon: ShieldCheck, label: 'Loyer/m²', value: `${marketData.long.loyerMoyenM2}€/m²`, color: 'text-[#3b82f6]' },
            { Icon: Star, label: 'ADR Airbnb', value: `${marketData.short.adr}€`, color: 'text-[#f59e0b]' },
            { Icon: Calendar, label: 'Taux Remplissage', value: `${Math.round(marketData.short.tauxOccupationAnnuel * 100)}%`, color: 'text-[#10b981]' },
            { Icon: Users, label: 'Votre TMI', value: `${(liveResult.tmi * 100).toFixed(0)}%`, color: 'text-[#94a3b8]' },
            { Icon: BarChart3, label: 'Valeur du bien', value: `${inputs.propertyValue.toLocaleString('fr-FR')} €`, color: 'text-[#8b5cf6]' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-white/[0.10] transition-all">
              <div className={`p-2 rounded-lg bg-white/[0.02] ${item.color}`}>
                <item.Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[#94a3b8] text-xs font-['Inter'] uppercase tracking-wider font-medium mb-1">{item.label}</div>
                <div className="text-[#f8fafc] text-lg font-['JetBrains_Mono'] font-bold">{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ RECOMMENDATION ═══ */}
        {liveResult.recommendation && (
          <div className="mb-10 p-6 rounded-2xl bg-gradient-to-r from-[#10b981]/5 to-[#3b82f6]/5 border border-[#10b981]/20">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
              <p className="text-sm text-[#f8fafc] font-['Inter'] leading-relaxed">{liveResult.recommendation}</p>
            </div>
          </div>
        )}

        {/* ═══ 3 SCENARIO CARDS ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {scenarios.map(({ key, s, title, subtitle, Icon, color, accentBg, accentBorder }) => {
            const cf = s.cashflowNetMensuel;
            const isBest = s.type === meilleur.type;
            const cfColor = cf > 0 ? 'text-[#10b981]' : 'text-[#ef4444]';
            return (
              <div key={key} className={`relative group rounded-2xl bg-[#0f172a] border ${accentBorder} ${accentBg} p-6 flex flex-col hover:border-white/30 transition-all duration-300 overflow-hidden`}>
                <div className="absolute left-0 top-0 bottom-0 w-1 opacity-80" style={{ backgroundColor: color }} />

                {isBest && (
                  <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#d4af37] to-[#f4d03f] text-[#0c1222] text-xs font-bold font-['Inter'] shadow-lg">
                      <Star className="w-3 h-3 fill-current" /> Meilleur choix
                    </div>
                    <span className="text-[9px] font-['Inter'] text-[#d4af37] pr-1">
                      {s.rendementNet >= s.rendementBrut * 0.5 ? 'Rendement net le plus élevé' : 'Meilleur cash-flow net'}
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-3 mb-6">
                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[#f8fafc] shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-['DM_Sans'] font-bold text-white text-lg">{title}</h3>
                    <p className="text-xs text-[#94a3b8] font-['Inter'] mt-0.5">{subtitle}</p>
                  </div>
                </div>

                <div className="mb-6 space-y-4">
                  <div>
                    <div className="text-[#94a3b8] text-xs font-['Inter'] uppercase tracking-wider font-medium mb-1">Cash-flow Mensuel Net</div>
                    <div className={`text-4xl sm:text-5xl font-['JetBrains_Mono'] font-bold tracking-tight ${cfColor}`}>
                      {cf > 0 ? '+' : ''}{Math.round(cf).toLocaleString('fr-FR')} €
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-4 sm:gap-6 pt-2">
                    <div>
                      <div className="text-[#94a3b8] text-[10px] font-['Inter'] uppercase tracking-wider font-medium mb-1">Rendement</div>
                      <div className="text-2xl font-['JetBrains_Mono'] font-bold text-white">
                        {formatPercent(s.rendementNet)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#94a3b8] text-[10px] font-['Inter'] uppercase tracking-wider font-medium mb-1">Régime</div>
                      <div className="text-[17px] font-['Inter'] font-bold text-white uppercase tracking-tight">
                        {s.regimeOptimal.nom}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-white/[0.05] space-y-2">
                  {/* Mixte: split LD / CD */}
                  {key === 'mx' && s.mixteRevenuLD !== undefined && s.mixteRevenuCD !== undefined && (
                    <div className="mb-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#94a3b8]">Bail mobilité (9 mois)</span>
                        <span className="text-[#3b82f6] font-['JetBrains_Mono'] font-semibold">{formatCurrency(s.mixteRevenuLD)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#94a3b8]">Airbnb été (3 mois)</span>
                        <span className="text-[#f59e0b] font-['JetBrains_Mono'] font-semibold">{formatCurrency(s.mixteRevenuCD)}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#94a3b8]">Rendement brut</span>
                    <span className="text-[#f8fafc] font-['JetBrains_Mono']">{formatPercent(s.rendementBrut)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#94a3b8]">Impôts estimés/an</span>
                    <span className="text-[#f8fafc] font-['JetBrains_Mono']">{formatCurrency(s.fiscaliteAnnuelle)}</span>
                  </div>
                  <button
                    onClick={() => setFiscalDetailScenario(s)}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/[0.05] text-xs font-['Inter'] font-medium transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Voir le détail fiscal
                  </button>
                </div>

                {/* Vacancy alert — only shown when user has adjusted personalUseDays > 0 */}
                {personalUseDays > 0 && (() => {
                  let vacancyMsg = '';
                  let vacancyAmount = 0;
                  if (key === 'lt') {
                    vacancyAmount = Math.round(s.revenuBrutAnnuel * 0.05);
                    vacancyMsg = `Vacance locative estimée : ~5% soit ${formatCurrency(vacancyAmount)}/an de manque à gagner potentiel.`;
                  } else if (key === 'st') {
                    const occRate = marketData.short.tauxOccupationAnnuel;
                    const vacRate = Math.round((1 - occRate) * 100);
                    vacancyAmount = Math.round(marketData.short.adr * 365 * (1 - occRate) - s.revenuBrutAnnuel * (1 - occRate));
                    vacancyMsg = `Taux d'inoccupation : ~${vacRate}% — Intégré dans le calcul via le taux de remplissage.`;
                  } else {
                    vacancyAmount = Math.round(s.revenuBrutAnnuel * 0.04);
                    vacancyMsg = `Vacance estimée : ~4% mixte (LD hiver + saisonnalité été), soit ${formatCurrency(vacancyAmount)}/an.`;
                  }
                  return vacancyMsg && (
                    <div className="mt-3 p-2.5 rounded-lg bg-[#f59e0b]/5 border border-[#f59e0b]/15">
                      <div className="flex items-start gap-2">
                        <span className="text-xs mt-0.5">⚠️</span>
                        <p className="text-[11px] font-['Inter'] text-[#f59e0b] leading-relaxed">{vacancyMsg}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Legal alerts */}
                {s.legalAlerts.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {s.legalAlerts.map((alert, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${
                        alert.type === 'bloquant' ? 'bg-[#ef4444]/10 border-[#ef4444]/30' :
                        alert.type === 'warning' ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30' :
                        'bg-[#3b82f6]/10 border-[#3b82f6]/30'
                      }`}>
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                            alert.type === 'bloquant' ? 'text-[#ef4444]' : alert.type === 'warning' ? 'text-[#f59e0b]' : 'text-[#3b82f6]'
                          }`} />
                          <p className={`text-xs font-['Inter'] ${
                            alert.type === 'bloquant' ? 'text-[#ef4444]' : alert.type === 'warning' ? 'text-[#fbbf24]' : 'text-[#94a3b8]'
                          }`}>{alert.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* DPE alert */}
                {s.alerteDPE && (
                  <div className="mt-3 p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                      <p className="text-xs font-['Inter'] text-[#ef4444]">{s.alerteDPE}</p>
                    </div>
                  </div>
                )}

                {/* Long term personal use warning — only shown when user selects personal use days */}
                {key === 'lt' && personalUseDays > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
                      <p className="text-xs font-['Inter'] text-[#fbbf24]">Usage personnel non disponible en location longue durée (bail 3 ans)</p>
                    </div>
                  </div>
                )}

                {/* Mixed scenario winter validation — uniform warning style */}
                {key === 'mx' && hasWinterPersonalUse && (
                  <div className="mt-3 p-3 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
                      <p className="text-xs font-['Inter'] text-[#fbbf24]">Stratégie Mixte : l'usage personnel n'est possible qu'en été (Juin–Août).</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ═══ SHORT TERM INTERACTIVE PANEL ═══ */}
        <div className="mb-10 rounded-2xl bg-[#0f172a] border border-[#f59e0b]/20 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f59e0b]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#f59e0b]/10 rounded-lg text-[#f59e0b]">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-['DM_Sans'] font-bold text-[#f8fafc] text-lg">Affinez votre simulation Airbnb</h3>
                <p className="text-xs text-[#94a3b8] font-['Inter']">Ajustez les paramètres pour voir l'impact en temps réel</p>
              </div>
            </div>
            {lostRevenue > 0 && (
              <div className="mt-4 md:mt-0 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-[#ef4444]" />
                <span className="text-sm font-['JetBrains_Mono'] font-bold text-[#ef4444]">
                  -{formatCurrency(lostRevenue)}/an de manque à gagner
                </span>
              </div>
            )}
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 mb-8">
            {[
              { label: 'Frais conciergerie', hint: '% du CA brut', value: conciergeFee, min: 0, max: 30, step: 1, onChange: setConciergeFee, display: (v: number) => v + '%' },
              { label: 'Prix ménage', hint: 'par rotation de voyageur', value: cleaningFee, min: 0, max: 150, step: 5, onChange: setCleaningFee, display: (v: number) => v + '€' },
              { label: 'Usage perso', hint: 'jours/an d\'usage personnel', value: personalUseDays, min: 0, max: 90, step: 1, onChange: setPersonalUseDays, display: (v: number) => v + 'j' },
            ].map(sl => (
              <div key={sl.label} className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-[#f8fafc] font-['Inter']">{sl.label}</span>
                    <p className="text-[10px] text-[#64748b] font-['Inter'] mt-0.5">{sl.hint}</p>
                  </div>
                  <span className="text-sm font-['JetBrains_Mono'] font-bold text-[#f59e0b]">{sl.display(sl.value)}</span>
                </div>
                <Slider value={sl.value} min={sl.min} max={sl.max} step={sl.step} onChange={sl.onChange} />
              </div>
            ))}
          </div>

          {/* Vacation month picker */}
          <div className="relative z-10 border-t border-white/[0.08] pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#f59e0b]" />
                <span className="text-sm font-medium text-[#f8fafc] font-['Inter']">Périodes de vacances personnelles</span>
              </div>
            </div>
            <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
              {MONTHS.map(m => {
                const isSelected = personalUseMonths.includes(m.key);
                const isSummer = m.summer ?? false;
                return (
                  <button
                    key={m.key}
                    onClick={() => toggleMonth(m.key)}
                    className={`relative px-2 py-2 rounded-lg text-xs font-medium font-['Inter'] transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#f59e0b] text-[#0c1222] font-semibold shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                        : isSummer
                          ? 'bg-white/[0.03] text-[#94a3b8] hover:bg-white/[0.08] hover:text-[#f8fafc] border border-[#f59e0b]/30'
                          : 'bg-white/[0.03] text-[#94a3b8] hover:bg-white/[0.08] hover:text-[#f8fafc] border border-white/[0.05]'
                    }`}
                  >
                    {m.short}
                    {isSelected && <Check className="absolute -top-1 -right-1 w-3 h-3 bg-[#0c1222] text-[#f59e0b] rounded-full" />}
                  </button>
                );
              })}
            </div>
            {hasWinterPersonalUse && (
              <div className="mt-4 p-3 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
                  <p className="text-xs font-['Inter'] text-[#fbbf24]">
                    <strong>Stratégie Mixte :</strong> L'usage personnel n'est possible qu'en été (Juin, Juillet, Août).
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-6 mt-4 text-xs text-[#64748b]">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#f59e0b]" /><span>Sélectionné</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded border border-[#f59e0b]/30 bg-white/[0.03]" /><span>Période estivale</span></div>
            </div>
          </div>
        </div>

        {/* ═══ REGULATORY WARNING ═══ */}
        <div className="mb-10 p-4 rounded-xl bg-[#ef4444]/[0.06] border border-[#ef4444]/20 flex items-start gap-3">
          <span className="text-base shrink-0 leading-tight mt-0.5">⚠️</span>
          <p className="text-xs text-[#fca5a5] font-['Inter'] leading-relaxed">
            <span className="font-semibold text-[#ef4444]">Réglementation location courte durée&nbsp;:</span>{' '}
            Dans de nombreuses villes (Paris, Lille, Lyon, Bordeaux…), la location d&apos;une résidence secondaire sur Airbnb nécessite une autorisation de changement d&apos;usage.
            Depuis la <span className="font-semibold">loi Le Meur (nov. 2024)</span>, la location d&apos;une résidence principale est limitée à <span className="font-semibold">90 jours/an</span>.
            {' '}Renseignez-vous auprès de votre mairie avant tout investissement.
          </p>
        </div>

        {/* ═══ COMPARISON TABLE ═══ */}
        <div className="mb-10 rounded-2xl bg-[#0f172a]/60 backdrop-blur-sm border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
            <h3 className="font-['DM_Sans'] font-bold text-[#f8fafc]">Tableau Comparatif</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#94a3b8] font-['Inter'] uppercase tracking-wider">Poste</th>
                  {[
                    { label: 'Longue Durée', color: 'text-[#3b82f6]' },
                    { label: 'Courte Durée', color: 'text-[#f59e0b]' },
                    { label: 'Mixte', color: 'text-[#8b5cf6]' },
                  ].map(h => (
                    <th key={h.label} className={`px-6 py-4 text-right text-xs font-bold font-['Inter'] uppercase tracking-wider ${h.color}`}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Revenus bruts/an', values: [scenarioLD.revenuBrutAnnuel, scenarioCD.revenuBrutAnnuel, scenarioMixte.revenuBrutAnnuel] },
                  { label: 'Charges & taxes/an', values: [scenarioLD.chargesAnnuelles, scenarioCD.chargesAnnuelles, scenarioMixte.chargesAnnuelles], negate: true },
                  ...(withLoan ? [{ label: 'Crédit/an', values: [scenarioLD.creditAnnuel, scenarioCD.creditAnnuel, scenarioMixte.creditAnnuel], negate: true }] : []),
                  { label: 'Fiscalité/an', values: [scenarioLD.fiscaliteAnnuelle, scenarioCD.fiscaliteAnnuelle, scenarioMixte.fiscaliteAnnuelle], negate: true },
                  { label: 'Cash-flow annuel net', values: [scenarioLD.cashflowNetAnnuel, scenarioCD.cashflowNetAnnuel, scenarioMixte.cashflowNetAnnuel], bold: true },
                ].map((row, i) => (
                  <tr key={row.label} className={`border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className={`px-6 py-4 text-sm font-['Inter'] ${row.bold ? 'font-bold text-[#f8fafc]' : 'text-[#94a3b8]'}`}>{row.label}</td>
                    {row.values.map((v: number, j: number) => (
                      <td key={j} className={`px-6 py-4 text-right text-sm font-['JetBrains_Mono'] ${
                        row.bold ? (v > 0 ? 'font-bold text-[#10b981]' : 'font-bold text-[#ef4444]') : 'text-[#f8fafc]'
                      }`}>
                        {row.negate ? '-' : ''}{formatCurrency(Math.abs(v))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ OCCUPANCY BAR CHART ═══ */}
        <div className="mb-10 rounded-2xl bg-[#0f172a]/60 backdrop-blur-sm border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-['DM_Sans'] font-bold text-[#f8fafc]">Taux d'occupation mensuel</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium font-['Inter'] bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">Courte Durée</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {[
                { color: '#10b981', label: '≥ 80%' },
                { color: '#f59e0b', label: '≥ 70%' },
                { color: '#64748b', label: '< 70%' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: item.color }} />
                  <span className="text-[#94a3b8] font-['Inter']">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={occupancyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontFamily: 'Inter' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 600, marginBottom: 4 }}
                  itemStyle={{ color: '#10b981' }}
                  formatter={(value: number, _name: string, props: { payload?: { ca: number; effectiveAdr: number; nights: number } }) => {
                    const p = props.payload;
                    return [
                      `${value}% · ${p?.nights ?? 0} nuits · ADR ${p?.effectiveAdr ?? 0}€ → ${p?.ca !== undefined ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p.ca) : ''}`,
                      'Occupation'
                    ];
                  }}
                />
                <Bar dataKey="taux" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="taux" position="top" formatter={(v: number) => `${v}%`} style={{ fill: '#e2e8f0', fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600 }} />
                  {occupancyData.map((d, i) => (
                    <Cell key={i} fill={d.taux >= 80 ? '#10b981' : d.taux >= 70 ? '#f59e0b' : '#64748b'}
                      opacity={d.selected ? 0.4 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* CA mensuel dynamique */}
            <div className="grid grid-cols-12 gap-0 border-t border-white/[0.06] mt-1 pt-3 pb-1">
              {occupancyData.map((d) => (
                <div key={d.month} className="flex flex-col items-center gap-0.5" style={{ opacity: d.selected ? 0.35 : 1 }}>
                  <span className={`text-[10px] font-bold font-['JetBrains_Mono'] leading-tight ${
                    d.taux >= 80 ? 'text-[#10b981]' : d.taux >= 70 ? 'text-[#f59e0b]' : 'text-[#94a3b8]'
                  }`}>
                    {d.ca >= 1000
                      ? `${(d.ca / 1000).toFixed(1)}k€`
                      : `${d.ca}€`}
                  </span>
                  <span className="text-[9px] text-[#64748b] font-['Inter']">{d.effectiveAdr}€/n</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#475569] font-['Inter'] px-1 pb-2">
              CA estimé/mois · ADR dynamique (yield management) · hors frais de gestion ·{' '}
              <span className="italic">Source&nbsp;: estimations basées sur les données AirDNA / marché 2024-2025</span>
            </p>
          </div>
        </div>

        {/* ═══ DÉTAILS FISCAUX PAR SCÉNARIO ═══ */}
        <div className="mb-14">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 border-t border-white/10" />
            <h3 className="text-xs font-['Inter'] tracking-widest text-[#94a3b8] uppercase font-semibold">Détails fiscaux par scénario</h3>
            <div className="flex-1 border-t border-white/10" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {scenarios.map(({ key, s, title, Icon }) => {
              const theme = key === 'lt' ? 'blue' : key === 'st' ? 'amber' : 'purple';
              const themeMap: Record<string, { borderHover: string, iconColor: string, btnPrimary: string }> = {
                blue: { borderHover: 'hover:border-blue-500/50', iconColor: 'text-blue-500', btnPrimary: 'bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20' },
                amber: { borderHover: 'hover:border-amber-500/50', iconColor: 'text-amber-500', btnPrimary: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20' },
                purple: { borderHover: 'hover:border-purple-500/50', iconColor: 'text-purple-500', btnPrimary: 'bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500/20' },
              };
              const t = themeMap[theme];
              const isLMNP = s.regimeOptimal.nom.includes('LMNP');
              const isMicro = s.regimeOptimal.nom.includes('Micro');

              return (
                <div key={`fiscal-${key}`} className={`bg-[#0f172a] rounded-xl border border-white/10 p-6 flex flex-col transition-colors duration-300 ${t.borderHover}`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2.5 rounded-lg bg-white/5 border border-white/10 shrink-0 ${t.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-['DM_Sans'] font-bold text-white">{title}</h4>
                      <p className="text-xs font-['Inter'] text-slate-400 mt-0.5">{s.regimeOptimal.nom}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-5">
                    <span className="text-sm font-['Inter'] text-slate-400">Impôts estimés</span>
                    <span className="text-2xl sm:text-3xl font-['JetBrains_Mono'] font-bold text-white">
                      {formatCurrency(s.fiscaliteAnnuelle)}<span className="text-base text-slate-400 font-normal">/an</span>
                    </span>
                  </div>
                  {s.fiscaliteAnnuelle === 0 && s.regimeOptimal.nom.includes('Réel') && (
                    <div className="mb-4 px-3 py-2.5 rounded-lg bg-[#10b981]/8 border border-[#10b981]/20 flex items-start gap-2">
                      <span className="text-sm shrink-0">💡</span>
                      <p className="text-xs text-[#6ee7b7] font-['Inter'] leading-relaxed">
                        Grâce aux amortissements (bien + meubles), le résultat fiscal est nul les premières années en LMNP au réel. C&apos;est un avantage réel, pas une erreur.
                      </p>
                    </div>
                  )}

                  <div className="flex-1 mb-8">
                    <h5 className="text-[10px] font-['Inter'] font-bold text-emerald-400 uppercase tracking-widest mb-3">✅ Avantages</h5>
                    <ul className="space-y-2.5">
                      {isLMNP && (
                        <>
                          <li className="flex gap-2 items-start text-sm text-slate-300 font-['Inter']">
                            <span className="text-emerald-500 mt-0.5">•</span> Amortissement du bien (25-30 ans)
                          </li>
                          <li className="flex gap-2 items-start text-sm text-slate-300 font-['Inter']">
                            <span className="text-emerald-500 mt-0.5">•</span> Amortissement des travaux & mobilier
                          </li>
                          <li className="flex gap-2 items-start text-sm text-slate-300 font-['Inter']">
                            <span className="text-emerald-500 mt-0.5">•</span> Déduction des intérêts d'emprunt
                          </li>
                        </>
                      )}
                      {isMicro && (
                        <>
                          <li className="flex gap-2 items-start text-sm text-slate-300 font-['Inter']">
                            <span className="text-emerald-500 mt-0.5">•</span> Abattement forfaitaire simple
                          </li>
                          <li className="flex gap-2 items-start text-sm text-slate-300 font-['Inter']">
                            <span className="text-emerald-500 mt-0.5">•</span> Aucune comptabilité complexe requise
                          </li>
                        </>
                      )}
                      {!isLMNP && !isMicro && (
                        <>
                          <li className="flex gap-2 items-start text-sm text-slate-300 font-['Inter']">
                            <span className="text-emerald-500 mt-0.5">•</span> Déduction au frais réel des charges
                          </li>
                          <li className="flex gap-2 items-start text-sm text-slate-300 font-['Inter']">
                            <span className="text-emerald-500 mt-0.5">•</span> Création de déficit foncier possible
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2 mt-auto">
                    {key === 'lt' ? (
                      <button className={`w-full py-2.5 rounded-lg text-sm font-['Inter'] font-semibold transition-colors ${t.btnPrimary}`}>
                        Options de gestion
                      </button>
                    ) : (
                      <Link href="/conciergerie" className="w-full">
                        <button className="w-full py-2.5 rounded-lg text-sm font-['Inter'] font-semibold transition-colors bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20">
                          Trouver une conciergerie
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ 15-YEAR PROJECTION CHART ═══ */}
        <div className="mb-10 rounded-2xl bg-[#0f172a]/60 backdrop-blur-sm border border-white/[0.08] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
            <div>
              <h3 className="font-['DM_Sans'] font-bold text-[#f8fafc]">Évolution de votre patrimoine sur 15 ans</h3>
              <p className="text-xs text-[#94a3b8] font-['Inter'] mt-1">
                Meilleur scénario ({meilleur.label}) — Cash-flow cumulé vs Capital restant dû
                {projection.anneeAutofinancement && (
                  <span className="ml-2 text-[#10b981]">• Autofinancement dès l'année {projection.anneeAutofinancement}</span>
                )}
              </p>
            </div>
            {liveResult.amortizationYearly && liveResult.amortizationYearly.length > 0 && withLoan && (
              <button
                onClick={() => setShowAmortizationTable(true)}
                className="mt-4 sm:mt-0 flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-[#e2e8f0] text-sm font-['Inter'] font-medium rounded-lg transition-colors"
              >
                Tableau d&apos;amortissement
              </button>
            )}
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={projectionChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `An ${v}`} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k€`} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f8fafc', fontFamily: 'Inter', fontSize: 12 }}
                  formatter={(v: number) => [formatCurrency(v)]}
                  labelFormatter={(v: number) => `Année ${v}`}
                />
                <Legend wrapperStyle={{ fontFamily: 'Inter', fontSize: 12, color: '#94a3b8' }} />
                <Line type="monotone" dataKey="cashflowCumule" stroke="#10b981" strokeWidth={2} dot={false} name="Cash-flows cumulés" />
                <Line type="monotone" dataKey="capitalRestant" stroke="#ef4444" strokeWidth={2} dot={false} name="Capital restant dû" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ═══ DECISION AID ═══ */}
        <div className="mb-10">
          <h3 className="font-['DM_Sans'] text-2xl font-bold text-[#f8fafc] mb-6">Aide à la Décision</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Location Longue Durée', subtitle: 'Sécurité', color: '#3b82f6',
                pros: ['Revenu sûr, garanti et régulier tous les mois', 'Gestion locative quasi-inexistante au quotidien', 'Pas de frais de conciergerie ni de ménage fréquents'],
                cons: ['Rentabilité et revenus potentiels moins élevés', 'Appartement « bloqué » (difficile de le récupérer)', 'Risque d\'impayés et dégradation sur le long terme'],
              },
              {
                title: 'Courte Durée / Mixte', subtitle: 'Rentabilité & Flexibilité', color: '#f59e0b',
                pros: ['Rentabilité maximale potentielle (+50% à +100%)', 'Logement impeccable : ménage professionnel régulier', 'Flexibilité totale : usage personnel ou revente facilitée'],
                cons: ['Revenus variables selon la saisonnalité', 'Gestion chronophage (ou coût conciergerie ~20%)', 'Réglementation Airbnb variable selon les villes'],
              },
            ].map(card => (
              <div key={card.title} className="p-6 rounded-2xl bg-[#0f172a] border border-white/[0.08]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                  <div>
                    <h4 className="font-['DM_Sans'] font-bold text-[#f8fafc]">{card.title}</h4>
                    <p className="text-xs text-[#94a3b8] font-['Inter']">{card.subtitle}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  {card.pros.map(p => (
                    <div key={p} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                      <span className="text-sm text-[#f8fafc] font-['Inter']">{p}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-4 border-t border-white/[0.06]">
                  {card.cons.map(c => (
                    <div key={c} className="flex items-start gap-3">
                      <X className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                      <span className="text-sm text-[#94a3b8] font-['Inter']">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Cleaning fee warning */}
          <div className="mt-6 p-4 rounded-xl bg-[#f59e0b]/[0.06] border border-[#f59e0b]/20 flex items-start gap-3">
            <span className="text-lg shrink-0 leading-tight">⚠️</span>
            <p className="text-sm text-[#cbd5e1] font-['Inter'] leading-relaxed">
              <span className="font-semibold text-[#f59e0b]">Impact des frais de ménage&nbsp;:</span>{' '}
              Bien que les frais de ménage soient payés par le voyageur et reversés au prestataire, ils augmentent le prix total affiché sur les plateformes.
              Pour rester compétitif face à la concurrence, vous devrez souvent soit baisser votre prix à la nuitée (ADR), soit accepter une légère baisse de votre taux d&apos;occupation.
            </p>
          </div>
        </div>

        {/* ═══ CTA FOOTER ═══ */}
        <div className="mt-4 mb-10 p-6 rounded-2xl bg-[#0f172a] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-['DM_Sans'] font-bold text-[#f8fafc]">Prochaine étape</p>
            <p className="text-xs text-[#94a3b8] font-['Inter'] mt-0.5">Sauvegardez ou modifiez votre simulation</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#0c1222] font-['Inter'] font-bold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              <Save className="w-4 h-4" />
              {saved ? 'Sauvegardé ✓' : 'Enregistrer cette simulation'}
            </button>
            <button
              onClick={() => router.push('/simulation')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] text-[#f8fafc] font-['Inter'] font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Modifier les paramètres
            </button>
          </div>
        </div>

      </div>

      {/* ═══ FISCAL DETAIL MODAL ═══ */}
      {fiscalDetailScenario && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setFiscalDetailScenario(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setFiscalDetailScenario(null)}>
            <div
              className="relative w-full max-w-lg bg-[#0f172a] border border-white/[0.10] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-down"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/[0.08] bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-['DM_Sans'] font-bold text-[#f8fafc] text-lg">
                      Détail Fiscal — {fiscalDetailScenario.label}
                    </h3>
                    <p className="text-xs text-[#94a3b8] font-['Inter'] mt-1">
                      Régime optimal : <span className="text-[#10b981] font-semibold">{fiscalDetailScenario.regimeOptimal.nom}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setFiscalDetailScenario(null)}
                    className="p-2 rounded-lg hover:bg-white/[0.05] text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Regimes comparison */}
              <div className="p-6 space-y-4">
                {fiscalDetailScenario.regimes.map((regime: TaxRegime) => (
                  <div
                    key={regime.nom}
                    className={`p-4 rounded-xl border transition-all ${
                      regime.isOptimal
                        ? 'bg-[#10b981]/5 border-[#10b981]/30'
                        : 'bg-white/[0.02] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#f8fafc] font-['Inter']">{regime.nom}</h4>
                        {regime.isOptimal && (
                          <span className="px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] text-[10px] font-bold font-['Inter']">
                            ✓ Optimal
                          </span>
                        )}
                      </div>
                      <span className={`text-lg font-bold font-['JetBrains_Mono'] ${
                        regime.isOptimal ? 'text-[#10b981]' : 'text-[#f8fafc]'
                      }`}>
                        {formatCurrency(regime.totalFiscalite)}/an
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="p-2 rounded-lg bg-[#0c1222]">
                        <div className="text-[#64748b] font-['Inter'] mb-0.5">Revenu imposable</div>
                        <div className="text-[#f8fafc] font-['JetBrains_Mono'] font-semibold">{formatCurrency(regime.revenuImposable)}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-[#0c1222]">
                        <div className="text-[#64748b] font-['Inter'] mb-0.5">Impôt sur le revenu</div>
                        <div className="text-[#f8fafc] font-['JetBrains_Mono'] font-semibold">{formatCurrency(regime.impot)}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-[#0c1222]">
                        <div className="text-[#64748b] font-['Inter'] mb-0.5">CSG-CRDS (17.2%)</div>
                        <div className="text-[#f8fafc] font-['JetBrains_Mono'] font-semibold">{formatCurrency(regime.prelevementsSociaux)}</div>
                      </div>
                    </div>

                    {regime.detail && (
                      <p className="mt-3 text-[11px] text-[#94a3b8] font-['Inter'] leading-relaxed">
                        {regime.detail}
                      </p>
                    )}

                    {regime.sautDeTranche?.isSaut && (
                      <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20">
                        <AlertTriangle className="w-3 h-3 text-[#ef4444] shrink-0" />
                        <p className="text-[10px] text-[#ef4444] font-['Inter']">
                          ⚠️ Saut de tranche TMI : {(regime.sautDeTranche.oldTMI * 100).toFixed(0)}% → {(regime.sautDeTranche.newTMI * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Charges opérationnelles déduites */}
                <div className="pt-4 border-t border-white/[0.08]">
                  <p className="text-xs font-['Inter'] tracking-widest text-[#94a3b8] uppercase font-semibold mb-3">
                    Charges opérationnelles déduites
                  </p>
                  <div className="space-y-1.5 text-xs font-['Inter']">
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Assurance PNO</span>
                      <span className="text-[#f8fafc] font-['JetBrains_Mono']">−{formatCurrency(DEFAULT_CHARGES.assurancePnoAnnuelle)}/an</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Abonnement Internet (fibre)</span>
                      <span className="text-[#f8fafc] font-['JetBrains_Mono']">−{formatCurrency(DEFAULT_CHARGES.internetMensuel * 12)}/an</span>
                    </div>
                    {fiscalDetailScenario.vacanceLocativeAnnuelle > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Impact vacance locative (7%)</span>
                        <span className="text-[#f59e0b] font-['JetBrains_Mono']">−{formatCurrency(fiscalDetailScenario.vacanceLocativeAnnuelle)}/an</span>
                      </div>
                    )}
                    {fiscalDetailScenario.utilitesAnnuels > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Eau & électricité</span>
                        <span className="text-[#f8fafc] font-['JetBrains_Mono']">−{formatCurrency(fiscalDetailScenario.utilitesAnnuels)}/an</span>
                      </div>
                    )}
                    {fiscalDetailScenario.consommablesAnnuels > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Consommables & kit d&apos;accueil</span>
                        <span className="text-[#f8fafc] font-['JetBrains_Mono']">−{formatCurrency(fiscalDetailScenario.consommablesAnnuels)}/an</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary */}
                <div className="pt-4 border-t border-white/[0.08]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-['Inter'] text-[#94a3b8]">Économie fiscale avec le régime optimal</span>
                    <span className="text-sm font-bold font-['JetBrains_Mono'] text-[#10b981]">
                      {formatCurrency(
                        Math.max(...fiscalDetailScenario.regimes.map((r: TaxRegime) => r.totalFiscalite)) -
                        fiscalDetailScenario.regimeOptimal.totalFiscalite
                      )}/an
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ SAVE ERROR TOAST ═══ */}
      {saveError && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-down">
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 backdrop-blur-xl shadow-2xl max-w-md">
            <AlertTriangle className="w-5 h-5 text-[#ef4444] shrink-0" />
            <div>
              <p className="text-sm font-['Inter'] font-semibold text-[#ef4444]">Erreur de sauvegarde</p>
              <p className="text-xs font-['Inter'] text-[#fca5a5] mt-0.5">{saveError}</p>
            </div>
            <button onClick={() => setSaveError(null)} className="p-1 rounded hover:bg-white/[0.05] text-[#ef4444] transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* AMORTIZATION MODAL */}
      {showAmortizationTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-down" onClick={() => setShowAmortizationTable(false)}>
          <div className="bg-[#0f172a] border border-white/[0.1] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
              <div>
                <h3 className="text-xl font-bold font-['DM_Sans'] text-[#f8fafc]">Tableau d&apos;amortissement annuel</h3>
                <p className="text-[#94a3b8] text-sm mt-1">Emprunt de {formatCurrency(getPrincipalFromMensualite(inputs.mensualiteCredit, inputs.interestRate, inputs.dureeCredit))} à {inputs.interestRate}% sur {inputs.dureeCredit} ans</p>
              </div>
              <button onClick={() => setShowAmortizationTable(false)} className="text-[#94a3b8] hover:text-[#f8fafc] p-2 hover:bg-white/[0.05] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 font-['JetBrains_Mono'] text-sm">
              <div className="overflow-hidden border border-white/[0.08] rounded-xl bg-[#0c1222]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/[0.08] font-['Inter'] text-xs uppercase tracking-wider text-[#94a3b8]">
                      <th className="p-4 font-medium">Année</th>
                      <th className="p-4 font-medium text-right">Mensualités</th>
                      <th className="p-4 font-medium text-right">Capital Amorti</th>
                      <th className="p-4 font-medium text-right text-[#ef4444]">Intérêts Payés</th>
                      <th className="p-4 font-medium text-right text-[#e2e8f0]">Capital Restant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {liveResult.amortizationYearly?.map(row => (
                      <tr key={row.annee} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-4 font-bold text-[#f8fafc]">Année {row.annee}</td>
                        <td className="p-4 text-right text-[#94a3b8]">{formatCurrency(row.mensualites)}</td>
                        <td className="p-4 text-right text-[#10b981]">{formatCurrency(row.capitalAmorti)}</td>
                        <td className="p-4 text-right text-[#ef4444] group-hover:text-[#fca5a5] transition-colors">{formatCurrency(row.interetsPayes)}</td>
                        <td className="p-4 text-right text-[#e2e8f0] font-medium">{formatCurrency(row.capitalRestantDu)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
