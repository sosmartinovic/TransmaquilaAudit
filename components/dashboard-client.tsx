'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, RefreshCw, Download, FileText, CheckCircle, AlertTriangle, DollarSign, Search, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InvoiceDetailPanel } from './invoice-detail-panel';
import { motion, AnimatePresence } from 'framer-motion';

interface InvoiceResult {
  id: string;
  filename: string;
  carrierName: string | null;
  invoiceNumber: string | null;
  loadReference: string | null;
  invoiceDate: string | null;
  totalAmount: number | null;
  currency: string | null;
  confidenceNotes: string | null;
  status: string;
  exceptions: string | null;
  expectedAmount: number | null;
  expectedCurrency: string | null;
  discrepancy: number | null;
  matchedLoadId: string | null;
  matchedOrigin: string | null;
  matchedDest: string | null;
  matchedCommodity: string | null;
  processedAt: string | null;
}

interface ProgressEvent {
  status: string;
  message?: string;
  index?: number;
  total?: number;
  filename?: string;
  auditStatus?: string;
}

export function DashboardClient() {
  const [results, setResults] = useState<InvoiceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [currentStep, setCurrentStep] = useState<ProgressEvent | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-results');
      const data = await res.json();
      setResults(data?.results ?? []);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const runAudit = async (force: boolean = false) => {
    setProcessing(true);
    setProgress([]);
    setCurrentStep(null);

    try {
      const res = await fetch('/api/process-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              setCurrentStep(event);
              setProgress((prev) => [...prev, event]);
            } catch {}
          }
        }
      }

      await fetchResults();
    } catch (err: any) {
      console.error('Audit failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  const exportCSV = () => {
    window.open('/api/export-csv', '_blank');
  };

  // Computed stats
  const totalInvoices = results.length;
  const approvedCount = results.filter((r) => r.status === 'APPROVED').length;
  const flaggedCount = results.filter((r) => r.status === 'FLAGGED_FOR_REVIEW').length;
  const totalDiscrepancy = results.reduce((sum, r) => sum + Math.abs(r.discrepancy ?? 0), 0);
  const hasResults = totalInvoices > 0;

  // Filters
  const carriers = [...new Set(results.map((r) => r.carrierName).filter(Boolean))];
  const filteredResults = results.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (carrierFilter !== 'all' && r.carrierName !== carrierFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (r.filename ?? '').toLowerCase().includes(q) ||
        (r.invoiceNumber ?? '').toLowerCase().includes(q) ||
        (r.loadReference ?? '').toLowerCase().includes(q) ||
        (r.carrierName ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Progress info
  const progressTotal = currentStep?.total ?? 18;
  const progressIndex = (currentStep?.index ?? -1) + 1;
  const progressPct = progressTotal > 0 ? Math.round((progressIndex / progressTotal) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            Invoice Audit Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered freight invoice verification for cross-border shipments
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasResults && (
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-card text-foreground border border-border hover:bg-secondary transition-colors"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
          <button
            onClick={() => runAudit(false)}
            disabled={processing}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all',
              processing
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:opacity-90'
            )}
            style={{ backgroundColor: '#1e3a5f', boxShadow: 'var(--shadow-md)' }}
          >
            {processing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {processing ? 'Processing...' : hasResults ? 'Re-run Audit' : 'Run Full Audit'}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="bg-card rounded-xl p-5 border border-border" style={{ boxShadow: 'var(--shadow-md)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Processing Invoices</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {progressIndex} / {progressTotal}
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%`, backgroundColor: '#1e3a5f' }}
                />
              </div>
              {currentStep?.message && (
                <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
                  {currentStep.message}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      {hasResults && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            icon={FileText}
            label="Total Invoices"
            value={totalInvoices}
            color="#1e3a5f"
          />
          <KPICard
            icon={CheckCircle}
            label="Approved"
            value={approvedCount}
            subtitle={totalInvoices > 0 ? `${Math.round((approvedCount / totalInvoices) * 100)}%` : undefined}
            color="#22c55e"
          />
          <KPICard
            icon={AlertTriangle}
            label="Flagged"
            value={flaggedCount}
            subtitle={totalInvoices > 0 ? `${Math.round((flaggedCount / totalInvoices) * 100)}%` : undefined}
            color="#f97316"
          />
          <KPICard
            icon={DollarSign}
            label="Total Discrepancy"
            value={formatAmount(totalDiscrepancy)}
            color="#ef4444"
          />
        </div>
      )}

      {/* Empty state */}
      {!hasResults && !processing && !loading && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#1e3a5f15' }}>
            <FileText className="w-10 h-10" style={{ color: '#1e3a5f' }} />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">
            Ready to Audit
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            18 pre-loaded invoices from Del Norte Logistics, Rio Grande Carriers, and Peña Transportes are ready for AI-powered extraction and verification.
          </p>
          <button
            onClick={() => runAudit(false)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-all"
            style={{ backgroundColor: '#1e3a5f', boxShadow: 'var(--shadow-md)' }}
          >
            <Play className="w-5 h-5" />
            Run Full Audit
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground text-sm mt-4">Loading audit results...</p>
        </div>
      )}

      {/* Results Table */}
      {hasResults && (
        <div className="bg-card rounded-xl border border-border" style={{ boxShadow: 'var(--shadow-md)' }}>
          {/* Filters */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-secondary border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg bg-secondary border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none text-foreground cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="FLAGGED_FOR_REVIEW">Flagged</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={carrierFilter}
                onChange={(e) => setCarrierFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg bg-secondary border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none text-foreground cursor-pointer"
              >
                <option value="all">All Carriers</option>
                {carriers.map((c) => (
                  <option key={c ?? ''} value={c ?? ''}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Carrier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Load Ref</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoiced</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Diff</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((r, idx) => {
                  const exceptions = parseExceptions(r.exceptions);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedInvoice(r)}
                      className={cn(
                        'border-b border-border/50 cursor-pointer transition-colors hover:bg-secondary/50',
                        idx % 2 === 0 ? 'bg-transparent' : 'bg-secondary/20'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{r.invoiceNumber ?? '-'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.filename}</div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{r.carrierName ?? '-'}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{r.loadReference ?? '-'}</td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {r.totalAmount != null ? `${formatAmount(r.totalAmount)} ${r.currency ?? ''}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {r.expectedAmount != null ? `${formatAmount(r.expectedAmount)} ${r.expectedCurrency ?? ''}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {r.discrepancy != null && Math.abs(r.discrepancy) > 0.01 ? (
                          <span className={r.discrepancy > 0 ? 'text-red-500' : 'text-red-500'}>
                            {r.discrepancy > 0 ? '+' : ''}{formatAmount(r.discrepancy)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredResults.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No invoices match the current filters.
            </div>
          )}
        </div>
      )}

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceDetailPanel
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
}) {
  return (
    <div
      className="bg-card rounded-xl p-5 border border-border transition-all hover:translate-y-[-1px]"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-display font-bold tracking-tight text-foreground">
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const isApproved = status === 'APPROVED';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        isApproved
          ? 'bg-green-50 text-green-700'
          : 'bg-orange-50 text-orange-700'
      )}
    >
      {isApproved ? (
        <CheckCircle className="w-3 h-3" />
      ) : (
        <AlertTriangle className="w-3 h-3" />
      )}
      {isApproved ? 'Approved' : 'Flagged'}
    </span>
  );
}

function formatAmount(n: number): string {
  return n?.toLocaleString?.('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00';
}

function parseExceptions(json: string | null): any[] {
  try {
    return JSON.parse(json ?? '[]') ?? [];
  } catch {
    return [];
  }
}
