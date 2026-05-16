import type {
  CampaignDraftProfile,
  CreativeAsset,
  CreativeAssetStatus,
  CreativeAssetVersion,
  Proposal,
  PriceBook,
  ProposalInventoryItem,
  CampaignReadinessResult,
} from '@/types/trading-models';
import {
  approveProposalVersion,
  checkCampaignLaunchReadinessAction,
  checkInventoryAvailability,
  compareCampaignLineItemFlight,
  confirmCampaignDraftBooking,
  confirmProposalBooking,
  createCampaignDraft,
  createPriceBook,
  createPriceBookItem,
  createProposal,
  createProposalVersion,
  estimatePricing,
  generateCampaignDraftCreativeRequirements,
  generateProposalCreativeRequirements,
  getAdminDashboardWorkQueues,
  getCampaignCreativeCoverage,
  getCampaignLaunchReadiness,
  getCampaignLaunchReadinessBlockers,
  getCreativeAssetCoverageMatrix,
  getCreativeLibraryAsset,
  getCreativeRequirementCoverage,
  getPriceBook,
  listAdminBookings,
  listAdminCampaignDrafts,
  listAdminCampaignDrafts as listCampaignDrafts,
  listAdminCreativeCoverage,
  listAdminCreativeLibrary,
  listAdminCreativeReview,
  listAdminLaunchReadiness,
  listAdminPricing,
  listAdminProposals,
  listCreativeReviewQueue,
  listPriceBookItems,
  listPriceBooks,
  recalculateCampaignDraftFlight,
  recalculateProposalFlight,
  rejectPricingApprovalRequest,
  replaceCreativeAsset,
  resetTradingIterationState,
  reviewCreativeAssetInQueue,
  selectCampaignDraftInventory,
  sendProposalToAdvertiser,
  submitCreativeAssetForReview,
  scheduleCampaignLaunch,
  updateCampaignDraft,
  validateCreativeLibraryAsset,
  assignAssetToRequirement,
  approvePricingApprovalRequest as approvePricingApprovalRequestAction,
  updatePriceBook,
  estimateCampaignDraftPrice as estimateCampaignDraftPriceAction,
  estimateProposalPrice as estimateProposalPriceAction,
  createPricingApprovalRequest as createPricingApprovalRequestAction,
  createPricingSnapshotAction as createPricingSnapshotActionAlias,
  createCreativeLibraryAsset as createCreativeLibraryAssetAction,
  listCreativeLibraryAssets as listCreativeLibraryAssetsAction,
  listCreativeAssetVersions as listCreativeAssetVersionsAction,
  listPricingApprovalRequests as listPricingApprovalRequestsAction,
} from '@/lib/tradingIterationActions';

export interface CreateCampaignDraftRequest {
  advertiserId: string;
  ownerUserId: string;
  name: string;
  buyingMethod?: CampaignDraftProfile['buyingMethod'];
  requestedStartDate: string;
  requestedEndDate: string;
  timezone?: string;
}

export interface CreateProposalRequest {
  advertiserId: string;
  ownerUserId: string;
  name: string;
  buyingMethod?: Proposal['buyingMethod'];
  requestedStartDate: string;
  requestedEndDate: string;
  timezone?: string;
}

export interface FlightInput {
  campaignStartDate: string;
  campaignEndDate: string;
  lineItems: Array<{
    lineItemStartDate: string;
    lineItemEndDate: string;
  }>;
}

export interface AvailabilityInput {
  inventoryId: string;
  startDate: string;
  endDate: string;
}

export interface CreativeLibraryCreateInput {
  advertiserId: string;
  brandId?: string | null;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSizeMb: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  durationSeconds?: number | null;
}

export interface CreativeLibraryReplaceInput {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSizeMb: number;
}

export interface CampaignDraftInventorySelectInput {
  inventoryLocationId: string;
  requestedStartDate?: string | null;
  requestedEndDate?: string | null;
  lineItemStartDate?: string | null;
  lineItemEndDate?: string | null;
  screenType?: string;
  pricePerDay?: number;
  estimatedDailyImpressions?: number;
  availabilityStatus?: string;
}

