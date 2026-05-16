export type BuyingMethod = 'self_service' | 'sales_assisted' | 'programmatic';

export type BookingSource = 'proposal' | 'self_service' | 'manual_admin';

export type ProposalStatus =
  | 'draft'
  | 'sent_to_advertiser'
  | 'viewed_by_advertiser'
  | 'commented'
  | 'change_requested'
  | 'revised'
  | 'approved_by_advertiser'
  | 'expired'
  | 'cancelled';

export type CampaignDraftStatus =
  | 'draft'
  | 'in_progress'
  | 'submitted_for_review'
  | 'ready_to_confirm'
  | 'confirmed'
  | 'cancelled';

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

export type CreativeAssetStatus =
  | 'uploaded'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'pending_review'
  | 'approved'
  | 'approved_with_restrictions'
  | 'rejected'
  | 'revoked';

export type CreativeRequirementStatus =
  | 'missing'
  | 'partially_uploaded'
  | 'uploaded'
  | 'validating'
  | 'invalid'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export type CreativeUploadRequestStatus =
  | 'not_requested'
  | 'requested'
  | 'in_progress'
  | 'submitted'
  | 'completed'
  | 'overdue'
  | 'cancelled';

export type LaunchReadinessStatus =
  | 'not_ready'
  | 'partially_ready'
  | 'ready_for_confirmation'
  | 'ready_for_scheduling'
  | 'ready_for_launch'
  | 'blocked_by_creative'
  | 'blocked_by_inventory'
  | 'blocked_by_payment'
  | 'blocked_by_policy'
  | 'blocked_by_playlist'
  | 'blocked_by_schedule';

export type DateMatchStatus = 'full_match' | 'partial_match' | 'no_match' | 'custom_override';

export type PriceBookType =
  | 'self_service_msrp'
  | 'sales_rate_card'
  | 'vip_rate_card'
  | 'agency_rate_card'
  | 'seasonal_rate_card'
  | 'manual_override';

export type PriceVisibility =
  | 'public_self_service'
  | 'sales_only'
  | 'admin_only'
  | 'internal_only';

export type PricingApprovalStatus = 'not_required' | 'required' | 'pending' | 'approved' | 'rejected';

export type PriceBookItemBillingUnit = 'per_day' | 'per_week' | 'per_play' | 'per_impression' | 'package_fixed';

export type PricingRuleType =
  | 'duration_discount'
  | 'seasonal_surcharge'
  | 'weekend_rule'
  | 'package_discount'
  | 'agency_discount'
  | 'volume_discount'
  | 'minimum_booking_days';

export type SourceType = 'proposal' | 'campaign_draft' | 'booking';

export type RequirementCoverageStatus = 'missing' | 'partial' | 'covered';

export type AssetValidationStatus = 'not_validated' | 'valid' | 'invalid' | 'pending_validation';

export type AssetActiveStatus = 'active' | 'inactive' | 'archived';

export type PlaybackStatus = 'ready' | 'blocked';

