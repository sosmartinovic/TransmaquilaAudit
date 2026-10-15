'use client';

import { useState, useEffect } from 'react';
import { Database, Search, RefreshCw } from 'lucide-react';

interface LoadRecord {
  load_id: string;
  ship_date: string;
  carrier: string;
  origin: string;
  destination: string;
  commodity: string;
  agreed_rate: number;
  currency: string;
}

export function LoadRegisterClient() {
  const [records, setRecords] = useState<LoadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/load-register')
      .then((res) => res.json())
      .then((data) => setRecords(data?.records ?? []))
      .catch((err) => console.error('Failed to load register:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.load_id ?? '').toLowerCase().includes(q) ||
      (r.carrier ?? '').toLowerCase().includes(q) ||
      (r.origin ?? '').toLowerCase().includes(q) ||
      (r.destination ?? '').toLowerCase().includes(q) ||
      (r.commodity ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
          Load Register
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Source of truth for agreed rates and load details ({records.length} loads)
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground text-sm mt-4">Loading register...</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border" style={{ boxShadow: 'var(--shadow-md)' }}>
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search loads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-secondary border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Load ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ship Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Carrier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Origin</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commodity</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rate</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Currency</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr
                    key={r.load_id}
                    className={`border-b border-border/50 ${idx % 2 === 0 ? '' : 'bg-secondary/20'}`}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-foreground">{r.load_id}</td>
                    <td className="px-4 py-3 text-foreground">{r.ship_date}</td>
                    <td className="px-4 py-3 text-foreground">{r.carrier}</td>
                    <td className="px-4 py-3 text-foreground">{r.origin}</td>
                    <td className="px-4 py-3 text-foreground">{r.destination}</td>
                    <td className="px-4 py-3 text-foreground">{r.commodity}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">
                      {r.agreed_rate?.toLocaleString?.('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.currency === 'USD' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {r.currency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No loads match the search.</div>
          )}
        </div>
      )}
    </div>
  );
}
