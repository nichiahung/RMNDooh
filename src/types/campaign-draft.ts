// src/types/campaign-draft.ts

export type CampaignDraftStatus =
  | 'draft'
  | 'pending_creative_review'
  | 'blocked_by_creative'
  | 'ready_to_book'
  | 'cancelled';

export type CreativeRequirementStatus =
  | 'pending_upload'
  | 'uploaded'
  | 'approved'
  | 'rejected';

export type BookingStatus = 'confirmed' | 'cancelled';

export interface CampaignDraft {
  id: string;
  advertiserId: string;
  name: string;
  objective: string | null;
  startDate: string | null; // ISO date
  endDate: string | null;
  status: CampaignDraftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignInventoryItemRow {
  id: string;
  campaignId: string;
  inventoryLocationId: string;
  days: number;
  pricePerDaySnapshot: number;
}

export interface CampaignCreativeRequirement {
  id: string;
  campaignId: string;
  canonicalFormat: string; // CanonicalFormat from creative.ts
  status: CreativeRequirementStatus;
  mediaAssetId: string | null;
  rejectionReason: string | null;
}

export interface CampaignBooking {
  id: string;
  campaignId: string;
  confirmedAt: string;
  totalAmount: number;
  bookingStatus: BookingStatus;
}

export interface LaunchReadiness {
  ready: boolean;
  checks: {
    hasInventory: boolean;
    allCreativesApproved: boolean;
  };
}

export interface DerivedCreativeRequirement {
  format: string;          // CanonicalFormat
  label: string;
  dimensions: string;
  venueCount: number;
}
