import fs from 'fs';
import path from 'path';
import type { MarketDataLongTerm, MarketDataShortTerm } from '@/lib/taxCalculator';

// ============================
// MARKET DATA TYPES (legacy compat)
// ============================

export interface MarketDataResponse {
  long: MarketDataLongTerm;
  short: MarketDataShortTerm;
}

// ============================
// DATABASE CACHE
// ============================

let rentDictionary: Record<string, any> | null = null;

function loadRentDictionary() {
  if (rentDictionary) return rentDictionary;
  try {
    const dataPath = path.join(process.cwd(), 'data', 'rent-market.json');
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      rentDictionary = JSON.parse(raw);
    } else {
      rentDictionary = {};
    }
  } catch (error) {
    console.error('[MarketAPI] Failed to parse rent-market.json:', error);
    rentDictionary = {};
  }
  return rentDictionary;
}

function normalizeCity(name: string) {
  if (!name) return '';
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/-/g, ' ')
    .trim();
}

// ============================
// MOCK DATA (used when API key not set or fallback)
// ============================

function generateFallbackMarketData(city: string, ministereData?: any): MarketDataResponse {
  // Loyer LD : données ministère si disponibles, sinon profil conservateur petite ville
  const loyerMoyenM2 = ministereData?.app ?? ministereData?.mai ?? 10;

  // Profil conservateur petite ville de province — valeurs fixes, pas de seed aléatoire
  // Hypothèse saisonnière : 60% en été, 35% hors-saison → ~45% annuel
  const adr = 45;
  const tauxOccupationAnnuel = 0.45;
  const tauxOccupationEte = 0.60;

  return {
    long: {
      loyerMoyenM2: Math.round(loyerMoyenM2 * 100) / 100,
      plafondLoyer: null,
      zone: city,
      donneesMinistere: ministereData,
    },
    short: {
      adr,
      tauxOccupationAnnuel,
      tauxOccupationEte,
      revenusEstimesMensuel: Math.round(adr * 30 * tauxOccupationAnnuel),
    },
  };
}

// ============================
// AIRDNA API INTEGRATION
// ============================

interface AirDNAMarketResponse {
  market_stats?: {
    avg_daily_rate?: { ltm: number };
    occupancy?: { ltm: number };
    revenue?: { ltm: number };
  };
  property_stats?: {
    active_listings?: number;
  };
}

export async function fetchMarketDataFromAPI(address: string, city: string, ministereData?: any): Promise<MarketDataResponse | null> {
  const apiKey = process.env.AIRDNA_API_KEY;

  if (!apiKey || apiKey === 'your_airdna_api_key') {
    return null; // Will fallback to mock logic which includes ministry data
  }

  try {
    const encodedCity = encodeURIComponent(city);
    const response = await fetch(
      `https://api.airdna.co/v1/market/summary?location=${encodedCity}&access_token=${apiKey}`,
      { next: { revalidate: 86400 } } // Cache for 24h
    );

    if (!response.ok) {
      console.error('[MarketAPI] AirDNA API error:', response.status);
      return null;
    }

    const data: AirDNAMarketResponse = await response.json();

    const adr = data.market_stats?.avg_daily_rate?.ltm ?? 85;
    const occupancy = data.market_stats?.occupancy?.ltm ?? 0.72;
    // Prioritize real government data over AirDNA rough estimates for long term
    let finalLoyerM2 = (adr * 30 * occupancy) / 50; // AirDNA rough estimation
    if (ministereData && ministereData.app) {
      finalLoyerM2 = ministereData.app;
    } else if (ministereData && ministereData.mai) {
      finalLoyerM2 = ministereData.mai;
    }

    return {
      long: {
        loyerMoyenM2: Math.round(finalLoyerM2 * 100) / 100,
        plafondLoyer: null,
        zone: city,
        donneesMinistere: ministereData,
      },
      short: {
        adr,
        tauxOccupationAnnuel: occupancy,
        tauxOccupationEte: Math.min(0.98, occupancy * 1.25),
        revenusEstimesMensuel: Math.round(adr * 30 * occupancy),
      },
    };
  } catch (error) {
    console.error('[MarketAPI] Failed to fetch market data:', error);
    return null;
  }
}

// ============================
// MAIN EXPORT — called from API route
// ============================

export async function getMarketData(address: string, city: string): Promise<MarketDataResponse> {
  const dictionary = loadRentDictionary();
  const cityKey = normalizeCity(city || address);
  const minData = dictionary?.[cityKey] || null;

  // Try AirDNA first
  const apiData = await fetchMarketDataFromAPI(address, city, minData);
  if (apiData) return apiData;

  // Fall back
  return generateFallbackMarketData(city, minData);
}