export interface ProposalVersionInput {
  proposalId: string;
  selectedInventory: ProposalInventoryItem[];
  requestedPriceBookId?: string;
  discountPercent?: number;
  manualAdjustment?: number;
}

export async function listPriceBooksApi() {
  return listPriceBooks();
}

export async function getPriceBookApi(id: string) {
  return getPriceBook(id);
}

export async function createPriceBookApi(input: Parameters<typeof createPriceBook>[0]) {
  return createPriceBook(input);
}

export async function updatePriceBookApi(id: string, patch: Partial<PriceBook>) {
  return updatePriceBook(id, patch);
}

export async function listPriceBookItemsApi() {
  return listPriceBookItems();
}

export async function createPriceBookItemApi(input: Parameters<typeof createPriceBookItem>[0]) {
  return createPriceBookItem(input);
}

export async function estimatePricingApi(payload: Parameters<typeof estimatePricing>[0]) {
  return estimatePricing(payload);
}

export async function createPricingSnapshotApi(payload: Parameters<typeof createPricingSnapshotActionAlias>[0]) {
  return createPricingSnapshotActionAlias(payload);
}

export async function listPricingApprovalRequestsApi() {
  return listPricingApprovalRequestsAction();
}

export async function createPricingApprovalRequestApi(payload: Parameters<typeof createPricingApprovalRequestAction>[0]) {
  return createPricingApprovalRequestAction(payload);
}

export async function approvePricingApprovalRequestApi(id: string, approvedByUserId: string) {
  return approvePricingApprovalRequestAction(id, approvedByUserId);
}

export async function rejectPricingApprovalRequestApi(id: string, reason: string) {
  return rejectPricingApprovalRequest(id, reason);
}

export async function checkInventoryAvailabilityApi(payload: {
  campaignStartDate: string;
  campaignEndDate: string;
  inventoryItems: AvailabilityInput[];
}) {
  return checkInventoryAvailability(payload);
}

export async function compareCampaignLineItemFlightApi(input: FlightInput) {
  return compareCampaignLineItemFlight(input);
}

export async function recalculateCampaignDraftFlightApi(campaignDraftId: string) {
  return recalculateCampaignDraftFlight(campaignDraftId);
}

export async function recalculateProposalFlightApi(proposalId: string) {
  return recalculateProposalFlight(proposalId);
}

export async function createCampaignDraftApi(input: CreateCampaignDraftRequest): Promise<CampaignDraftProfile> {
  return createCampaignDraft(input);
}

export async function patchCampaignDraftApi(campaignDraftId: string, patch: Partial<CampaignDraftProfile>) {
  return updateCampaignDraft(campaignDraftId, patch);
}

export async function selectCampaignDraftInventoryApi(
  campaignDraftId: string,
  items: CampaignDraftInventorySelectInput[],
) {
  return selectCampaignDraftInventory(campaignDraftId, items);
}

export async function generateCampaignDraftCreativeRequirementsApi(campaignDraftId: string) {
  return generateCampaignDraftCreativeRequirements(campaignDraftId);
}

export async function estimateCampaignDraftPriceApi(campaignDraftId: string) {
  return estimateCampaignDraftPriceAction(campaignDraftId);
}

export async function confirmCampaignDraftBookingApi(campaignDraftId: string) {
  return confirmCampaignDraftBooking(campaignDraftId);
}

export async function createProposalApi(input: CreateProposalRequest): Promise<Proposal> {
  return createProposal(input);
}

export async function createProposalVersionApi(payload: ProposalVersionInput) {
  return createProposalVersion(payload);
}

export async function generateProposalCreativeRequirementsApi(proposalId: string) {
  return generateProposalCreativeRequirements(proposalId);
}

export async function estimateProposalPriceApi(
  proposalId: string,
  options?: { discountPercent?: number; manualAdjustment?: number },
) {
  return estimateProposalPriceAction(proposalId, options);
}

