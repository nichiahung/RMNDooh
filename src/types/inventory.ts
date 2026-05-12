export type CampaignObjective = 'Brand Awareness' | 'Foot Traffic' | 'Direct Response';
export type VenueType = 'Mall' | 'Subway' | 'Highway' | 'Street' | 'Airport' | 'Night Market' | 'Office Building' | 'Station';
export type ScreenType = 'Billboard' | 'Transit' | 'Street Furniture' | 'Indoor' | 'Kiosk' | 'Mega Screen';
export type AudienceTag = 'Professionals' | 'Students' | 'Shoppers' | 'Tourists' | 'Commuters' | 'Tech Workers' | 'Foodies';

export interface InventoryLocation {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  venueType: VenueType;
  screenType: ScreenType;
  dailyImpressions: number;
  cpm: number;
  pricePerDay: number;
  availability: number; // e.g., 0.0 to 1.0 representing percentage available
  audienceTags: AudienceTag[];
  imageUrl: string;
  description: string;
}

export interface MediaPlanItem {
  inventoryId: string;
  days: number;
}

export interface CampaignEstimate {
  selectedLocationCount: number;
  totalDailyImpressions: number;
  estimatedCampaignImpressions: number;
  totalCampaignBudget: number;
  averageCpm: number;
}

export interface FilterState {
  searchQuery?: string;
  city?: string;
  districts?: string[];
  venueTypes?: VenueType[];
  screenTypes?: ScreenType[];
  audienceTags?: AudienceTag[];
  campaignObjective?: CampaignObjective | string;
  minBudget?: number;
  maxBudget?: number;
  minImpressions?: number;
  maxImpressions?: number;
  availabilityStatus?: string[];
}
export type CreativeStatus = 'uploaded' | 'pending_review' | 'approved' | 'rejected';

export interface CreativeAsset {
  id: string;
  name: string;
  type: 'image/jpeg' | 'image/png' | 'video/mp4';
  fileSize: number; // in bytes
  durationSeconds?: number;
  previewUrl: string;
  status: CreativeStatus;
  uploadedAt: string;
}

export type CampaignStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'scheduled' | 'live' | 'completed';

export interface Campaign {
  id: string;
  name: string;
  advertiserName: string;
  status: CampaignStatus;
  objective: CampaignObjective | string;
  selectedItems: MediaPlanItem[];
  creatives: CreativeAsset[];
  estimatedImpressions: number;
  estimatedBudget: number;
  startDate: string;
  endDate: string;
  submittedAt: string;
  approvalNotes?: string;
}

export type ScreenStatus = 'online' | 'offline' | 'maintenance';

export interface Screen {
  screenId: string;
  inventoryLocationId: string;
  screenName: string;
  status: ScreenStatus;
  lastHeartbeatAt: string;
  currentCampaignId?: string;
  resolution: string;
  orientation: 'landscape' | 'portrait';
}

export interface PlaylistItem {
  id: string;
  campaignId: string;
  creativeId: string;
  creativeName: string;
  creativeType: 'image/jpeg' | 'image/png' | 'video/mp4';
  creativeUrl: string;
  durationSeconds: number;
  advertiserName: string;
  campaignName: string;
  startAt: string;
  endAt: string;
  status: 'active' | 'scheduled' | 'completed';
}

export interface ProofOfPlayLog {
  id: string;
  screenId: string;
  screenName: string;
  inventoryLocationId: string;
  campaignId: string;
  campaignName: string;
  creativeId: string;
  creativeName: string;
  creativeType: 'image/jpeg' | 'image/png' | 'video/mp4';
  advertiserName: string;
  playedAt: string;
  durationSeconds: number;
  playbackStatus: 'started' | 'completed' | 'skipped' | 'failed';
  deviceStatus: 'online' | 'offline' | 'unknown';
  playlistItemIndex: number;
}

export type DeliveryStatus = 'on_track' | 'under_delivering' | 'completed' | 'pending_review' | 'paused';

export interface DailyDeliveryData {
  date: string;
  plays: number;
  estimatedImpressions: number;
  budgetSpent: number;
}

export interface LocationDeliveryData {
  locationId: string;
  locationName: string;
  district: string;
  screenCount: number;
  plays: number;
  estimatedImpressions: number;
  budgetSpent: number;
  status: DeliveryStatus;
}

export interface CreativeDeliveryData {
  creativeId: string;
  creativeName: string;
  creativeType: string;
  plays: number;
  completionRate: number; // 0.0 to 1.0
  estimatedImpressions: number;
  status: DeliveryStatus;
}

export interface CampaignReport {
  campaignId: string;
  campaignName: string;
  advertiserName: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  totalBudget: number;
  budgetSpent: number;
  estimatedImpressionsDelivered: number;
  totalPlays: number;
  completedPlays: number;
  failedPlays: number;
  dailyDelivery: DailyDeliveryData[];
  locationDelivery: LocationDeliveryData[];
  creativeDelivery: CreativeDeliveryData[];
  recentPoPLogs: ProofOfPlayLog[];
}




