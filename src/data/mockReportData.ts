import { CampaignReport, ProofOfPlayLog } from '@/types/inventory';

const getPastDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const getPastDateTime = (daysAgo: number, hourOffset: number = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hourOffset);
  return d.toISOString();
};

const mockLogsForTaipeiLaunch: ProofOfPlayLog[] = [
  {
    id: 'pop-1',
    screenId: 'SCR-1000',
    screenName: 'Taipei 101 Mall Entrance',
    inventoryLocationId: 'inv-001',
    campaignId: 'camp-rep-1',
    campaignName: 'Taipei Retail Launch',
    creativeId: 'cr-tpe-1',
    creativeName: 'tpe_launch_main.mp4',
    creativeType: 'video/mp4',
    advertiserName: 'Global Brands Inc',
    playedAt: getPastDateTime(0, 1),
    durationSeconds: 15,
    playbackStatus: 'completed',
    deviceStatus: 'online',
    playlistItemIndex: 0
  },
  {
    id: 'pop-2',
    screenId: 'SCR-1002',
    screenName: 'Zhongxiao Fuxing SOGO',
    inventoryLocationId: 'inv-003',
    campaignId: 'camp-rep-1',
    campaignName: 'Taipei Retail Launch',
    creativeId: 'cr-tpe-1',
    creativeName: 'tpe_launch_main.mp4',
    creativeType: 'video/mp4',
    advertiserName: 'Global Brands Inc',
    playedAt: getPastDateTime(0, 2),
    durationSeconds: 15,
    playbackStatus: 'completed',
    deviceStatus: 'online',
    playlistItemIndex: 1
  },
  {
    id: 'pop-3',
    screenId: 'SCR-1000',
    screenName: 'Taipei 101 Mall Entrance',
    inventoryLocationId: 'inv-001',
    campaignId: 'camp-rep-1',
    campaignName: 'Taipei Retail Launch',
    creativeId: 'cr-tpe-1',
    creativeName: 'tpe_launch_main.mp4',
    creativeType: 'video/mp4',
    advertiserName: 'Global Brands Inc',
    playedAt: getPastDateTime(0, 3),
    durationSeconds: 5,
    playbackStatus: 'failed',
    deviceStatus: 'online',
    playlistItemIndex: 0
  }
];

export const mockReportData: CampaignReport[] = [
  {
    campaignId: 'camp-rep-1',
    campaignName: 'Taipei Retail Launch',
    advertiserName: 'Global Brands Inc',
    status: 'live',
    startDate: getPastDate(7),
    endDate: getPastDate(-7),
    totalBudget: 450000,
    budgetSpent: 225000,
    estimatedImpressionsDelivered: 1250000,
    totalPlays: 15420,
    completedPlays: 15200,
    failedPlays: 220,
    dailyDelivery: [
      { date: getPastDate(6), plays: 2100, estimatedImpressions: 170000, budgetSpent: 30000 },
      { date: getPastDate(5), plays: 2150, estimatedImpressions: 175000, budgetSpent: 32000 },
      { date: getPastDate(4), plays: 2300, estimatedImpressions: 185000, budgetSpent: 34000 },
      { date: getPastDate(3), plays: 2400, estimatedImpressions: 195000, budgetSpent: 36000 },
      { date: getPastDate(2), plays: 2000, estimatedImpressions: 160000, budgetSpent: 28000 },
      { date: getPastDate(1), plays: 2200, estimatedImpressions: 178000, budgetSpent: 32000 },
      { date: getPastDate(0), plays: 2270, estimatedImpressions: 187000, budgetSpent: 33000 },
    ],
    locationDelivery: [
      { locationId: 'inv-001', locationName: 'Taipei 101', district: 'Xinyi', screenCount: 2, plays: 8000, estimatedImpressions: 700000, budgetSpent: 120000, status: 'on_track' },
      { locationId: 'inv-003', locationName: 'Zhongxiao Fuxing', district: 'Da\'an', screenCount: 1, plays: 7420, estimatedImpressions: 550000, budgetSpent: 105000, status: 'under_delivering' },
    ],
    creativeDelivery: [
      { creativeId: 'cr-tpe-1', creativeName: 'tpe_launch_main.mp4', creativeType: 'video/mp4', plays: 10000, completionRate: 0.98, estimatedImpressions: 800000, status: 'on_track' },
      { creativeId: 'cr-tpe-2', creativeName: 'tpe_launch_static.jpg', creativeType: 'image/jpeg', plays: 5420, completionRate: 1.0, estimatedImpressions: 450000, status: 'on_track' },
    ],
    recentPoPLogs: mockLogsForTaipeiLaunch
  },
  {
    campaignId: 'camp-rep-2',
    campaignName: 'Xinyi Weekend Awareness',
    advertiserName: 'Luxe Cosmetics',
    status: 'completed',
    startDate: getPastDate(14),
    endDate: getPastDate(1),
    totalBudget: 150000,
    budgetSpent: 150000,
    estimatedImpressionsDelivered: 850000,
    totalPlays: 9000,
    completedPlays: 8950,
    failedPlays: 50,
    dailyDelivery: [
      { date: getPastDate(3), plays: 3000, estimatedImpressions: 280000, budgetSpent: 50000 },
      { date: getPastDate(2), plays: 3100, estimatedImpressions: 290000, budgetSpent: 50000 },
      { date: getPastDate(1), plays: 2900, estimatedImpressions: 280000, budgetSpent: 50000 },
    ],
    locationDelivery: [
      { locationId: 'inv-001', locationName: 'Taipei 101', district: 'Xinyi', screenCount: 2, plays: 9000, estimatedImpressions: 850000, budgetSpent: 150000, status: 'completed' },
    ],
    creativeDelivery: [
      { creativeId: 'cr-xin-1', creativeName: 'luxe_weekend.mp4', creativeType: 'video/mp4', plays: 9000, completionRate: 0.99, estimatedImpressions: 850000, status: 'completed' },
    ],
    recentPoPLogs: []
  },
  {
    campaignId: 'camp-rep-3',
    campaignName: 'Airport Traveler Promotion',
    advertiserName: 'Global Bank',
    status: 'completed',
    startDate: getPastDate(5),
    endDate: getPastDate(-20),
    totalBudget: 300000,
    budgetSpent: 45000,
    estimatedImpressionsDelivered: 120000,
    totalPlays: 1500,
    completedPlays: 1200,
    failedPlays: 300,
    dailyDelivery: [
      { date: getPastDate(4), plays: 500, estimatedImpressions: 40000, budgetSpent: 15000 },
      { date: getPastDate(3), plays: 500, estimatedImpressions: 40000, budgetSpent: 15000 },
      { date: getPastDate(2), plays: 500, estimatedImpressions: 40000, budgetSpent: 15000 },
    ],
    locationDelivery: [
      { locationId: 'inv-006', locationName: 'Songshan Airport', district: 'Songshan', screenCount: 1, plays: 1500, estimatedImpressions: 120000, budgetSpent: 45000, status: 'completed' },
    ],
    creativeDelivery: [
      { creativeId: 'cr-air-1', creativeName: 'bank_travel.mp4', creativeType: 'video/mp4', plays: 1500, completionRate: 0.80, estimatedImpressions: 120000, status: 'completed' },
    ],
    recentPoPLogs: []
  }
];
