'use client';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';

const ProposalBuilderPage = dynamic(
  () => import('@/components/proposal/ProposalBuilderPage').then(m => m.ProposalBuilderPage),
  { ssr: false },
);

export default function Page() {
  return (
    <AuthGuard requiredRole="sales">
      <ProposalBuilderPage />
    </AuthGuard>
  );
}
