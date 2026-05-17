'use client';
import dynamic from 'next/dynamic';
const ProposalReviewPage = dynamic(
  () => import('@/components/proposal/ProposalReviewPage').then(m => m.ProposalReviewPage),
  { ssr: false },
);
export default function Page() { return <ProposalReviewPage />; }
