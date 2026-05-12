import { CampaignReport } from '@/types/inventory';

export const calculateDeliveryProgress = (delivered: number, booked: number): number => {
  if (booked === 0) return 0;
  return Math.min((delivered / booked) * 100, 100);
};

export const calculateAverageCPM = (budgetSpent: number, impressions: number): number => {
  if (impressions === 0) return 0;
  return (budgetSpent / impressions) * 1000;
};

// Filter mock data locally
export interface ReportFilters {
  campaignId: string;
  dateRange: string;
}

export const filterReportData = (reports: CampaignReport[], filters: ReportFilters): CampaignReport | null => {
  const campaign = reports.find(r => r.campaignId === filters.campaignId);
  if (!campaign) return null;
  
  // For v1, we just return the full mock campaign since we're not implementing 
  // deep date-range slicing on the mock arrays yet to keep it simple.
  return campaign;
};
