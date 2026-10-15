export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const results = await prisma.invoiceResult.findMany({
      orderBy: { filename: 'asc' },
    });

    const headers = [
      'Filename',
      'Carrier',
      'Invoice Number',
      'Load Reference',
      'Invoice Date',
      'Invoiced Amount',
      'Currency',
      'Expected Amount',
      'Expected Currency',
      'Discrepancy',
      'Status',
      'Exceptions',
      'Matched Load ID',
      'Origin',
      'Destination',
    ];

    const rows = results.map((r: any) => {
      const exceptions = (() => {
        try {
          return JSON.parse(r.exceptions ?? '[]');
        } catch {
          return [];
        }
      })();
      const exceptionTypes = exceptions.map((e: any) => e?.type ?? '').join('; ');

      return [
        r.filename ?? '',
        r.carrierName ?? '',
        r.invoiceNumber ?? '',
        r.loadReference ?? '',
        r.invoiceDate ?? '',
        r.totalAmount?.toFixed(2) ?? '',
        r.currency ?? '',
        r.expectedAmount?.toFixed(2) ?? '',
        r.expectedCurrency ?? '',
        r.discrepancy?.toFixed(2) ?? '',
        r.status ?? '',
        exceptionTypes,
        r.matchedLoadId ?? '',
        r.matchedOrigin ?? '',
        r.matchedDest ?? '',
      ]
        .map((v: string) => `"${v.replace(/"/g, '""')}"`)
        .join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="exceptions_report.csv"',
      },
    });
  } catch (err: any) {
    console.error('Export CSV error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Export failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
