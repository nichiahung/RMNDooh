/**
 * Creative Library Service
 *
 * In-memory asset management with versioning, validation, review,
 * assignment, and replacement workflow.
 */

import type {
  CreativeAsset,
  CreativeAssetStatus,
  CreativeAssetVersion,
  CreativeRequirementAsset,
  AssetValidationStatus,
  AssetActiveStatus,
  RequirementCoverageStatus,
} from '@/types/trading-models';

let assets: CreativeAsset[] = [];
let versions: CreativeAssetVersion[] = [];
let assignments: CreativeRequirementAsset[] = [];

let nextSeq = 5000;
function nextId(prefix: string): string { nextSeq++; return `${prefix}-${nextSeq}`; }
function nowIso(): string { return new Date().toISOString(); }

// ─── State mgmt ──────────────────────────────────────────────

export function seedCreativeLibraryState(seed: { assets: CreativeAsset[]; versions: CreativeAssetVersion[]; assignments: CreativeRequirementAsset[] }): void {
  assets = seed.assets.map(a => ({ ...a }));
  versions = seed.versions.map(v => ({ ...v }));
  assignments = seed.assignments.map(a => ({ ...a }));
}

export function clearCreativeLibraryState(): void { assets = []; versions = []; assignments = []; }

// ─── Read ────────────────────────────────────────────────────

export function getAssetState(assetId: string): CreativeAsset | null { return assets.find(a => a.id === assetId) ?? null; }
export function getAssetVersions(assetId: string): CreativeAssetVersion[] { return versions.filter(v => v.creativeAssetId === assetId); }
export function listCreativeAssets(): CreativeAsset[] { return [...assets]; }
export function listCreativeRequirementAssets(): CreativeRequirementAsset[] { return [...assignments]; }

// ─── Create ──────────────────────────────────────────────────

export interface CreateCreativeAssetInput {
  advertiserId: string; brandId?: string | null; fileName: string; fileUrl: string;
  fileType: string; width?: number; height?: number; aspectRatio?: string;
  durationSeconds?: number | null; fileSizeMb: number;
}

export function createCreativeAsset(input: CreateCreativeAssetInput): CreativeAsset {
  const now = nowIso();
  const id = nextId('asset');
  const asset: CreativeAsset = {
    id, advertiserId: input.advertiserId, brandId: input.brandId ?? null,
    originalAssetId: null, versionNumber: 1, fileName: input.fileName,
    fileUrl: input.fileUrl, fileType: input.fileType,
    width: input.width ?? null, height: input.height ?? null,
    aspectRatio: input.aspectRatio ?? null, durationSeconds: input.durationSeconds ?? null,
    fileSizeMb: input.fileSizeMb,
    validationStatus: 'not_validated' as AssetValidationStatus,
    approvalStatus: 'uploaded' as CreativeAssetStatus,
    activeStatus: 'inactive' as AssetActiveStatus,
    createdAt: now, updatedAt: now,
  };
  assets.push(asset);
  versions.push({
    id: `${id}-v1`, creativeAssetId: id, versionNumber: 1, fileUrl: input.fileUrl,
    validationStatus: 'not_validated' as AssetValidationStatus,
    approvalStatus: 'uploaded' as CreativeAssetStatus,
    replacementForVersionId: null, effectiveStartAt: null, approvedAt: null, rejectedReason: null,
  });
  return { ...asset };
}

// ─── Replacement ─────────────────────────────────────────────

export function createReplacementVersion(assetId: string, replacement: { fileName: string; fileUrl: string; fileType: string; fileSizeMb: number }): CreativeAssetVersion {
  const asset = assets.find(a => a.id === assetId);
  if (!asset) throw new Error('asset_not_found');
  const currentVersions = versions.filter(v => v.creativeAssetId === assetId);
  const maxV = currentVersions.reduce((m, v) => Math.max(m, v.versionNumber), 0);
  const newV = maxV + 1;
  asset.versionNumber = newV; asset.fileName = replacement.fileName;
  asset.fileUrl = replacement.fileUrl; asset.fileType = replacement.fileType;
  asset.fileSizeMb = replacement.fileSizeMb; asset.updatedAt = nowIso();
  const prev = currentVersions.find(v => v.approvalStatus === 'approved');
  const version: CreativeAssetVersion = {
    id: `${assetId}-v${newV}`, creativeAssetId: assetId, versionNumber: newV,
    fileUrl: replacement.fileUrl,
    validationStatus: 'not_validated' as AssetValidationStatus,
    approvalStatus: 'uploaded' as CreativeAssetStatus,
    replacementForVersionId: prev?.id ?? null,
    effectiveStartAt: null, approvedAt: null, rejectedReason: null,
  };
  versions.push(version);
  return { ...version };
}

