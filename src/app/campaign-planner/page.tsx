'use client';
import { AuthGuard } from '@/components/AuthGuard';
import { CampaignPlannerPage } from '@/components/campaign-planner/CampaignPlannerPage';

export default function Page() {
  return (
    <AuthGuard>
      <CampaignPlannerPage />
    </AuthGuard>
  );
}
