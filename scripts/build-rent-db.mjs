import fs from 'fs';
import path from 'path';
import readline from 'readline';

const CSV_FILES = {
  app: 'pred-app-mef-dhup.csv',
  app12: 'pred-app12-mef-dhup.csv',
  app3: 'pred-app3-mef-dhup.csv',
  mai: 'pred-mai-mef-dhup.csv'
};

const BASE_DIR = path.join(process.cwd(), 'base de donnée');
const OUT_DIR = path.join(process.cwd(), 'data');
const OUT_FILE = path.join(OUT_DIR, 'rent-market.json');

const dictionary = {};

function normalizeCity(name) {
  if (!name) return "";
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")
    .trim();
}

async function processFile(type, filename) {
  const filepath = path.join(BASE_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`File not found: ${filepath}`);
    return;
  }
  
  const fileStream = fs.createReadStream(filepath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isFirst = true;
  let cityIndex = -1;
  let rentIndex = -1;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const parts = line.split(';');
    
    if (isFirst) {
      cityIndex = parts.findIndex(p => p.includes('LIBGEO'));
      rentIndex = parts.findIndex(p => p.includes('loypredm2'));
      isFirst = false;
      continue;
    }

    if (cityIndex === -1 || rentIndex === -1) continue;

    const rawCity = parts[cityIndex]?.replace(/(^"|"$)/g, '');
    const rawRent = parts[rentIndex]?.replace(/(^"|"$)/g, '');

    if (!rawCity || !rawRent) continue;

    const rentVal = parseFloat(rawRent.replace(',', '.'));
    if (isNaN(rentVal)) continue;

    const cityNorm = normalizeCity(rawCity);
    
    if (!dictionary[cityNorm]) {
      dictionary[cityNorm] = {};
    }
    
    if (!dictionary[cityNorm][type]) {
      dictionary[cityNorm][type] = { sum: rentVal, count: 1 };
    } else {
      dictionary[cityNorm][type].sum += rentVal;
      dictionary[cityNorm][type].count += 1;
    }
  }
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  for (const [type, filename] of Object.entries(CSV_FILES)) {
    console.log(`Processing ${filename} into '${type}'...`);
    await processFile(type, filename);
  }
  
  const finalDict = {};
  for (const city in dictionary) {
    finalDict[city] = {};
    for (const type in dictionary[city]) {
      const data = dictionary[city][type];
      finalDict[city][type] = Math.round((data.sum / data.count) * 100) / 100;
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(finalDict));
  console.log(`✅ Success! Wrote ${Object.keys(finalDict).length} cities to ${OUT_FILE}`);
}

main().catch(console.error);
