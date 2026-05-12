import { ProofOfPlayLog, PlaylistItem, Screen } from '@/types/inventory';

export const generateProofOfPlayLogId = () => {
  return `pop-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const createProofOfPlayLog = (
  screen: Screen,
  item: PlaylistItem,
  index: number,
  playbackStatus: ProofOfPlayLog['playbackStatus'],
  deviceStatus: ProofOfPlayLog['deviceStatus']
): ProofOfPlayLog => {
  return {
    id: generateProofOfPlayLogId(),
    screenId: screen.screenId,
    screenName: screen.screenName,
    inventoryLocationId: screen.inventoryLocationId,
    campaignId: item.campaignId,
    campaignName: item.campaignName,
    creativeId: item.creativeId,
    creativeName: item.creativeName,
    creativeType: item.creativeType,
    advertiserName: item.advertiserName,
    playedAt: new Date().toISOString(),
    durationSeconds: item.durationSeconds,
    playbackStatus,
    deviceStatus,
    playlistItemIndex: index
  };
};

export const summarizeProofOfPlayLogs = (logs: ProofOfPlayLog[]) => {
  const totalPlays = logs.length;
  const completedPlays = logs.filter(l => l.playbackStatus === 'completed').length;
  const failedPlays = logs.filter(l => l.playbackStatus === 'failed').length;
  const totalPlaybackSeconds = logs
    .filter(l => l.playbackStatus === 'completed')
    .reduce((sum, l) => sum + l.durationSeconds, 0);
  
  const playsByCampaign: Record<string, number> = {};
  const playsByCreative: Record<string, number> = {};

  logs.forEach(l => {
    playsByCampaign[l.campaignName] = (playsByCampaign[l.campaignName] || 0) + 1;
    playsByCreative[l.creativeName] = (playsByCreative[l.creativeName] || 0) + 1;
  });

  return {
    totalPlays,
    completedPlays,
    failedPlays,
    totalPlaybackSeconds,
    playsByCampaign,
    playsByCreative
  };
};
