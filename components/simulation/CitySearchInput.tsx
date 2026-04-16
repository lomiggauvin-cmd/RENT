'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, Check, ChevronDown } from 'lucide-react';
import villesData from '@/data/villes.json';

// ── Types ────────────────────────────────────────────────────

interface GeoCommune {
  nom: string;
  code: string;
  codesPostaux: string[];
  population?: number;
  departement?: { code: string; nom: string };
}

export interface Quartier {
  nom: string;
  priceM2: number;
  loyerM2?: number;
  /** ADR local (€/nuit) pour la courte durée */
  adr?: number;
  /** Code postal du quartier/arrondissement (Paris, Lyon, Marseille) */
  cp?: string;
}

interface VilleEntry {
  nom: string;
  priceM2: number;
  /** ADR moyen de la ville (€/nuit) */
  adr?: number;
  quartiers?: Quartier[];
}

export interface SelectedCity {
  nom: string;
  codePostal: string;
  codeInsee: string;
  departement: string;
  /** Prix moyen ville (DB) — null si ville absente */
  pricePerM2: number | null;
  /** ADR ville issu du JSON local — null si absent */
  adr: number | null;
  /** Liste de quartiers disponibles, null si aucun */
  quartiers: Quartier[] | null;
  /** Quartier pré-sélectionné automatiquement via code postal exact */
  autoSelectedQuartier?: Quartier;
}

interface CitySearchInputProps {
  value: SelectedCity | null;
  onSelect: (city: SelectedCity) => void;
  onClear?: () => void;
  status: 'idle' | 'loading' | 'success' | 'error';
}

// ── Helpers ──────────────────────────────────────────────────

const villes = villesData as Record<string, VilleEntry>;

function lookupCity(codeInsee: string): { priceM2: number | null; adr: number | null; quartiers: Quartier[] | null } {
  const entry = villes[codeInsee];
  if (!entry) return { priceM2: null, adr: null, quartiers: null };
  return {
    priceM2: entry.priceM2,
    adr: entry.adr ?? null,
    quartiers: entry.quartiers ?? null,
  };
}

// Département par préfixe INSEE (pour les villes avec arrondissements)
const DEPT_FROM_INSEE_PREFIX: Record<string, string> = {
  '75': 'Paris',
  '69': 'Rhône',
  '13': 'Bouches-du-Rhône',
};

function lookupByQuartierCP(cp: string): { codeInsee: string; entry: VilleEntry; quartier: Quartier } | null {
  for (const [codeInsee, entry] of Object.entries(villes)) {
    if (!entry.quartiers) continue;
    const quartier = entry.quartiers.find(q => q.cp === cp);
    if (quartier) return { codeInsee, entry, quartier };
  }
  return null;
}

function formatPopulation(n?: number): string {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M hab.`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k hab.`;
  return `${n} hab.`;
}

// ── Component ────────────────────────────────────────────────

