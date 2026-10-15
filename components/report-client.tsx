'use client';

import { AbacusDashboard, useDashboardData } from '@/components/viz/abacus-dashboard';
import { reportManifest } from '@/lib/report-manifest';

export function ReportClient() {
  const { data, dataAsOf, error } = useDashboardData('/api/dashboard', 30_000);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Failed to load report data. Run the audit first.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Loading report...</p>
      </div>
    );
  }

  return <AbacusDashboard manifest={reportManifest} data={data} dataAsOf={dataAsOf} className="min-h-screen" />;
}
