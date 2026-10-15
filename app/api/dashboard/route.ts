export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const results = await prisma.invoiceResult.findMany({
      orderBy: { filename: 'asc' },
    });

    const total = results.length;
    const approved = results.filter((r: any) => r.status === 'APPROVED').length;
    const flagged = results.filter((r: any) => r.status === 'FLAGGED_FOR_REVIEW').length;
    const totalDiscrepancy = results.reduce((sum: number, r: any) => {
      return sum + Math.abs(r.discrepancy ?? 0);
    }, 0);

    // Exception breakdown
    const exceptionCounts: Record<string, number> = {};
    results.forEach((r: any) => {
      try {
        const exceptions = JSON.parse(r.exceptions ?? '[]');
        (exceptions ?? []).forEach((e: any) => {
          const t = e?.type ?? 'UNKNOWN';
          exceptionCounts[t] = (exceptionCounts[t] ?? 0) + 1;
        });
      } catch {}
    });

    // By carrier
    const carrierStats: Record<string, { approved: number; flagged: number; total: number }> = {};
    results.forEach((r: any) => {
      const carrier = r.carrierName ?? 'Unknown';
      if (!carrierStats[carrier]) {
        carrierStats[carrier] = { approved: 0, flagged: 0, total: 0 };
      }
      const s = carrierStats[carrier]!;
      s.total++;
      if (r.status === 'APPROVED') s.approved++;
      else s.flagged++;
    });

    // KPI data
    const kpis = [
      {
        metric: 'total',
        label: 'Total Invoices',
        value: total,
        format: 'integer',
        delta: null,
        delta_label: null,
        spark: [],
        good_when: 'up',
      },
      {
        metric: 'approved',
        label: 'Approved',
        value: approved,
        format: 'integer',
        delta: total > 0 ? Math.round((approved / total) * 100) : 0,
        delta_label: '% of total',
        spark: [],
        good_when: 'up',
      },
      {
        metric: 'flagged',
        label: 'Flagged',
        value: flagged,
        format: 'integer',
        delta: total > 0 ? Math.round((flagged / total) * 100) : 0,
        delta_label: '% of total',
        spark: [],
        good_when: 'down',
      },
      {
        metric: 'discrepancy',
        label: 'Total Discrepancy',
        value: Math.round(totalDiscrepancy * 100) / 100,
        format: 'number',
        delta: null,
        delta_label: null,
        spark: [],
        good_when: 'down',
      },
    ];

    // Exception breakdown for bar chart
    const exceptionBreakdown = Object.entries(exceptionCounts).map(([type, count]: [string, number]) => ({
      exception_type: type.replace(/_/g, ' '),
      count,
    }));

    // Carrier breakdown for bar chart
    const carrierBreakdown = Object.entries(carrierStats).map(([carrier, stats]: [string, any]) => ({
      carrier,
      approved: stats?.approved ?? 0,
      flagged: stats?.flagged ?? 0,
    }));

    // Invoice table
    const invoiceTable = results.map((r: any) => {
      const exceptions = (() => {
        try { return JSON.parse(r.exceptions ?? '[]'); } catch { return []; }
      })();
      return {
        filename: r.filename ?? '',
        carrier: r.carrierName ?? 'Unknown',
        invoice_number: r.invoiceNumber ?? '-',
        load_ref: r.loadReference ?? '-',
        amount: r.totalAmount ?? 0,
        currency: r.currency ?? '-',
        expected: r.expectedAmount ?? 0,
        discrepancy: r.discrepancy ?? 0,
        status: r.status === 'APPROVED' ? 'Approved' : 'Flagged',
        exception_count: (exceptions ?? []).length,
      };
    });

    return NextResponse.json({
      data_as_of: new Date().toISOString(),
      data: {
        kpis,
        exception_breakdown: exceptionBreakdown,
        carrier_breakdown: carrierBreakdown,
        invoice_table: invoiceTable,
      },
    });
  } catch (err: any) {
    console.error('Dashboard API error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Failed to load dashboard' },
      { status: 500 }
    );
  }
}
