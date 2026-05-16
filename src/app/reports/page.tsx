'use client';
import { AuthGuard } from '@/components/AuthGuard';
import { AdvertiserReportsPage } from '@/components/reports/AdvertiserReportsPage';

export default function ReportsPage() {
  return (
    <AuthGuard>
      <AdvertiserReportsPage />
    </AuthGuard>
  );
}