// ─── Validation ──────────────────────────────────────────────

export function validateCreativeAsset(assetId: string): CreativeAsset {
  const asset = assets.find(a => a.id === assetId);
  if (!asset) throw new Error('asset_not_found');
  asset.validationStatus = 'valid'; asset.updatedAt = nowIso();
  const latest = versions.filter(v => v.creativeAssetId === assetId).sort((a, b) => b.versionNumber - a.versionNumber)[0];
  if (latest) latest.validationStatus = 'valid';
  return { ...asset };
}

// ─── Review ──────────────────────────────────────────────────

export function submitAssetForReview(assetId: string): CreativeAsset {
  const asset = assets.find(a => a.id === assetId);
  if (!asset) throw new Error('asset_not_found');
  asset.approvalStatus = 'pending_review'; asset.updatedAt = nowIso();
  const latest = versions.filter(v => v.creativeAssetId === assetId).sort((a, b) => b.versionNumber - a.versionNumber)[0];
  if (latest) latest.approvalStatus = 'pending_review';
  return { ...asset };
}

export function reviewCreativeAsset(assetId: string, decision: 'approved' | 'rejected', reason?: string, restrictions?: string): CreativeAsset {
  const asset = assets.find(a => a.id === assetId);
  if (!asset) throw new Error('asset_not_found');
  const latest = versions.filter(v => v.creativeAssetId === assetId).sort((a, b) => b.versionNumber - a.versionNumber)[0];

  if (decision === 'approved') {
    const status: CreativeAssetStatus = restrictions ? 'approved_with_restrictions' : 'approved';
    asset.approvalStatus = status; asset.activeStatus = 'active'; asset.updatedAt = nowIso();
    if (latest) { latest.approvalStatus = status; latest.approvedAt = nowIso(); latest.rejectedReason = null; }
    // Revoke older approved versions
    versions.filter(v => v.creativeAssetId === assetId && v.id !== latest?.id && v.approvalStatus === 'approved')
      .forEach(v => { v.approvalStatus = 'revoked' as CreativeAssetStatus; });
  } else {
    asset.approvalStatus = 'rejected'; asset.updatedAt = nowIso();
    const hasOlder = versions.some(v => v.creativeAssetId === assetId && v.id !== latest?.id && v.approvalStatus === 'approved');
    asset.activeStatus = hasOlder ? 'active' : 'inactive';
    if (latest) { latest.approvalStatus = 'rejected'; latest.rejectedReason = reason ?? null; latest.approvedAt = null; }
  }
  return { ...asset };
}

// ─── Assignment ──────────────────────────────────────────────

export function assignAssetToRequirement(assetId: string, requirementId: string): CreativeRequirementAsset {
  const asset = assets.find(a => a.id === assetId);
  if (!asset) throw new Error('asset_not_found');
  let coverageStatus: RequirementCoverageStatus = 'missing';
  if (asset.approvalStatus === 'approved' || asset.approvalStatus === 'approved_with_restrictions') coverageStatus = 'covered';
  else if (asset.approvalStatus === 'pending_review' || asset.approvalStatus === 'uploaded') coverageStatus = 'partial';
  const assignment: CreativeRequirementAsset = {
    id: nextId('cra'), creativeRequirementId: requirementId, creativeAssetId: assetId,
    validationStatus: asset.validationStatus, approvalStatus: asset.approvalStatus,
    coverageStatus, effectiveStartAt: asset.activeStatus === 'active' ? nowIso() : null, effectiveEndAt: null,
  };
  assignments.push(assignment);
  return { ...assignment };
}

export function scheduleApprovedReplacement(assetId: string, effectiveStartAt: string): CreativeAssetVersion | null {
  const latest = versions.filter(v => v.creativeAssetId === assetId).sort((a, b) => b.versionNumber - a.versionNumber)[0];
  if (!latest || (latest.approvalStatus !== 'approved' && latest.approvalStatus !== 'approved_with_restrictions')) return null;
  latest.effectiveStartAt = effectiveStartAt;
  return { ...latest };
}