export async function sendProposalToAdvertiserApi(proposalId: string) {
  return sendProposalToAdvertiser(proposalId);
}

export async function approveProposalVersionApi(proposalId: string) {
  return approveProposalVersion(proposalId);
}

export async function confirmProposalBookingApi(proposalId: string) {
  return confirmProposalBooking(proposalId);
}

export async function listCampaignDraftsApi() {
  return listCampaignDrafts();
}

export async function listCreativeLibraryAssetsApi(filter?: { status?: CreativeAssetStatus }) {
  return listCreativeLibraryAssetsAction(filter);
}

export async function createCreativeLibraryAssetApi(input: CreativeLibraryCreateInput): Promise<CreativeAsset> {
  return createCreativeLibraryAssetAction(input);
}

export async function getCreativeLibraryAssetApi(assetId: string) {
  return getCreativeLibraryAsset(assetId);
}

export async function listCreativeAssetVersionsApi(assetId: string): Promise<CreativeAssetVersion[]> {
  return listCreativeAssetVersionsAction(assetId);
}

export async function replaceCreativeAssetApi(assetId: string, payload: CreativeLibraryReplaceInput) {
  return replaceCreativeAsset(assetId, payload);
}

export async function validateCreativeLibraryAssetApi(assetId: string) {
  return validateCreativeLibraryAsset(assetId);
}

export async function submitCreativeLibraryAssetForReviewApi(assetId: string) {
  return submitCreativeAssetForReview(assetId);
}

export async function reviewCreativeLibraryAssetApi(
  assetId: string,
  decision: 'approved' | 'rejected',
  reason?: string,
  restrictions?: string,
) {
  return reviewCreativeAssetInQueue(assetId, decision, reason, restrictions);
}

export async function assignAssetToRequirementApi(assetId: string, requirementId: string) {
  return assignAssetToRequirement(assetId, requirementId);
}

export async function listCreativeReviewQueueApi() {
  return listCreativeReviewQueue();
}

export async function getCampaignCreativeCoverageApi(campaignId: string) {
  return getCampaignCreativeCoverage(campaignId);
}

export async function getCreativeRequirementCoverageApi(requirementId: string) {
  return getCreativeRequirementCoverage(requirementId);
}

export async function getCreativeAssetCoverageMatrixApi(campaignId: string) {
  return getCreativeAssetCoverageMatrix(campaignId);
}

export async function getCampaignLaunchReadinessApi(campaignId: string): Promise<CampaignReadinessResult> {
  return getCampaignLaunchReadiness(campaignId);
}

export async function checkCampaignLaunchReadinessApi(campaignId: string): Promise<CampaignReadinessResult> {
  return checkCampaignLaunchReadinessAction(campaignId);
}

export async function getCampaignLaunchReadinessBlockersApi(campaignId: string) {
  return getCampaignLaunchReadinessBlockers(campaignId);
}

export async function scheduleCampaignLaunchApi(campaignId: string) {
  return scheduleCampaignLaunch(campaignId);
}

export async function getAdminDashboardWorkQueuesApi() {
  return getAdminDashboardWorkQueues();
}

export async function listAdminProposalsApi() {
  return listAdminProposals();
}

export async function listAdminCampaignDraftsApi() {
  return listAdminCampaignDrafts();
}

export async function listAdminBookingsApi() {
  return listAdminBookings();
}

export async function listAdminCreativeLibraryApi() {
  return listAdminCreativeLibrary();
}

export async function listAdminCreativeReviewApi() {
  return listAdminCreativeReview();
}

export async function listAdminCreativeCoverageApi() {
  return listAdminCreativeCoverage();
}

export async function listAdminLaunchReadinessApi() {
  return listAdminLaunchReadiness();
}

export async function listAdminPricingApi() {
  return listAdminPricing();
}

export async function resetTradingIterationStateApi() {
  return resetTradingIterationState();
}
