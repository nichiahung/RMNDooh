// src/types/campaign-draft.ts
import type { CanonicalFormat } from './creative';

export type CampaignDraftStatus =
  | 'draft'
  | 'in_progress'
  | 'submitted_for_review'
  | 'pending_review'
  | 'ready_to_confirm'
  | 'confirmed'
  | 'pending_creative_review'
  | 'blocked_by_creative'
  | 'ready_to_book'
  | 'cancelled';

export type CreativeRequirementStatus =
  | 'pending_upload'
  | 'partially_uploaded'
  | 'uploaded'
  | 'validating'
  | 'invalid'
  | 'approved'
  | 'pending_review'
  | 'rejected';

export type BookingStatus =
  | 'not_confirmed'
  | 'pending_sales_confirmation'
  | 'pending_advertiser_confirmation'
  | 'confirmed'
  | 'inventory_reserved'
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'cancelled'
  | 'blocked';

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
  canonicalFormat: CanonicalFormat;
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

export interface CampaignSubmission {
  campaignId: string;
  bookingStatus: 'pending_confirmation';
  submittedAt: string;
}

export interface LaunchReadiness {
  ready: boolean;
  checks: {
    hasInventory: boolean;
    allCreativesApproved: boolean;
    noPendingReview: boolean;
  };
}

export interface DerivedCreativeRequirement {
  format: CanonicalFormat;
  label: string;
  dimensions: string;
  venueCount: number;
}
