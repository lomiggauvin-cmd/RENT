'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, ChevronDown, Zap, AlertTriangle, Info, Calendar,
  ImagePlus, Plus, X, Sparkles, ArrowRight, Loader2, Check
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import CitySearchInput, { type SelectedCity, type Quartier } from '@/components/simulation/CitySearchInput';
import LeadCaptureModal from '@/components/simulation/LeadCaptureModal';
import { runAnalysis } from '@/lib/taxCalculator';
import type { PropertyInputs, MarketDataLongTerm, MarketDataShortTerm, ShortTermFees } from '@/lib/taxCalculator';
import type { MarketDataResponse } from '@/lib/market-api';

type SectionId = 1 | 2 | 3 | 4 | 5 | 6;

// ─── Slider component ──────────────────────────────────────────
function Slider({
  value, min, max, step = 1, onChange, color = '#3b82f6', formatVal
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; color?: string; formatVal?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative h-5 flex items-center">
      <div className="absolute w-full h-1.5 rounded-full bg-white/[0.08]" />
      <div className="absolute h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="absolute w-full opacity-0 h-5 cursor-pointer z-10"
      />
      <div
        className="absolute w-5 h-5 rounded-full border-2 bg-white shadow-md transition-all pointer-events-none"
        style={{ left: `calc(${pct}% - 10px)`, borderColor: color }}
      />
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────
function SectionHeader({
  num, title, isActive, onClick, valid
}: {
  num: string; title: string; isActive: boolean; onClick: () => void; valid?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-6 rounded-t-2xl cursor-pointer transition-all duration-300 ${isActive ? 'bg-white/[0.03]' : 'hover:bg-white/[0.01]'}`}
    >
      <div className="flex items-center gap-4">
        <span className={`font-['JetBrains_Mono'] text-sm font-bold ${isActive ? 'text-[#3b82f6]' : 'text-[#64748b]'}`}>{num}</span>
        <h2 className={`font-['DM_Sans'] text-lg font-bold ${isActive ? 'text-[#f8fafc]' : 'text-[#94a3b8]'}`}>{title}</h2>
        {valid && !isActive && (
          <div className="w-5 h-5 rounded-full bg-[#10b981]/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-[#10b981]" />
          </div>
        )}
      </div>
      <ChevronDown className={`w-5 h-5 text-[#94a3b8] transition-transform duration-300 ${isActive ? 'rotate-180 text-[#f8fafc]' : ''}`} />
    </div>
  );
}

// ─── Input field ──────────────────────────────────────────
function InputField({
  label, required, children, hint
}: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#94a3b8] mb-2 font-['Inter']">
        {label} {required && <span className="text-[#ef4444]">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#64748b] mt-2 font-['Inter']">{hint}</p>}
    </div>
  );
}

type DPEGrade = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export default function SimulationPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionId>(1);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);

  // ── Market data from API ──
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null);

  // ── PropertyInputs state ──
  const [address, setAddress] = useState('');              // "{nom}, {cp}" construit depuis la sélection
  const [codePostal, setCodePostal] = useState('');
  // Ville sélectionnée via l'autocomplete
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  // Quartier sélectionné (null = pas de quartier ou ville sans quartiers)
  const [selectedQuartier, setSelectedQuartier] = useState<Quartier | null>(null);
  // Prix au m² : automatique (DB) ou manuel (saisie)
  const [pricePerM2Db, setPricePerM2Db] = useState<number | null>(null);
  const [manualPricePerM2, setManualPricePerM2] = useState<number>(0);
  const [propertyType, setPropertyType] = useState<"T1/T2" | "T3+" | "Maison" | "Autre">("T1/T2");
  const [surface, setSurface] = useState<number>(0);
  const [propertyValue, setPropertyValue] = useState<number>(0);
  const [dpe, setDpe] = useState<DPEGrade>('C');
  const [meuble, setMeuble] = useState(true);

  // Financing
  const [hasOngoingLoan, setHasOngoingLoan] = useState(true);
  const [mensualiteCredit, setMensualiteCredit] = useState<number>(0);
  const [dureeCredit, setDureeCredit] = useState<number>(20);
  const [interestRate, setInterestRate] = useState<number>(3.5);

  // Charges
  const [chargesCopropriete, setChargesCopropriete] = useState<number>(1800);
  const [taxeFonciere, setTaxeFonciere] = useState<number>(1200);
  const [assurancePNO, setAssurancePNO] = useState<number>(300);

  // Works
  const [renovationBudget, setRenovationBudget] = useState<number>(0);
  const [startDate, setStartDate] = useState('');

  // Fiscal
  const [revenuAnnuel, setRevenuAnnuel] = useState<number>(35000);
  const [maritalStatus, setMaritalStatus] = useState<'celibataire' | 'couple'>('celibataire');
  const [childrenCount, setChildrenCount] = useState<number>(0);

  // Legal
  const [isPrimaryResidence, setIsPrimaryResidence] = useState(false);
  const [isClassifiedTourist, setIsClassifiedTourist] = useState(false);
  const [allowsShortTerm, setAllowsShortTerm] = useState(true);

  // Advanced (projection hypotheses)
  const [rentInflation, setRentInflation] = useState(0.02);
  const [propertyAppreciation, setPropertyAppreciation] = useState(0.025);
  const [expenseGrowth, setExpenseGrowth] = useState(0.015);

  // Mensualité effective affichée dans le slider (saisie ou estimée depuis propertyValue)
  const estimatedMonthlyPayment = useMemo(() => {
    if (!hasOngoingLoan) return 0;
    if (mensualiteCredit > 0) return mensualiteCredit;
    const M = Number(propertyValue);
    const r = Number(interestRate) / 100 / 12;
    const n = Number(dureeCredit) * 12;
    if (M <= 0 || n <= 0) return 0;
    if (r === 0) return M / n;
    return (M * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [hasOngoingLoan, mensualiteCredit, propertyValue, interestRate, dureeCredit]);

  // Coût total crédit : dérivé depuis la mensualité saisie (C = M * (1 - (1+r)^-n) / r)
  const totalLoanCost = useMemo(() => {
    if (!hasOngoingLoan) return 0;
    const M = Number(mensualiteCredit > 0 ? mensualiteCredit : estimatedMonthlyPayment);
    const r = Number(interestRate) / 100 / 12;
    const n = Number(dureeCredit) * 12;
    if (M <= 0 || n <= 0) return 0;
    const capital = r === 0 ? M * n : M * ((1 - Math.pow(1 + r, -n)) / r);
    return Math.max(0, M * n - capital);
  }, [hasOngoingLoan, mensualiteCredit, estimatedMonthlyPayment, interestRate, dureeCredit]);

  // ── Validation ──
  const isValid = !!(
    selectedCity &&
    surface > 0 &&
    propertyValue > 0 &&
    dpe &&
    startDate &&
    revenuAnnuel > 0 &&
    marketData
  );

  // Prix effectif : quartier sélectionné > prix ville DB > prix manuel
  // Toujours nullable — si null, l'utilisateur doit saisir propertyValue manuellement
  const effectivePriceM2: number | null =
    selectedQuartier?.priceM2 ?? pricePerM2Db ?? (manualPricePerM2 > 0 ? manualPricePerM2 : null);

  // ── Fetch market data ──
  const fetchMarket = useCallback(async (cityName: string, cp: string) => {
    setApiLoading(true);
    setApiError(false);
    try {
      const addr = cp ? `${cityName} ${cp}` : cityName;
      const res = await fetch(`/api/market-data?address=${encodeURIComponent(addr)}&city=${encodeURIComponent(cityName)}`);
      if (!res.ok) throw new Error('API failed');
      const data: MarketDataResponse = await res.json();
      setMarketData(data);
    } catch {
      setApiError(true);
    } finally {
      setApiLoading(false);
    }
  }, []);

  // ── Callback ville sélectionnée ──
  const handleCitySelect = useCallback((city: SelectedCity) => {
    setSelectedCity(city);
    // Si une correspondance directe par code postal a été trouvée, pré-sélectionner le quartier
    const autoQuartier = city.autoSelectedQuartier ?? null;
    setSelectedQuartier(autoQuartier);
    setAddress(`${city.nom}, ${city.codePostal}`);
    setCodePostal(city.codePostal);
    setPricePerM2Db(city.pricePerM2);
    setManualPricePerM2(0);
    // Auto-suggère la valeur du bien : priorité quartier > ville, si surface connue
    const effectivePrice = autoQuartier?.priceM2 ?? city.pricePerM2;
    if (effectivePrice && surface > 0) {
      setPropertyValue(Math.round(effectivePrice * surface));
    }
    fetchMarket(city.nom, city.codePostal);
  }, [fetchMarket, surface]);

  const handleCitylear = useCallback(() => {
    setSelectedCity(null);
    setSelectedQuartier(null);
    setAddress('');
    setCodePostal('');
    setPricePerM2Db(null);
    setManualPricePerM2(0);
    setMarketData(null);
    setApiError(false);
  }, []);

  // ── Save draft to localStorage ──
  useEffect(() => {
    const draft = {
      address, codePostal, selectedCity, selectedQuartier, pricePerM2Db,
      propertyType, surface, propertyValue, dpe, meuble,
      hasOngoingLoan, mensualiteCredit, dureeCredit, interestRate,
      chargesCopropriete, taxeFonciere, assurancePNO,
      renovationBudget, startDate,
      revenuAnnuel, maritalStatus, childrenCount,
      isPrimaryResidence, isClassifiedTourist, allowsShortTerm,
      rentInflation, propertyAppreciation, expenseGrowth,
      marketData,
    };
    localStorage.setItem('rentavision_draft', JSON.stringify(draft));
  }, [address, codePostal, selectedCity, selectedQuartier, pricePerM2Db,
      propertyType, surface, propertyValue, dpe, meuble,
      hasOngoingLoan, mensualiteCredit, dureeCredit, interestRate,
      chargesCopropriete, taxeFonciere, assurancePNO,
      renovationBudget, startDate,
      revenuAnnuel, maritalStatus, childrenCount,
      isPrimaryResidence, isClassifiedTourist, allowsShortTerm,
      rentInflation, propertyAppreciation, expenseGrowth,
      marketData]);

  // ── Restore from localStorage ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rentavision_draft');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.address) setAddress(d.address);
        if (d.codePostal) setCodePostal(d.codePostal);
        if (d.selectedCity) setSelectedCity(d.selectedCity);
        if (d.selectedQuartier) setSelectedQuartier(d.selectedQuartier);
        if (d.pricePerM2Db !== undefined) setPricePerM2Db(d.pricePerM2Db);
        if (d.propertyType) setPropertyType(d.propertyType);
        if (d.surface) setSurface(d.surface);
        if (d.propertyValue) setPropertyValue(d.propertyValue);
        if (d.dpe) setDpe(d.dpe);
        if (d.meuble !== undefined) setMeuble(d.meuble);
        if (d.hasOngoingLoan !== undefined) setHasOngoingLoan(d.hasOngoingLoan);
        if (d.mensualiteCredit) setMensualiteCredit(d.mensualiteCredit);
        if (d.dureeCredit) setDureeCredit(d.dureeCredit);
        if (d.interestRate) setInterestRate(d.interestRate);
        if (d.chargesCopropriete) setChargesCopropriete(d.chargesCopropriete);
        if (d.taxeFonciere) setTaxeFonciere(d.taxeFonciere);
        if (d.assurancePNO) setAssurancePNO(d.assurancePNO);
        if (d.renovationBudget) setRenovationBudget(d.renovationBudget);
        if (d.startDate) setStartDate(d.startDate);
        if (d.revenuAnnuel) setRevenuAnnuel(d.revenuAnnuel);
        if (d.maritalStatus) setMaritalStatus(d.maritalStatus);
        if (d.childrenCount !== undefined) setChildrenCount(d.childrenCount);
        if (d.isPrimaryResidence !== undefined) setIsPrimaryResidence(d.isPrimaryResidence);
        if (d.isClassifiedTourist !== undefined) setIsClassifiedTourist(d.isClassifiedTourist);
        if (d.allowsShortTerm !== undefined) setAllowsShortTerm(d.allowsShortTerm);
        if (d.rentInflation) setRentInflation(d.rentInflation);
        if (d.propertyAppreciation) setPropertyAppreciation(d.propertyAppreciation);
        if (d.expenseGrowth) setExpenseGrowth(d.expenseGrowth);
        if (d.marketData) setMarketData(d.marketData);
      }
    } catch { /* ignore */ }
  }, []);

  const toggleSection = (id: SectionId) => {
    setActiveSection(id);
  };

  // ── LAUNCH ANALYSIS ──
  const handleLaunch = async () => {
    // if (!user) {
    //   setShowAuthModal(true);
    //   return;
    // }
    if (!isValid || !marketData) return;
    setLaunching(true);
    try {
      const inputs: PropertyInputs = {
        hasOngoingLoan,
        mensualiteCredit: hasOngoingLoan ? (mensualiteCredit > 0 ? mensualiteCredit : Math.round(estimatedMonthlyPayment)) : 0,
        dureeCredit,
        interestRate,
        chargesCopropriete,
        taxeFonciere,
        assurancePNO,
        codePostal,
        propertyType,
        surface,
        dpe,
        meuble,
        revenuAnnuel,
        maritalStatus,
        childrenCount,
        propertyValue,
        renovationBudget,
        isPrimaryResidence,
        isClassifiedTourist,
        allowsShortTerm,
      };

      // Priorité quartier > ville pour le loyer LD
      const marketLong: MarketDataLongTerm = selectedQuartier?.loyerM2
        ? { ...marketData.long, loyerMoyenM2: selectedQuartier.loyerM2 }
        : marketData.long;

      // ADR local : quartier > ville > API (taux d'occupation conservé depuis l'API)
      const localAdr = selectedQuartier?.adr ?? selectedCity?.adr ?? null;
      const marketShort: MarketDataShortTerm = localAdr
        ? {
            ...marketData.short,
            adr: localAdr,
            revenusEstimesMensuel: Math.round(localAdr * 30 * marketData.short.tauxOccupationAnnuel),
          }
        : marketData.short;

      const results = runAnalysis(inputs, marketLong, marketShort);

      // Stocker le marketData fusionné (loyer + ADR patchés, taux d'occupation API)
      const effectiveMarketData = {
        ...marketData,
        long: marketLong,
        short: marketShort,
      };

      // Store results & inputs for the dashboard
      localStorage.setItem('rentavision_results', JSON.stringify(results));
      localStorage.setItem('rentavision_inputs', JSON.stringify(inputs));
      localStorage.setItem('rentavision_market', JSON.stringify(effectiveMarketData));

      router.push('/dashboard');
    } catch (e) {
      console.error('Analysis error:', e);
    } finally {
      setLaunching(false);
    }
  };

  const dpeColors: Record<string, string> = {
    A: 'border-emerald-400 text-emerald-400',
    B: 'border-green-400 text-green-400',
    C: 'border-yellow-400 text-yellow-400',
    D: 'border-orange-400 text-orange-400',
    E: 'border-orange-500 text-orange-500',
    F: 'border-red-500 text-red-500 animate-pulse',
    G: 'border-red-600 text-red-600 animate-pulse',
  };

  const sectionBase = "mb-3 rounded-2xl border border-white/[0.06] bg-[#0f172a] overflow-hidden";

  return (
    <div className="min-h-screen bg-[#0c1222] font-['Inter'] text-[#94a3b8] pb-28">
      <Navbar />

      <div className="max-w-4xl mx-auto px-8 pt-32">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-['DM_Sans'] text-3xl font-bold text-[#f8fafc]">Configurer votre analyse</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => { localStorage.removeItem('rentavision_draft'); window.location.reload(); }}
                className="text-sm font-['Inter'] text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-3">
            {([1, 2, 3, 4, 5, 6] as SectionId[]).map((step) => (
              <div key={step} className="flex items-center gap-3 flex-1">
                <div
                  className={`h-1 w-full rounded-full transition-colors duration-500 ${step <= activeSection ? 'bg-[#3b82f6]' : 'bg-white/[0.10]'}`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest">
            {['Bien', 'Financement', 'Travaux', 'Juridique', 'Fiscalité', 'Avancé'].map((l, i) => (
              <span key={l} className={i + 1 <= activeSection ? 'text-[#3b82f6]' : 'text-[#64748b]'}>{l}</span>
            ))}
          </div>
        </header>

        {/* ═══ SECTION 1 — LE BIEN ═══ */}
        <div className={sectionBase}>
          <SectionHeader num="01 — LE BIEN" title="Caractéristiques du bien" isActive={activeSection === 1} onClick={() => toggleSection(1)} valid={!!(selectedCity && surface && propertyValue)} />
          {activeSection === 1 && (
            <div className="p-8 bg-white/[0.02] animate-fade-in-down">
              {/* City search */}
              <InputField label="Ville / Commune" required hint="Tapez pour rechercher — les données de marché se chargent automatiquement.">
                <CitySearchInput
                  value={selectedCity}
                  onSelect={handleCitySelect}
                  onClear={handleCitylear}
                  status={apiLoading ? 'loading' : marketData ? 'success' : apiError ? 'error' : 'idle'}
                />
                {marketData && !apiLoading && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#10b981] font-['Inter']">
                    <Zap className="w-3 h-3" />
                    Données chargées — Loyer moyen : {marketData.long.loyerMoyenM2}€/m² · ADR Airbnb : {marketData.short.adr}€
                  </div>
                )}
              </InputField>

              {/* Manual override */}
              {apiError && (
                <div className="mt-4 mb-6 p-6 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20 animate-fade-in-down">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
                    <h4 className="text-sm font-bold text-[#ef4444] font-['Inter']">Données non disponibles — Saisie manuelle</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Loyer moyen (€/m²)', value: marketData?.long.loyerMoyenM2 ?? '', onChange: (v: number) => setMarketData(prev => prev ? { ...prev, long: { ...prev.long, loyerMoyenM2: v } } : { long: { loyerMoyenM2: v, plafondLoyer: null, zone: '' }, short: { adr: 85, tauxOccupationAnnuel: 0.72, tauxOccupationEte: 0.9, revenusEstimesMensuel: 1800 } }) },
                      { label: 'ADR Airbnb (€/nuit)', value: marketData?.short.adr ?? '', onChange: (v: number) => setMarketData(prev => prev ? { ...prev, short: { ...prev.short, adr: v } } : { long: { loyerMoyenM2: 15, plafondLoyer: null, zone: '' }, short: { adr: v, tauxOccupationAnnuel: 0.72, tauxOccupationEte: 0.9, revenusEstimesMensuel: v * 30 * 0.72 } }) },
                      { label: 'Taux occupation (%)', value: marketData?.short.tauxOccupationAnnuel ? marketData.short.tauxOccupationAnnuel * 100 : '', onChange: (v: number) => setMarketData(prev => prev ? { ...prev, short: { ...prev.short, tauxOccupationAnnuel: v / 100 } } : { long: { loyerMoyenM2: 15, plafondLoyer: null, zone: '' }, short: { adr: 85, tauxOccupationAnnuel: v / 100, tauxOccupationEte: Math.min(0.98, v / 100 * 1.25), revenusEstimesMensuel: 85 * 30 * v / 100 } }) },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block text-xs font-medium text-[#94a3b8] mb-2 font-['Inter']">{f.label}</label>
                        <input
                          type="number"
                          value={f.value}
                          onChange={e => f.onChange(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-lg bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['JetBrains_Mono'] focus:border-[#3b82f6] focus:outline-none transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quartier — affiché uniquement si la ville a des quartiers */}
              {selectedCity?.quartiers && (
                <div className="mt-4 mb-2 animate-fade-in-down">
                  <InputField
                    label="Quartier / Secteur"
                    hint="Optionnel — affine le prix au m² avec des données locales."
                  >
                    <div className="relative">
                      <select
                        value={selectedQuartier?.nom ?? ''}
                        onChange={e => {
                          const q = selectedCity.quartiers!.find(q => q.nom === e.target.value) ?? null;
                          setSelectedQuartier(q);
                          if (q && surface > 0) setPropertyValue(Math.round(q.priceM2 * surface));
                        }}
                        className="w-full px-4 py-4 rounded-xl bg-[#0c1222] border border-[#8b5cf6]/40 text-[#f8fafc] font-['Inter'] focus:outline-none focus:border-[#8b5cf6] transition-all appearance-none cursor-pointer text-sm"
                      >
                        <option value="">— Ville entière (prix moyen : {selectedCity.pricePerM2?.toLocaleString('fr-FR')}€/m²)</option>
                        {selectedCity.quartiers.map(q => (
                          <option key={q.nom} value={q.nom}>
                            {q.nom} — {q.priceM2.toLocaleString('fr-FR')}€/m²
                            {q.loyerM2 ? ` · loyer ~${q.loyerM2}€/m²` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b5cf6] pointer-events-none" />
                    </div>
                    {selectedQuartier && (
                      <div className="mt-2 flex items-center gap-2 text-xs font-['Inter']">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] shrink-0" />
                        <span className="text-[#8b5cf6]">
                          <strong>{selectedQuartier.nom}</strong> — {selectedQuartier.priceM2.toLocaleString('fr-FR')}€/m²
                          {selectedQuartier.loyerM2 && <> · loyer estimé <strong>{selectedQuartier.loyerM2}€/m²/mois</strong></>}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedQuartier(null)}
                          className="ml-auto text-[#64748b] hover:text-[#94a3b8] transition-colors text-[10px]"
                        >
                          Réinitialiser
                        </button>
                      </div>
                    )}
                  </InputField>
                </div>
              )}

              {/* Surface + Price + Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6">
                <InputField label="Type de bien">
                  <div className="relative">
                    <select
                      value={propertyType}
                      onChange={e => setPropertyType(e.target.value as any)}
                      className="w-full px-4 py-4 rounded-xl bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['Inter'] focus:outline-none focus:border-[#3b82f6] transition-all appearance-none cursor-pointer text-sm"
                    >
                      <option value="T1/T2">Appartement T1/T2</option>
                      <option value="T3+">Appartement T3 ou +</option>
                      <option value="Maison">Maison</option>
                      <option value="Autre">Autre</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b] pointer-events-none" />
                  </div>
                </InputField>

                <InputField label="Surface (m²)" required>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="65"
                      value={surface || ''}
                      onChange={e => setSurface(Number(e.target.value))}
                      className="w-full px-4 pr-12 py-4 rounded-xl bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['JetBrains_Mono'] text-lg focus:outline-none focus:border-[#3b82f6] transition-all text-right"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b]">m²</span>
                  </div>
                </InputField>
                <InputField label="Prix d'achat / Valeur du bien" required>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f8fafc] font-['JetBrains_Mono'] font-bold">€</span>
                    <input
                      type="number"
                      placeholder="250000"
                      value={propertyValue || ''}
                      onChange={e => setPropertyValue(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-4 rounded-xl bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['JetBrains_Mono'] text-lg focus:outline-none focus:border-[#3b82f6] transition-all text-right"
                    />
                  </div>
                  {/* Badge prix au m² effectif (quartier ou ville) */}
                  {effectivePriceM2 && selectedCity && (
                    <div className={`mt-2 flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${
                      selectedQuartier
                        ? 'bg-[#8b5cf6]/5 border-[#8b5cf6]/20'
                        : 'bg-[#10b981]/5 border-[#10b981]/20'
                    }`}>
                      <span className={`text-xs font-['Inter'] ${selectedQuartier ? 'text-[#8b5cf6]' : 'text-[#10b981]'}`}>
                        {selectedQuartier
                          ? <><strong>{selectedQuartier.nom}</strong> · {effectivePriceM2.toLocaleString('fr-FR')}€/m²</>
                          : <>Prix médian à {selectedCity.nom} : <strong>{effectivePriceM2.toLocaleString('fr-FR')}€/m²</strong></>
                        }
                        {surface > 0 && <> · <strong>{(effectivePriceM2 * surface).toLocaleString('fr-FR')}€</strong> pour {surface}m²</>}
                      </span>
                      {surface > 0 && (
                        <button
                          type="button"
                          onClick={() => setPropertyValue(Math.round(effectivePriceM2 * surface))}
                          className={`shrink-0 text-[10px] px-2 py-1 rounded font-bold font-['Inter'] transition-colors ${
                            selectedQuartier
                              ? 'bg-[#8b5cf6]/15 hover:bg-[#8b5cf6]/30 text-[#8b5cf6]'
                              : 'bg-[#10b981]/15 hover:bg-[#10b981]/30 text-[#10b981]'
                          }`}
                        >
                          Appliquer
                        </button>
                      )}
                    </div>
                  )}
                </InputField>
              </div>

              {/* Fallback manuel prix au m² (ville non trouvée en base) */}
              {selectedCity && pricePerM2Db === null && (
                <div className="mt-2 mb-6 p-5 rounded-xl bg-[#f59e0b]/5 border border-[#f59e0b]/20 animate-fade-in-down">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0" />
                    <p className="text-sm font-semibold text-[#f59e0b] font-['Inter']">
                      Donnée automatique non disponible pour {selectedCity.nom}
                    </p>
                  </div>
                  <p className="text-xs text-[#94a3b8] font-['Inter'] mb-3">
                    Saisissez le prix au m² constaté localement pour calculer automatiquement la valeur du bien.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        placeholder="ex : 3500"
                        value={manualPricePerM2 || ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setManualPricePerM2(val);
                          if (val > 0 && surface > 0) setPropertyValue(Math.round(val * surface));
                        }}
                        className="w-full px-4 pr-16 py-3 rounded-lg bg-[#0c1222] border border-[#f59e0b]/30 focus:border-[#f59e0b] text-[#f8fafc] font-['JetBrains_Mono'] focus:outline-none transition-all text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] text-sm">€/m²</span>
                    </div>
                    {manualPricePerM2 > 0 && surface > 0 && (
                      <span className="text-xs text-[#94a3b8] font-['Inter'] shrink-0">
                        → <strong className="text-[#f8fafc]">{(manualPricePerM2 * surface).toLocaleString('fr-FR')}€</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* DPE */}
              <InputField label="Diagnostic de Performance Énergétique (DPE)">
                <div className="flex gap-2 flex-wrap">
                  {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as DPEGrade[]).map(grade => (
                    <button
                      key={grade}
                      onClick={() => setDpe(grade)}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center font-bold font-['JetBrains_Mono'] text-sm transition-all duration-300 ${
                        dpe === grade
                          ? dpeColors[grade] + ' bg-current/10 scale-110'
                          : dpeColors[grade] + ' opacity-50 hover:opacity-80'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
                {(dpe === 'F' || dpe === 'G') && (
                  <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20">
                    <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0" />
                    <p className="text-xs text-[#ef4444] font-['Inter']">
                      ⚠️ Bien classé {dpe} — {dpe === 'G' ? 'Location longue durée INTERDITE depuis le 1er janvier 2025.' : 'Location longue durée interdite à compter du 1er janvier 2028.'} Les calculs en tiennent compte.
                    </p>
                  </div>
                )}
              </InputField>

              {/* Meublé / Nu toggle */}
              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm font-medium text-[#f8fafc] font-['Inter']">Location meublée</span>
                <button
                  onClick={() => setMeuble(!meuble)}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${meuble ? 'bg-[#3b82f6]' : 'bg-white/[0.10]'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${meuble ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-[#64748b] mt-1 font-['Inter']">{meuble ? 'Meublé — Éligible Micro-BIC (50%) ou LMNP Réel' : 'Nu — Éligible Micro-Foncier (30%) ou Réel Foncier'}</p>

              <div className="mt-6 flex justify-end">
                <button onClick={() => setActiveSection(2)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3b82f6] text-white text-sm font-['Inter'] font-medium hover:bg-[#2563eb] transition-colors">
                  Suivant <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ SECTION 2 — FINANCEMENT ═══ */}
        <div className={sectionBase}>
          <SectionHeader num="02 — FINANCEMENT" title="Crédit & Charges" isActive={activeSection === 2} onClick={() => toggleSection(2)} valid={true} />
          {activeSection === 2 && (
            <div className="p-8 bg-white/[0.02] animate-fade-in-down space-y-8">
              {/* Toggle loan */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#f8fafc] font-['Inter']">J'ai un crédit en cours</span>
                <button
                  onClick={() => setHasOngoingLoan(!hasOngoingLoan)}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${hasOngoingLoan ? 'bg-[#3b82f6]' : 'bg-white/[0.10]'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${hasOngoingLoan ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              {hasOngoingLoan && (
                <div className="space-y-8 animate-fade-in-down">
                  {/* Mensualité */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-[#94a3b8] font-['Inter']">Mensualité de crédit</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={Math.round(mensualiteCredit || estimatedMonthlyPayment)}
                          onChange={e => setMensualiteCredit(Math.min(5000, Math.max(0, Number(e.target.value))))}
                          className="w-20 bg-transparent border-b border-white/20 text-right text-sm font-bold text-[#f8fafc] font-['JetBrains_Mono'] focus:outline-none focus:border-[#3b82f6] transition-colors"
                        />
                        <span className="text-sm font-bold text-[#f8fafc] font-['JetBrains_Mono']">€</span>
                      </div>
                    </div>
                    <Slider value={mensualiteCredit || Math.round(estimatedMonthlyPayment)} min={0} max={5000} step={50} onChange={v => setMensualiteCredit(v)} />
                    <div className="flex justify-between text-xs text-[#64748b] mt-1 font-['JetBrains_Mono']">
                      <span>0 €</span><span>5 000 €</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    {/* Rate */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-medium text-[#94a3b8] font-['Inter']">Taux d'intérêt</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={interestRate}
                            step={0.05}
                            onChange={e => setInterestRate(Math.min(6, Math.max(0, Number(e.target.value))))}
                            className="w-16 bg-transparent border-b border-white/20 text-right text-sm font-bold text-[#f8fafc] font-['JetBrains_Mono'] focus:outline-none focus:border-[#3b82f6] transition-colors"
                          />
                          <span className="text-sm font-bold text-[#f8fafc] font-['JetBrains_Mono']">%</span>
                        </div>
                      </div>
                      <Slider value={interestRate} min={0} max={6} step={0.05} onChange={v => setInterestRate(v)} />
                    </div>
                    {/* Duration */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-medium text-[#94a3b8] font-['Inter']">Durée restante</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={dureeCredit}
                            onChange={e => setDureeCredit(Math.min(25, Math.max(1, Number(e.target.value))))}
                            className="w-12 bg-transparent border-b border-white/20 text-right text-sm font-bold text-[#f8fafc] font-['JetBrains_Mono'] focus:outline-none focus:border-[#3b82f6] transition-colors"
                          />
                          <span className="text-sm font-bold text-[#f8fafc] font-['JetBrains_Mono']">ans</span>
                        </div>
                      </div>
                      <Slider value={dureeCredit} min={1} max={25} step={1} onChange={v => setDureeCredit(v)} />
                    </div>
                  </div>

                  {/* Monthly payment display */}
                  <div className="p-6 rounded-xl bg-[#0c1222] border border-white/[0.10] flex justify-between items-center">
                    <div>
                      <div className="text-xs text-[#94a3b8] font-['Inter'] mb-1">Mensualité</div>
                      <div className="text-2xl font-bold text-[#f8fafc] font-['JetBrains_Mono']">{Math.round(mensualiteCredit || estimatedMonthlyPayment).toLocaleString('fr-FR')} €</div>
                    </div>
                    <div className="h-10 w-px bg-white/[0.10]" />
                    <div className="text-right">
                      <div className="text-xs text-[#94a3b8] font-['Inter'] mb-1">Coût total crédit</div>
                      <div className="text-lg font-bold text-[#ef4444] font-['JetBrains_Mono']">{Math.round(Math.max(0, totalLoanCost)).toLocaleString('fr-FR')} €</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Charges annuelles ── */}
              <div className="border-t border-white/[0.08] pt-6">
                <p className="text-xs font-['Inter'] text-[#64748b] uppercase tracking-widest mb-6">Charges annuelles du bien</p>
                <div className="grid grid-cols-3 gap-6">
                  <InputField label="Copropriété (€/an)">
                    <input type="number" value={chargesCopropriete || ''} onChange={e => setChargesCopropriete(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['JetBrains_Mono'] focus:outline-none focus:border-[#3b82f6] transition-all text-right" />
                  </InputField>
                  <InputField label="Taxe foncière (€/an)">
                    <input type="number" value={taxeFonciere || ''} onChange={e => setTaxeFonciere(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['JetBrains_Mono'] focus:outline-none focus:border-[#3b82f6] transition-all text-right" />
                  </InputField>
                  <InputField label="Assurance PNO (€/an)">
                    <input type="number" value={assurancePNO || ''} onChange={e => setAssurancePNO(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['JetBrains_Mono'] focus:outline-none focus:border-[#3b82f6] transition-all text-right" />
                  </InputField>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setActiveSection(1)} className="px-6 py-3 rounded-xl border border-white/[0.10] text-[#94a3b8] text-sm font-['Inter'] hover:text-[#f8fafc] hover:bg-white/[0.05] transition-colors">
                  Retour
                </button>
                <button onClick={() => setActiveSection(3)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3b82f6] text-white text-sm font-['Inter'] font-medium hover:bg-[#2563eb] transition-colors">
                  Suivant <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ SECTION 3 — TRAVAUX ═══ */}
        <div className={sectionBase}>
          <SectionHeader num="03 — TRAVAUX" title="Rénovation & Aménagement" isActive={activeSection === 3} onClick={() => toggleSection(3)} valid={!!(startDate)} />
          {activeSection === 3 && (
            <div className="p-8 bg-white/[0.02] animate-fade-in-down space-y-8">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-[#94a3b8] font-['Inter']">Budget Travaux</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={renovationBudget}
                      step={1000}
                      onChange={e => setRenovationBudget(Math.min(100000, Math.max(0, Number(e.target.value))))}
                      className="w-24 bg-transparent border-b border-white/20 text-right text-sm font-bold text-[#f59e0b] font-['JetBrains_Mono'] focus:outline-none focus:border-[#f59e0b] transition-colors"
                    />
                    <span className="text-sm font-bold text-[#f59e0b] font-['JetBrains_Mono']">€</span>
                  </div>
                </div>
                <Slider value={renovationBudget} min={0} max={100000} step={1000} onChange={v => setRenovationBudget(v)} color="#f59e0b" />
                <p className="text-xs text-[#64748b] mt-2 font-['Inter']">{meuble ? 'Amortissable sur 10 ans en LMNP Réel — réduit votre imposition à 0€.' : 'Déductible en régime réel foncier — crée un déficit foncier.'}</p>
              </div>

              <InputField label="Date de début de location" required>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-lg bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['Inter'] focus:outline-none focus:border-[#3b82f6] transition-all"
                  />
                </div>
              </InputField>

              <div className="flex justify-between pt-2">
                <button onClick={() => setActiveSection(2)} className="px-6 py-3 rounded-xl border border-white/[0.10] text-[#94a3b8] text-sm font-['Inter'] hover:text-[#f8fafc] hover:bg-white/[0.05] transition-colors">Retour</button>
                <button onClick={() => setActiveSection(4)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3b82f6] text-white text-sm font-['Inter'] font-medium hover:bg-[#2563eb] transition-colors">
                  Suivant <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ SECTION 4 — JURIDIQUE (replaces Photos) ═══ */}
        <div className={sectionBase}>
          <SectionHeader num="04 — JURIDIQUE" title="Contexte Juridique" isActive={activeSection === 4} onClick={() => toggleSection(4)} valid={true} />
          {activeSection === 4 && (
            <div className="p-8 bg-white/[0.02] animate-fade-in-down space-y-6">
              <div className="flex items-start gap-3 mb-4 p-4 rounded-xl bg-[#3b82f6]/5 border border-[#3b82f6]/20">
                <Info className="w-5 h-5 text-[#3b82f6] shrink-0 mt-0.5" />
                <p className="text-xs text-[#94a3b8] font-['Inter'] leading-relaxed">
                  Ces informations sont essentielles pour activer le <strong className="text-[#f8fafc]">bouclier juridique</strong> : elles déterminent si la courte durée est légalement possible et les plafonds applicables.
                </p>
              </div>

              {/* Résidence principale */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#0c1222] border border-white/[0.06]">
                <div>
                  <span className="text-sm font-medium text-[#f8fafc] font-['Inter']">Résidence principale</span>
                  <p className="text-xs text-[#64748b] font-['Inter'] mt-1">Si oui, la courte durée est plafonnée à 120 nuits/an</p>
                </div>
                <button onClick={() => setIsPrimaryResidence(!isPrimaryResidence)}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isPrimaryResidence ? 'bg-[#f59e0b]' : 'bg-white/[0.10]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${isPrimaryResidence ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              {/* Copropriété autorise CD */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#0c1222] border border-white/[0.06]">
                <div>
                  <span className="text-sm font-medium text-[#f8fafc] font-['Inter']">La copropriété autorise la courte durée</span>
                  <p className="text-xs text-[#64748b] font-['Inter'] mt-1">Si non, le scénario Airbnb sera bloqué</p>
                </div>
                <button onClick={() => setAllowsShortTerm(!allowsShortTerm)}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${allowsShortTerm ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${allowsShortTerm ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              {!allowsShortTerm && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20">
                  <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0" />
                  <p className="text-xs text-[#ef4444] font-['Inter']">🚫 Le scénario Courte Durée sera marqué comme BLOQUÉ dans les résultats.</p>
                </div>
              )}

              {/* Classement tourisme */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#0c1222] border border-white/[0.06]">
                <div>
                  <span className="text-sm font-medium text-[#f8fafc] font-['Inter']">Classé meublé de tourisme</span>
                  <p className="text-xs text-[#64748b] font-['Inter'] mt-1">Ouvre l'abattement majoré à 71% en Micro-BIC</p>
                </div>
                <button onClick={() => setIsClassifiedTourist(!isClassifiedTourist)}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isClassifiedTourist ? 'bg-[#8b5cf6]' : 'bg-white/[0.10]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${isClassifiedTourist ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setActiveSection(3)} className="px-6 py-3 rounded-xl border border-white/[0.10] text-[#94a3b8] text-sm font-['Inter'] hover:text-[#f8fafc] hover:bg-white/[0.05] transition-colors">Retour</button>
                <button onClick={() => setActiveSection(5)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3b82f6] text-white text-sm font-['Inter'] font-medium hover:bg-[#2563eb] transition-colors">
                  Suivant <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ SECTION 5 — FISCALITÉ ═══ */}
        <div className={sectionBase}>
          <SectionHeader num="05 — FISCALITÉ" title="Votre Contexte Fiscal" isActive={activeSection === 5} onClick={() => toggleSection(5)} valid={revenuAnnuel > 0} />
          {activeSection === 5 && (
            <div className="p-8 bg-white/[0.02] animate-fade-in-down">
              <div className="grid grid-cols-2 gap-8 mb-8">
                <InputField label="Revenu annuel net imposable" required hint="Indispensable pour le calcul progressif de votre TMI.">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f8fafc] font-['JetBrains_Mono'] font-bold">€</span>
                    <input
                      type="number"
                      placeholder="35000"
                      value={revenuAnnuel || ''}
                      onChange={e => setRevenuAnnuel(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-4 rounded-xl bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['JetBrains_Mono'] text-lg focus:outline-none focus:border-[#3b82f6] transition-all text-right"
                    />
                  </div>
                </InputField>

                <InputField label="Situation familiale">
                  <div className="relative">
                    <select
                      value={`${maritalStatus}-${childrenCount}`}
                      onChange={e => {
                        const [status, children] = e.target.value.split('-');
                        setMaritalStatus(status as 'celibataire' | 'couple');
                        setChildrenCount(Number(children));
                      }}
                      className="w-full px-4 py-3 rounded-lg bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['Inter'] focus:outline-none focus:border-[#3b82f6] transition-all appearance-none cursor-pointer"
                    >
                      <option value="celibataire-0">Célibataire (1 part)</option>
                      <option value="couple-0">Couple (2 parts)</option>
                      <option value="couple-1">Couple + 1 enfant (2.5 parts)</option>
                      <option value="couple-2">Couple + 2 enfants (3 parts)</option>
                      <option value="couple-3">Couple + 3 enfants (4 parts)</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b] pointer-events-none" />
                  </div>
                </InputField>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setActiveSection(4)} className="px-6 py-3 rounded-xl border border-white/[0.10] text-[#94a3b8] text-sm font-['Inter'] hover:text-[#f8fafc] hover:bg-white/[0.05] transition-colors">Retour</button>
                <button onClick={() => setActiveSection(6)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3b82f6] text-white text-sm font-['Inter'] font-medium hover:bg-[#2563eb] transition-colors">
                  Suivant <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ SECTION 6 — AVANCÉ ═══ */}
        <div className={sectionBase}>
          <SectionHeader num="06 — AVANCÉ" title="Hypothèses de Projection" isActive={activeSection === 6} onClick={() => toggleSection(6)} />
          {activeSection === 6 && (
            <div className="p-8 bg-white/[0.02] animate-fade-in-down space-y-6">
              <p className="text-xs font-['Inter'] text-[#64748b] uppercase tracking-widest border-b border-white/[0.05] pb-2">Projections sur 15 ans</p>

              {[
                { label: 'Inflation locative annuelle', value: rentInflation, onChange: setRentInflation, min: 0, max: 5, step: 0.1 },
                { label: 'Appréciation immobilière annuelle', value: propertyAppreciation, onChange: setPropertyAppreciation, min: 0, max: 8, step: 0.1 },
                { label: 'Croissance des charges annuelle', value: expenseGrowth, onChange: setExpenseGrowth, min: 0, max: 5, step: 0.1 },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-[#94a3b8] font-['Inter']">{s.label}</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={parseFloat((s.value * 100).toFixed(1))}
                        step={s.step}
                        onChange={e => s.onChange(Math.min(s.max, Math.max(s.min, Number(e.target.value))) / 100)}
                        className="w-16 bg-transparent border-b border-white/20 text-right text-sm font-bold text-[#f8fafc] font-['JetBrains_Mono'] focus:outline-none focus:border-[#94a3b8] transition-colors"
                      />
                      <span className="text-sm font-bold text-[#f8fafc] font-['JetBrains_Mono']">%</span>
                    </div>
                  </div>
                  <Slider
                    value={s.value * 100}
                    min={s.min} max={s.max} step={s.step}
                    onChange={v => s.onChange(v / 100)}
                    color="#94a3b8"
                  />
                </div>
              ))}

              <div className="flex justify-between pt-2">
                <button onClick={() => setActiveSection(5)} className="px-6 py-3 rounded-xl border border-white/[0.10] text-[#94a3b8] text-sm font-['Inter'] hover:text-[#f8fafc] hover:bg-white/[0.05] transition-colors">Retour</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── FIXED FOOTER BAR ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0c1222]/90 backdrop-blur-xl border-t border-white/[0.10] px-8 py-6 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-[#64748b] font-['Inter']">
            Temps estimé : <span className="text-[#f8fafc] font-medium">2 min</span>
            {!isValid && <span className="ml-3 text-[#64748b]">— Complétez les champs obligatoires *</span>}
          </div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && !localStorage.getItem('userEmail')) {
                setShowLeadModal(true);
              } else {
                handleLaunch();
              }
            }}
            disabled={!isValid || launching}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold font-['Inter'] transition-all shadow-lg ${
              isValid && !launching
                ? 'bg-[#10b981] hover:bg-[#34d399] text-[#0c1222] shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'bg-white/[0.05] text-[#64748b] cursor-not-allowed'
            }`}
          >
            {launching && <Loader2 className="w-4 h-4 animate-spin" />}
            Lancer l'analyse
          </button>
        </div>
      </div>

      {/* ─── LEAD CAPTURE MODAL ─── */}
      {showLeadModal && (
        <LeadCaptureModal
          onClose={() => setShowLeadModal(false)}
          onSubmit={(email) => {
            localStorage.setItem('userEmail', email);
            setShowLeadModal(false);
            fetch('/api/collect-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            }).catch(() => {/* silent */});
            handleLaunch();
          }}
        />
      )}

    </div>
  );
}
