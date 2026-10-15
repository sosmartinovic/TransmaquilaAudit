'use client';

import { useState, useEffect } from 'react';
import { FileText, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const INVOICE_FILES = [
  'factura_01_delnorte_A-18442.pdf',
  'factura_02_riogrande_RG-7731.pdf',
  'factura_03_pena_0431.pdf',
  'factura_04_delnorte_A-18461.pdf',
  'factura_05_riogrande_RG-7744.pdf',
  'factura_06_pena_0438.pdf',
  'factura_07_delnorte_A-18477.pdf',
  'factura_08_delnorte_A-18477.pdf',
  'factura_09_riogrande_RG-7752.pdf',
  'factura_10_riogrande_RG-7889.pdf',
  'factura_11_pena_0444.pdf',
  'factura_12_delnorte_A-18502.pdf',
  'factura_13_pena_0449.pdf',
  'factura_14_delnorte_A-18516.pdf',
  'factura_15_riogrande_RG-7801.pdf',
  'factura_16_pena_0455.pdf',
  'factura_17_riogrande_RG-7812.pdf',
  'factura_18_pena_0461.pdf',
];

function getCarrierFromFilename(filename: string): string {
  if (filename?.includes('delnorte')) return 'Del Norte Logistics';
  if (filename?.includes('riogrande')) return 'Rio Grande Carriers';
  if (filename?.includes('pena')) return 'Pe\u00f1a Transportes';
  return 'Unknown';
}

function getCarrierColor(carrier: string): string {
  if (carrier?.includes('Norte')) return '#1e3a5f';
  if (carrier?.includes('Rio')) return '#22c55e';
  if (carrier?.includes('Pe\u00f1a')) return '#f97316';
  return '#6b7280';
}

export function InvoicesClient() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
          Invoice Library
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          18 pre-loaded freight invoices from three carriers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INVOICE_FILES.map((file, idx) => {
          const carrier = getCarrierFromFilename(file);
          const color = getCarrierColor(carrier);
          const invoiceId = file?.replace('factura_', '')?.replace('.pdf', '') ?? '';

          return (
            <div
              key={file}
              className="bg-card rounded-xl border border-border p-4 hover:translate-y-[-2px] transition-all cursor-pointer group"
              style={{ boxShadow: 'var(--shadow-sm)' }}
              onClick={() => setSelectedFile(file)}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <FileText className="w-5 h-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium text-foreground truncate">
                    {invoiceId}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color }}>
                    {carrier}
                  </p>
                </div>
                <a
                  href={`/facturas/${file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* PDF Viewer Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedFile(null)}>
          <div
            className="bg-card rounded-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
            style={{ boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-sm font-medium text-foreground">{selectedFile}</span>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-sm text-muted-foreground hover:text-foreground px-3 py-1 rounded-lg hover:bg-secondary transition-colors"
              >
                Close
              </button>
            </div>
            <iframe
              src={`/facturas/${selectedFile}`}
              className="flex-1 w-full"
              title={selectedFile}
            />
          </div>
        </div>
      )}
    </div>
  );
}
