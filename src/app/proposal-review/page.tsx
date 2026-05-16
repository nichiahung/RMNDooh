'use client';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';

const ProposalReviewPage = dynamic(
  () => import('@/components/proposal/ProposalReviewPage').then(mod => mod.ProposalReviewPage),
  { ssr: false },
);

export default function ProposalReviewRoute() {
  return (
    <AuthGuard>
      <ProposalReviewPage />
    </AuthGuard>
  );
}
