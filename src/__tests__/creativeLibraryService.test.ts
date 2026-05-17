import { describe, it, expect, beforeEach } from 'vitest';
import {
  seedCreativeLibraryState,
  clearCreativeLibraryState,
  createCreativeAsset,
  createReplacementVersion,
  validateCreativeAsset,
  submitAssetForReview,
  reviewCreativeAsset,
  assignAssetToRequirement,
  getAssetState,
  getAssetVersions,
} from '@/lib/services/creativeLibraryService';
import { generateCreativeRequirementsFromInventory } from '@/lib/services/creativeRequirementsService';

describe('creativeLibraryService', () => {
  beforeEach(() => {
    clearCreativeLibraryState();
    seedCreativeLibraryState({ assets: [], versions: [], assignments: [] });
  });

  it('creates an asset with version 1', () => {
    const asset = createCreativeAsset({
      advertiserId: 'adv-01', fileName: 'test.mp4', fileUrl: '/test.mp4',
      fileType: 'video/mp4', fileSizeMb: 5, width: 1920, height: 1080,
    });
    expect(asset.versionNumber).toBe(1);
    expect(asset.approvalStatus).toBe('uploaded');
    expect(getAssetVersions(asset.id)).toHaveLength(1);
  });

  it('validates asset sets status to valid', () => {
    const asset = createCreativeAsset({
      advertiserId: 'adv-01', fileName: 'test.mp4', fileUrl: '/test.mp4',
      fileType: 'video/mp4', fileSizeMb: 5,
    });
    const validated = validateCreativeAsset(asset.id);
    expect(validated.validationStatus).toBe('valid');
  });

  it('submits asset for review', () => {
    const asset = createCreativeAsset({
      advertiserId: 'adv-01', fileName: 'test.mp4', fileUrl: '/test.mp4',
      fileType: 'video/mp4', fileSizeMb: 5,
    });
    const submitted = submitAssetForReview(asset.id);
    expect(submitted.approvalStatus).toBe('pending_review');
  });

  it('approves asset and sets active', () => {
    const asset = createCreativeAsset({
      advertiserId: 'adv-01', fileName: 'test.mp4', fileUrl: '/test.mp4',
      fileType: 'video/mp4', fileSizeMb: 5,
    });
    submitAssetForReview(asset.id);
    const approved = reviewCreativeAsset(asset.id, 'approved');
    expect(approved.approvalStatus).toBe('approved');
    expect(approved.activeStatus).toBe('active');
  });

  it('replacement creates new version without removing active', () => {
    const asset = createCreativeAsset({
      advertiserId: 'adv-01', fileName: 'v1.mp4', fileUrl: '/v1.mp4',
      fileType: 'video/mp4', fileSizeMb: 5,
    });
    submitAssetForReview(asset.id);
    reviewCreativeAsset(asset.id, 'approved');

    const replacement = createReplacementVersion(asset.id, {
      fileName: 'v2.mp4', fileUrl: '/v2.mp4', fileType: 'video/mp4', fileSizeMb: 6,
    });
    expect(replacement.versionNumber).toBe(2);
    expect(replacement.approvalStatus).toBe('uploaded');

    // Old approved version still exists
    const allVersions = getAssetVersions(asset.id);
    expect(allVersions).toHaveLength(2);
    const v1 = allVersions.find(v => v.versionNumber === 1);
    expect(v1?.approvalStatus).toBe('approved');
  });

  it('rejected replacement leaves old approved active', () => {
    const asset = createCreativeAsset({
      advertiserId: 'adv-01', fileName: 'v1.mp4', fileUrl: '/v1.mp4',
      fileType: 'video/mp4', fileSizeMb: 5,
    });
    submitAssetForReview(asset.id);
    reviewCreativeAsset(asset.id, 'approved');

    createReplacementVersion(asset.id, {
      fileName: 'v2.mp4', fileUrl: '/v2.mp4', fileType: 'video/mp4', fileSizeMb: 6,
    });
    submitAssetForReview(asset.id);
    const rejected = reviewCreativeAsset(asset.id, 'rejected', 'policy violation');

    // Asset should still be active because v1 is still approved
    expect(rejected.activeStatus).toBe('active');
    const v1 = getAssetVersions(asset.id).find(v => v.versionNumber === 1);
    expect(v1?.approvalStatus).toBe('approved');
  });

  it('assigns asset to requirement with correct coverage status', () => {
    const asset = createCreativeAsset({
      advertiserId: 'adv-01', fileName: 'test.mp4', fileUrl: '/test.mp4',
      fileType: 'video/mp4', fileSizeMb: 5,
    });
    submitAssetForReview(asset.id);
    reviewCreativeAsset(asset.id, 'approved');

    const assignment = assignAssetToRequirement(asset.id, 'req-1');
    expect(assignment.coverageStatus).toBe('covered');
  });

  it('pending review asset has partial coverage when assigned', () => {
    const asset = createCreativeAsset({
      advertiserId: 'adv-01', fileName: 'test.mp4', fileUrl: '/test.mp4',
      fileType: 'video/mp4', fileSizeMb: 5,
    });
    submitAssetForReview(asset.id);

    const assignment = assignAssetToRequirement(asset.id, 'req-1');
    expect(assignment.coverageStatus).toBe('partial');
  });
});

describe('creativeRequirementsService', () => {
  it('groups same specs into single requirement', () => {
    const requirements = generateCreativeRequirementsFromInventory([
      { inventoryId: 'inv-1', screenType: 'Billboard', requestedByCampaignId: 'camp-1' },
      { inventoryId: 'inv-2', screenType: 'Transit', requestedByCampaignId: 'camp-1' },
      { inventoryId: 'inv-3', screenType: 'Kiosk', requestedByCampaignId: 'camp-1' },
    ]);
    // Billboard and Transit both map to landscape_16_9 → 1 requirement
    // Kiosk maps to portrait_9_16 → 1 requirement
    expect(requirements).toHaveLength(2);
    const landscape = requirements.find(r => r.canonicalFormat === 'landscape_16_9');
    expect(landscape?.venueCount).toBe(2);
  });

  it('returns missing status for generated requirements', () => {
    const requirements = generateCreativeRequirementsFromInventory([
      { inventoryId: 'inv-1', screenType: 'Billboard', requestedByCampaignId: 'camp-1' },
    ]);
    expect(requirements[0].status).toBe('missing');
  });
});
