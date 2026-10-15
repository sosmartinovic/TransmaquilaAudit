export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getLoadRegister } from '@/lib/load-register';

export async function GET() {
  try {
    const records = getLoadRegister();
    return NextResponse.json({ records });
  } catch (err: any) {
    console.error('Failed to load register:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Failed to load register' },
      { status: 500 }
    );
  }
}
