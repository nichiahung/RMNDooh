'use client';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';

const ProposalBuilderPage = dynamic(
  () => import('@/components/proposal/ProposalBuilderPage').then(mod => mod.ProposalBuilderPage),
  { ssr: false },
);

export default function ProposalBuilderRoute() {
  return (
    <AuthGuard>
      <ProposalBuilderPage />
    </AuthGuard>
  );
}
