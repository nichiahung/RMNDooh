import { PlaylistItem } from '@/types/inventory';
import { mockCampaigns } from './mockCampaigns';
import { mockScreens } from './mockScreens';

// Helper to generate a playlist for a specific screen based on active mock campaigns
export const mockPlaylists: Record<string, PlaylistItem[]> = {};

// Let's seed SCR-1004 and SCR-1006 with the 'Game Expo' campaign (camp-104) 
// and add a generic filler item so we have a loop.

const getFutureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const getPastDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const defaultFillerItem: PlaylistItem = {
  id: 'pl-filler-01',
  campaignId: 'system-default',
  creativeId: 'sys-cr-01',
  creativeName: 'default_loop.mp4',
  creativeType: 'video/mp4',
  creativeUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1920',
  durationSeconds: 10,
  advertiserName: 'DOOH Platform',
  campaignName: 'Default Loop',
  startAt: getPastDate(30),
  endAt: getFutureDate(365),
  status: 'active'
};

mockScreens.forEach(screen => {
  mockPlaylists[screen.screenId] = [];
  
  // All screens get the default filler
  mockPlaylists[screen.screenId].push(defaultFillerItem);

  // If the screen is supposed to be playing camp-104 (SCR-1004 and SCR-1006)
  if (screen.currentCampaignId === 'camp-104') {
    const campaign = mockCampaigns.find(c => c.id === 'camp-104');
    if (campaign && campaign.creatives.length > 0) {
      mockPlaylists[screen.screenId].push({
        id: `pl-${campaign.id}-${screen.screenId}`,
        campaignId: campaign.id,
        creativeId: campaign.creatives[0].id,
        creativeName: campaign.creatives[0].name,
        creativeType: campaign.creatives[0].type,
        creativeUrl: campaign.creatives[0].previewUrl,
        durationSeconds: campaign.creatives[0].durationSeconds || 15,
        advertiserName: campaign.advertiserName,
        campaignName: campaign.name,
        startAt: campaign.startDate,
        endAt: campaign.endDate,
        status: 'active'
      });
    }
  }

  // If it's SCR-1001, let's give it an image campaign
  if (screen.screenId === 'SCR-1001') {
    const campaign = mockCampaigns.find(c => c.id === 'camp-102');
    if (campaign && campaign.creatives.length > 0) {
      mockPlaylists[screen.screenId].push({
        id: `pl-${campaign.id}-${screen.screenId}`,
        campaignId: campaign.id,
        creativeId: campaign.creatives[0].id,
        creativeName: campaign.creatives[0].name,
        creativeType: campaign.creatives[0].type,
        creativeUrl: campaign.creatives[0].previewUrl,
        durationSeconds: 10, // images default to 10s
        advertiserName: campaign.advertiserName,
        campaignName: campaign.name,
        startAt: campaign.startDate,
        endAt: campaign.endDate,
        status: 'active'
      });
    }
  }
});