export default function CitySearchInput({
  value,
  onSelect,
  onClear,
  status,
}: CitySearchInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoCommune[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [cpError, setCpError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fermeture au clic extérieur
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setIsOpen(false); return; }
    // 5-digit CP → handled by direct local lookup in onChange, skip geo API
    if (/^\d{5}$/.test(q)) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setFetching(true);
    try {
      const url =
        `https://geo.api.gouv.fr/communes` +
        `?nom=${encodeURIComponent(q)}` +
        `&boost=population&limit=6` +
        `&fields=nom,code,codesPostaux,population,departement`;
      const res = await fetch(url, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error('geo API error');
      const data: GeoCommune[] = await res.json();
      setSuggestions(data);
      setIsOpen(data.length > 0);
      setActiveIndex(-1);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') setSuggestions([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchSuggestions(query), 250);
    return () => clearTimeout(t);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const li = listRef.current.children[activeIndex] as HTMLElement;
      li?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const selectCommune = (commune: GeoCommune) => {
    const codePostal = commune.codesPostaux?.[0] ?? '';
    const { priceM2, adr, quartiers } = lookupCity(commune.code);
    const city: SelectedCity = {
      nom: commune.nom,
      codePostal,
      codeInsee: commune.code,
      departement: commune.departement?.nom ?? '',
      pricePerM2: priceM2,
      adr,
      quartiers,
    };
    onSelect(city);
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0) selectCommune(suggestions[activeIndex]); }
    else if (e.key === 'Escape') { setIsOpen(false); setActiveIndex(-1); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setCpError(false);

    // Intercept 5-digit postal codes for direct local lookup
    if (/^\d{5}$/.test(v)) {
      const match = lookupByQuartierCP(v);
      if (match) {
        const dept = DEPT_FROM_INSEE_PREFIX[match.codeInsee.slice(0, 2)] ?? '';
        const city: SelectedCity = {
          nom: match.entry.nom,
          codePostal: v,
          codeInsee: match.codeInsee,
          departement: dept,
          pricePerM2: match.entry.priceM2,
          adr: match.entry.adr ?? null,
          quartiers: match.entry.quartiers ?? null,
          autoSelectedQuartier: match.quartier,
        };
        onSelect(city);
        setQuery('');
        setSuggestions([]);
        setIsOpen(false);
        return;
      }
      // 5-digit CP not found in any quartier → block geo API, show error
      setSuggestions([]);
      setIsOpen(false);
      setCpError(true);
      setQuery(v);
      return;
    }

    setQuery(v);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setCpError(false);
    onClear?.();
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b] pointer-events-none z-10" />

        {value ? (
          <div className="w-full pl-12 pr-12 py-4 rounded-xl bg-[#0c1222] border border-[#10b981]/40 text-[#f8fafc] font-['Inter'] flex items-center">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold truncate">{value.nom}</span>
              <span className="text-[#64748b] text-sm shrink-0">
                {value.codePostal}
                {value.departement ? ` · ${value.departement}` : ''}
              </span>
              {value.quartiers && (
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#8b5cf6]/15 text-[#8b5cf6] text-[10px] font-bold font-['Inter']">
                  {value.quartiers.length} quartiers
                </span>
              )}
            </div>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            placeholder="Commune ou code postal (ex : 75006)…"
            value={query}
            onChange={handleInputChange}
            onFocus={() => query.length >= 2 && suggestions.length > 0 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className={`w-full pl-12 pr-12 py-4 rounded-xl bg-[#0c1222] text-[#f8fafc] font-['Inter'] focus:outline-none placeholder-[#475569] transition-all ${
              cpError
                ? 'border border-[#ef4444]/60 focus:border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]'
                : 'border border-white/[0.10] focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]'
            }`}
          />
        )}

        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {fetching ? (
            <Loader2 className="w-4 h-4 text-[#3b82f6] animate-spin" />
          ) : status === 'loading' ? (
            <Loader2 className="w-5 h-5 text-[#3b82f6] animate-spin" />
          ) : status === 'success' ? (
            <Check className="w-5 h-5 text-[#10b981]" />
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              className="w-5 h-5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-[#94a3b8] hover:text-[#f8fafc] transition-colors text-xs"
              title="Changer de ville"
            >
              ✕
            </button>
          ) : (
            <ChevronDown className="w-4 h-4 text-[#64748b]" />
          )}
        </div>
      </div>

      {cpError && (
        <p className="mt-1.5 text-xs text-[#ef4444] font-['Inter'] px-1">
          Code postal non reconnu dans notre base. Recherchez votre commune par nom (ex&nbsp;: &quot;Paris&quot;, &quot;Lyon&quot;…).
        </p>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-[#0f172a] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
        >
          {suggestions.map((commune, idx) => {
            const { priceM2, quartiers } = lookupCity(commune.code);
            const isActive = idx === activeIndex;
            return (
              <li
                key={commune.code}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => { e.preventDefault(); selectCommune(commune); }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                  isActive ? 'bg-[#3b82f6]/10' : 'hover:bg-white/[0.04]'
                } ${idx !== 0 ? 'border-t border-white/[0.04]' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MapPin className="w-4 h-4 text-[#475569] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#f8fafc] font-['Inter'] truncate">{commune.nom}</p>
                    <p className="text-xs text-[#64748b] font-['Inter']">
                      {commune.codesPostaux?.[0]}
                      {commune.departement ? ` · ${commune.departement.nom}` : ''}
                      {commune.population ? ` · ${formatPopulation(commune.population)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {priceM2 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 text-[10px] font-bold text-[#10b981] font-['Inter']">
                      Prix auto
                    </span>
                  )}
                  {quartiers && (
                    <span className="px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[10px] font-bold text-[#8b5cf6] font-['Inter']">
                      Quartiers
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
