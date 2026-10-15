export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const results = await prisma.invoiceResult.findMany({
      orderBy: { filename: 'asc' },
    });

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('Failed to fetch audit results:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Failed to fetch results' },
      { status: 500 }
    );
  }
}