export interface Proposal {
  id: string;
  advertiserId: string;
  ownerUserId: string;
  name: string;
  status: ProposalStatus;
  buyingMethod: BuyingMethod;
  requestedStartDate: string | null;
  requestedEndDate: string | null;
  requestedDays?: number | null;
  timezone: string | null;
  finalQuote: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDraftProfile {
  id: string;
  advertiserId: string;
  ownerUserId: string;
  name: string;
  status: CampaignDraftStatus;
  buyingMethod: BuyingMethod;
  requestedStartDate: string | null;
  requestedEndDate: string | null;
  requestedDays?: number | null;
  timezone: string | null;
  estimatedBudget: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceBook {
  id: string;
  name: string;
  code: string;
  priceBookType: PriceBookType;
  currency: string;
  visibility: PriceVisibility;
  status: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceBookItem {
  id: string;
  priceBookId: string;
  inventoryLocationId: string | null;
  screenId: string | null;
  screenGroupId: string | null;
  packageId: string | null;
  billingUnit: PriceBookItemBillingUnit;
  basePrice: number;
  minimumDays: number;
  estimatedCpm: number;
  status: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
}

export interface PricingRule {
  id: string;
  name: string;
  ruleType: PricingRuleType;
  appliesToPriceBookId: string | null;
  rulePayload: Record<string, unknown>;
  status: string;
}

export interface AdvertiserPriceAgreement {
  id: string;
  advertiserId: string;
  agencyId: string | null;
  priceBookId: string;
  agreementName: string;
  discountPercent: number | null;
  contractStartDate: string;
  contractEndDate: string | null;
  status: string;
  notes: string | null;
}

export interface PricingApprovalRequest {
  id: string;
  proposalId: string | null;
  proposalVersionId: string | null;
  campaignId: string | null;
  requestedByUserId: string;
  requestedPrice: number;
  floorPrice: number | null;
  discountPercent: number | null;
  reason: string;
  status: PricingApprovalStatus;
  approvedByUserId: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
}

export interface PricingSnapshot {
  id: string;
  sourceType: SourceType;
  sourceId: string;
  priceBookId: string;
  priceBookVersion: string | null;
  listPriceTotal: number;
  salesPriceTotal: number | null;
  vipPriceTotal: number | null;
  discountAmount: number;
  discountPercent: number;
  manualAdjustment: number;
  finalQuote: number;
  currency: string;
  tax: number;
  fees: number;
  estimatedCpm: number;
  pricingRuleResults: Record<string, unknown>;
  approvalStatus: PricingApprovalStatus;
  approvedBy: string | null;
  createdAt: string;
}

export interface ProposalInventoryItem {
  id: string;
  proposalId: string;
  inventoryLocationId: string | null;
  screenId: string | null;
  requestedStartDate: string | null;
  requestedEndDate: string | null;
  lineItemStartDate: string | null;
  lineItemEndDate: string | null;
  activeDays: number | null;
  dateMatchStatus: DateMatchStatus;
  availabilityStatus: string;
  priceForActiveDays: number;
  estimatedImpressionsForActiveDays: number;
  creativeDueAt: string | null;
  earliestPlaybackAt: string | null;
}

export interface CampaignInventoryItem {
  id: string;
  campaignId: string;
  inventoryLocationId: string | null;
  screenId: string | null;
  requestedStartDate: string | null;
  requestedEndDate: string | null;
  lineItemStartDate: string | null;
  lineItemEndDate: string | null;
  activeDays: number | null;
  dateMatchStatus: DateMatchStatus;
  availabilityStatus: string;
  priceForActiveDays: number;
  estimatedImpressionsForActiveDays: number;
  creativeDueAt: string | null;
  earliestPlaybackAt: string | null;
}

export interface CreativeAsset {
  id: string;
  advertiserId: string;
  brandId: string | null;
  originalAssetId: string | null;
  versionNumber: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  width: number | null;
  height: number | null;
  aspectRatio: string | null;
  durationSeconds: number | null;
  fileSizeMb: number;
  validationStatus: AssetValidationStatus;
  approvalStatus: CreativeAssetStatus;
  activeStatus: AssetActiveStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeAssetVersion {
  id: string;
  creativeAssetId: string;
  versionNumber: number;
  fileUrl: string;
  validationStatus: AssetValidationStatus;
  approvalStatus: CreativeAssetStatus;
  replacementForVersionId: string | null;
  effectiveStartAt: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
}

export interface CreativeRequirement {
  id: string;
  campaignId: string | null;
  proposalId: string | null;
  canonicalFormat: string;
  status: CreativeRequirementStatus;
  venueCount: number;
  requestedByCampaignId: string | null;
}

export interface CreativeRequirementAsset {
  id: string;
  creativeRequirementId: string;
  creativeAssetId: string;
  validationStatus: AssetValidationStatus;
  approvalStatus: CreativeAssetStatus;
  coverageStatus: RequirementCoverageStatus;
  effectiveStartAt: string | null;
  effectiveEndAt: string | null;
}

export interface CampaignReadinessLineItem {
  id: string;
  campaignId: string;
  campaignInventoryItemId: string;
  bookingConfirmed: boolean;
  inventoryReserved: boolean;
  flightValid: boolean;
  creativeRequirementsGenerated: boolean;
  requiredCreativesUploaded: boolean;
  requiredCreativesValid: boolean;
  requiredCreativesApproved: boolean;
  playlistAssigned: boolean;
  policyPassed: boolean;
  paymentCleared: boolean;
  canPlay: boolean;
  lineItemReadyStatus: LaunchReadinessStatus;
}

export interface CampaignReadinessBlockingReason {
  code: string;
  message: string;
}

export interface CampaignReadinessResult {
  campaignId: string;
  status: LaunchReadinessStatus;
  readyLineItemIds: string[];
  blockedLineItemIds: string[];
  blockers: CampaignReadinessBlockingReason[];
}

export interface CampaignFlight {
  requestedStartDate: string | null;
  requestedEndDate: string | null;
  requestedDays: number | null;
  timezone: string | null;
}

export interface LineItemFlight extends CampaignFlight {
  lineItemStartDate: string | null;
  lineItemEndDate: string | null;
  activeDays: number | null;
  dateMatchStatus: DateMatchStatus;
  availabilityStatus: string;
  priceForActiveDays: number;
  estimatedImpressionsForActiveDays: number;
  creativeDueAt: string | null;
  earliestPlaybackAt: string | null;
}
