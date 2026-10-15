import fs from 'fs';
import path from 'path';

export interface LoadRecord {
  load_id: string;
  ship_date: string;
  carrier: string;
  origin: string;
  destination: string;
  commodity: string;
  agreed_rate: number;
  currency: string;
}

let cachedRecords: LoadRecord[] | null = null;

export function getLoadRegister(): LoadRecord[] {
  if (cachedRecords) return cachedRecords;

  const csvPath = path.join(process.cwd(), 'data', 'registro_de_cargas.csv');
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.trim().split('\n');
  const headers = lines[0]?.split(',') ?? [];

  cachedRecords = lines.slice(1).map((line: string) => {
    const vals = parseCSVLine(line);
    return {
      load_id: vals[0]?.trim() ?? '',
      ship_date: vals[1]?.trim() ?? '',
      carrier: vals[2]?.trim() ?? '',
      origin: vals[3]?.trim() ?? '',
      destination: vals[4]?.trim() ?? '',
      commodity: vals[5]?.trim() ?? '',
      agreed_rate: parseFloat(vals[6] ?? '0'),
      currency: vals[7]?.trim()?.toUpperCase() ?? '',
    };
  });

  return cachedRecords;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function normalizeRef(ref: string): string {
  return (ref ?? '').replace(/[\s\-_]/g, '').toUpperCase();
}

export function findMatchingLoad(loadRef: string): LoadRecord | null {
  if (!loadRef) return null;
  const records = getLoadRegister();
  const normRef = normalizeRef(loadRef);
  
  // Exact match first
  const exact = records.find((r: LoadRecord) => normalizeRef(r.load_id) === normRef);
  if (exact) return exact;

  // Try partial match
  const partial = records.find((r: LoadRecord) => {
    const normId = normalizeRef(r.load_id);
    return normId.includes(normRef) || normRef.includes(normId);
  });
  return partial ?? null;
}
