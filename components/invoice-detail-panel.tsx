'use client';

import { X, FileText, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatusBadge } from './dashboard-client';

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

interface Exception {
  type: string;
  message: string;
  severity: string;
}

export function InvoiceDetailPanel({
  invoice,
  onClose,
}: {
  invoice: InvoiceResult;
  onClose: () => void;
}) {
  const exceptions: Exception[] = (() => {
    try {
      return JSON.parse(invoice?.exceptions ?? '[]') ?? [];
    } catch {
      return [];
    }
  })();

  const isApproved = invoice?.status === 'APPROVED';

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border z-50 overflow-y-auto"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <div>
              <h2 className="font-display font-semibold text-foreground">
                {invoice?.invoiceNumber ?? 'Unknown Invoice'}
              </h2>
              <p className="text-xs text-muted-foreground font-mono">{invoice?.filename}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge status={invoice?.status ?? ''} />
            <a
              href={`/facturas/${invoice?.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-foreground"
            >
              <ExternalLink className="w-3 h-3" />
              View PDF
            </a>
          </div>

          {/* Extracted Fields */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Extracted Fields
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Carrier" value={invoice?.carrierName} />
              <Field label="Invoice #" value={invoice?.invoiceNumber} />
              <Field label="Load Reference" value={invoice?.loadReference} mono />
              <Field label="Invoice Date" value={invoice?.invoiceDate} />
              <Field
                label="Invoiced Amount"
                value={
                  invoice?.totalAmount != null
                    ? `${invoice.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${invoice?.currency ?? ''}`
                    : null
                }
                mono
              />
              <Field label="Currency" value={invoice?.currency} />
            </div>
          </div>

          {/* Matched Load */}
          {invoice?.matchedLoadId && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Matched Load
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Load ID" value={invoice?.matchedLoadId} mono />
                <Field
                  label="Agreed Rate"
                  value={
                    invoice?.expectedAmount != null
                      ? `${invoice.expectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${invoice?.expectedCurrency ?? ''}`
                      : null
                  }
                  mono
                />
                <Field label="Origin" value={invoice?.matchedOrigin} />
                <Field label="Destination" value={invoice?.matchedDest} />
                <Field label="Commodity" value={invoice?.matchedCommodity} />
                {invoice?.discrepancy != null && Math.abs(invoice.discrepancy) > 0.01 && (
                  <Field
                    label="Discrepancy"
                    value={`${invoice.discrepancy > 0 ? '+' : ''}${invoice.discrepancy.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    highlight
                  />
                )}
              </div>
            </div>
          )}

          {/* Exceptions */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Exceptions ({exceptions.length})
            </h3>
            {exceptions.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" />
                All checks passed — invoice approved.
              </div>
            ) : (
              <div className="space-y-2">
                {exceptions.map((exc: Exception, idx: number) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                      exc?.severity === 'error'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-orange-50 text-orange-800'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-mono font-semibold text-xs">{exc?.type ?? 'UNKNOWN'}</span>
                      <p className="mt-0.5">{exc?.message ?? ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confidence Notes */}
          {invoice?.confidenceNotes && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                AI Confidence Notes
              </h3>
              <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
                {invoice.confidenceNotes}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function Field({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="bg-secondary/40 rounded-lg p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p
        className={`text-sm font-medium mt-0.5 ${
          mono ? 'font-mono' : ''
        } ${highlight ? 'text-red-600' : 'text-foreground'}`}
      >
        {value ?? '—'}
      </p>
    </div>
  );
}
