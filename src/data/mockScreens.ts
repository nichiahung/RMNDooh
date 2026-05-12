import { Screen } from '@/types/inventory';
import { mockInventory } from '@/lib/mockData';

const getPastDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const mockScreens: Screen[] = mockInventory.map((inv, index) => {
  return {
    screenId: `SCR-${1000 + index}`,
    inventoryLocationId: inv.id,
    screenName: `${inv.name} - Display A`,
    status: index === 3 ? 'offline' : index === 7 ? 'maintenance' : 'online',
    lastHeartbeatAt: index === 3 ? getPastDate(1) : new Date().toISOString(),
    currentCampaignId: index === 4 || index === 6 ? 'camp-104' : undefined,
    resolution: ['Indoor', 'Kiosk'].includes(inv.screenType) ? '1080x1920' : '1920x1080',
    orientation: ['Indoor', 'Kiosk'].includes(inv.screenType) ? 'portrait' : 'landscape'
  };
});
