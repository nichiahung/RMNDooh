'use client';
import dynamic from 'next/dynamic';
const ProposalBuilderPage = dynamic(
  () => import('@/components/proposal/ProposalBuilderPage').then(m => m.ProposalBuilderPage),
  { ssr: false },
);
export default function Page() { return <ProposalBuilderPage />; }
