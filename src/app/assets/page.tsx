'use client';
import { AuthGuard } from '@/components/AuthGuard';
import { AssetsPage } from '@/components/AssetsPage';

export default function AssetsRoute() {
  return (
    <AuthGuard>
      <AssetsPage />
    </AuthGuard>
  );
}
