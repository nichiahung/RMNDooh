'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Calculator, Eye, TrendingUp, MapPin, X, Calendar, ChevronRight, ImageIcon, CheckCircle2, Loader2, AlertTriangle, Save } from 'lucide-react';
import { MediaPlanItem, InventoryLocation, CreativeAsset } from '@/types/inventory';
import { deriveGroupedRequirements, FORMAT_SPECS } from '@/utils/creativeRequirements';
import { formatCurrency, formatCPM } from '@/utils/formatters';
import { useI18n } from '@/i18n/I18nProvider';
import { CanonicalFormat, FormatSpec } from '@/types/creative';
import { ensureCreativeRequirements, unlinkAssetFromRequirement, saveDraftCampaign, getStoredCreativeRequirements } from '@/lib/api/campaign-draft';
import { flightDays, addDays } from '@/utils/dates';
import { CreativeUploadModal } from './CreativeUploadModal';

interface Props {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
  onRemove: (id: string) => void;
  onUpdateDays: (id: string, days: number) => void;
  onContinue?: () => void;
  onAllUploaded?: () => void;
  isOpen: boolean;
  onClose: () => void;
  isSaving?: boolean;
  campaignId: string | null;
  storedRequirements: Array<{ id: string; canonicalFormat: string; status?: string }> | null;
  onStoredRequirementsChange: (reqs: Array<{ id: string; canonicalFormat: string; status?: string }>) => void;
  onCreativeUploaded: (asset: CreativeAsset, format: CanonicalFormat) => void;
  flightStart: string | null;
  flightEnd: string | null;
  onFlightDateChange: (start: string | null, end: string | null) => void;
  campaignStatus: string;
}

type ActiveModal = {
  spec: FormatSpec;
  venueCount: number;
  requirementId: string;
};

export function MediaPlanSummary({
  selectedItems,
  allInventory,
  onRemove,
  onUpdateDays,
  onContinue,
  onAllUploaded,
  isOpen,
  onClose,
  isSaving,
  campaignId,
  storedRequirements,
  onStoredRequirementsChange,
  onCreativeUploaded,
  flightStart,
  flightEnd,
  onFlightDateChange,
  campaignStatus,
}: Props) {
  const { t } = useI18n();
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [uploadedFormats, setUploadedFormats] = useState<Set<CanonicalFormat>>(new Set());

  // Seed uploadedFormats from stored requirements (handles resume + draft reload)
  useEffect(() => {
    if (!storedRequirements) return;
    const seeded = new Set<CanonicalFormat>(
      storedRequirements
        .filter(r => r.status === 'uploaded' || r.status === 'approved')
        .map(r => r.canonicalFormat as CanonicalFormat)
    );
    setUploadedFormats(seeded);
  }, [storedRequirements]);
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const handleSaveDraft = async () => {
    if (!campaignId || isSavingDraft) return;
    setIsSavingDraft(true);
    try {
      await saveDraftCampaign(campaignId, {});
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch (err) {
      console.error('Save draft failed:', err);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Compute totals
  let exactTotalImpressions = 0;
  let exactTotalBudget = 0;

  const selectedDetails = selectedItems.map(item => {
    const inv = allInventory.find(i => i.id === item.inventoryId);
    return { ...item, inventory: inv };
  }).filter(item => item.inventory !== undefined);

  selectedDetails.forEach(({ days, inventory }) => {
    if (!inventory) return;
    exactTotalImpressions += inventory.dailyImpressions * days;
    exactTotalBudget += inventory.pricePerDay * days;
  });

  const exactAvgCpm = exactTotalImpressions > 0
    ? (exactTotalBudget / exactTotalImpressions) * 1000
    : 0;

  const groups = deriveGroupedRequirements(selectedItems, allInventory);
  const allFormatsUploaded = groups.length > 0 && groups.every(g => uploadedFormats.has(g.format));

  const handleFormatClick = useCallback(async (format: CanonicalFormat, venueCount: number) => {
    if (!campaignId) return;
    const spec = FORMAT_SPECS.find(s => s.format === format);
    if (!spec) return;

    let reqs = storedRequirements;

    if (!reqs) {
      setIsEnsuring(true);
      try {
        const created = await ensureCreativeRequirements(campaignId, selectedItems, allInventory);
        reqs = created.map(r => ({ id: r.id, canonicalFormat: r.canonicalFormat, status: r.status }));
        onStoredRequirementsChange(reqs);
      } catch (err) {
        console.error('Failed to ensure requirements:', err);
        setIsEnsuring(false);
        return;
      }
      setIsEnsuring(false);
    }

    const req = reqs.find(r => r.canonicalFormat === format);
    if (!req) return;

    setActiveModal({ spec, venueCount, requirementId: req.id });
  }, [campaignId, storedRequirements, selectedItems, allInventory, onStoredRequirementsChange]);

  const handleUploadSuccess = useCallback(async (asset: CreativeAsset, format: CanonicalFormat) => {
    onCreativeUploaded(asset, format);
    if (!campaignId) {
      setUploadedFormats(prev => new Set([...prev, format]));
      return;
    }
    try {
      const reqs = await getStoredCreativeRequirements(campaignId);
      const seeded = new Set<CanonicalFormat>(
        reqs.filter(r => r.status === 'uploaded' || r.status === 'approved').map(r => r.canonicalFormat as CanonicalFormat)
      );
      setUploadedFormats(seeded);
      onStoredRequirementsChange(reqs.map(r => ({ id: r.id, canonicalFormat: r.canonicalFormat, status: r.status })));
    } catch {
      setUploadedFormats(prev => new Set([...prev, format]));
    }
  }, [campaignId, onCreativeUploaded, onStoredRequirementsChange]);

  const handleUnlink = useCallback(async (format: CanonicalFormat) => {
    const req = storedRequirements?.find(r => r.canonicalFormat === format);
    if (!req) return;
    try {
      await unlinkAssetFromRequirement(req.id);
      setUploadedFormats(prev => { const next = new Set(prev); next.delete(format); return next; });
    } catch (err) {
      console.error('Failed to unlink asset:', err);
    }
  }, [storedRequirements]);

  const footerButtonLabel = isSaving
    ? '儲存中...'
    : '繼續 →';

  const footerButtonAction = allFormatsUploaded && onAllUploaded ? onAllUploaded : onContinue;

  return (
    <>
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-[51]"
          onClick={onClose}
          aria-hidden
        />
      )}

      {activeModal && (
        <CreativeUploadModal
          spec={activeModal.spec}
          venueCount={activeModal.venueCount}
          requirementId={activeModal.requirementId}
          onSuccess={handleUploadSuccess}
          onClose={() => setActiveModal(null)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 right-0 w-full sm:w-[88vw] max-w-[340px] lg:w-[340px] bg-white border-l border-slate-200 flex flex-col h-full flex-shrink-0 z-[52] lg:z-40 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] transform transition-transform duration-200 lg:transform-none ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-semibold text-slate-900 flex items-center">
            <Calculator className="w-4 h-4 mr-2 text-indigo-600" /> {t('mediaPlan.title')}
          </h2>
          <div className="flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs font-semibold">
              {selectedItems.length} {t('planner.locations')}
            </span>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Close media plan"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Flight date picker */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/30">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> 走期設定
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={flightStart ?? ''}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => onFlightDateChange(e.target.value || null, flightEnd)}
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:border-indigo-400 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 flex-shrink-0">至</span>
            <input
              type="date"
              value={flightEnd ?? ''}
              min={flightStart ?? new Date().toISOString().slice(0, 10)}
              onChange={e => onFlightDateChange(flightStart, e.target.value || null)}
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:border-indigo-400 focus:outline-none"
            />
          </div>
          {flightStart && flightEnd && (
            <p className="text-[10px] text-indigo-600 font-medium mt-1.5">
              {flightDays(flightStart, flightEnd)} 天
            </p>
          )}
        </div>

        {/* Creative status banner — only when items are selected */}
        {selectedItems.length > 0 && groups.length > 0 && (
          <div className={`px-4 py-2 flex items-center gap-2 text-xs font-semibold border-b ${
            allFormatsUploaded
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
              : 'bg-amber-50 border-amber-100 text-amber-700'
          }`}>
            {allFormatsUploaded
              ? <><CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> 素材齊備，可送審</>
              : <><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> 尚缺 {groups.filter(g => !uploadedFormats.has(g.format)).length} 種素材格式</>
            }
          </div>
        )}

        {/* Selected Items Area */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/30">
          {selectedDetails.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-900 mb-1">{t('mediaPlan.empty')}</p>
              <p className="text-xs text-slate-500 px-4">{t('mediaPlan.emptyDesc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDetails.map(({ inventoryId, days, inventory }) => (
                <div key={inventoryId} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors group relative">
                  <button
                    onClick={() => onRemove(inventoryId)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove from plan"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="pr-6">
                    <h4 className="text-sm font-semibold text-slate-900 leading-tight mb-1 line-clamp-1">{inventory?.name}</h4>
                    <p className="text-xs text-slate-500 mb-3">{inventory?.district}, {inventory?.city}</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    {!(flightStart && flightEnd) && (
                      <div className="flex items-center space-x-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <input
                          type="number"
                          min="1"
                          className="w-12 text-xs border-b border-slate-300 focus:border-indigo-500 focus:ring-0 p-0 text-center font-medium text-slate-700 bg-transparent"
                          value={days}
                          onChange={(e) => {
                            const d = parseInt(e.target.value) || 1;
                            onUpdateDays(inventoryId, d);
                            if (flightStart) {
                              onFlightDateChange(flightStart, addDays(flightStart, d - 1));
                            }
                          }}
                        />
                        <span className="text-xs">{t('mediaPlan.days')}</span>
                      </div>
                    )}
                    <div className={`text-sm font-semibold text-slate-900 ${flightStart && flightEnd ? 'ml-auto' : ''}`}>
                      {formatCurrency((inventory?.pricePerDay || 0) * days)}
                    </div>
                  </div>
                </div>
              ))}

              <CreativeRequirementsPanel
                groups={groups}
                uploadedFormats={uploadedFormats}
                onFormatClick={handleFormatClick}
                onUnlink={handleUnlink}
                isEnsuring={isEnsuring}
                hasActiveCampaign={!!campaignId}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 bg-white">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('mediaPlan.campaignEstimate')}</h3>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 flex items-center"><Eye className="w-4 h-4 mr-2 text-slate-400" /> {t('mediaPlan.totalImpressions')}</span>
              <span className="font-semibold text-slate-900">{exactTotalImpressions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-slate-400" /> {t('mediaPlan.avgCpm')}</span>
              <span className="font-semibold text-slate-900">NT${formatCPM(exactAvgCpm)}</span>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-slate-700 font-medium">{t('mediaPlan.totalBudget')}</span>
              <span className="font-bold text-lg text-indigo-600">{formatCurrency(exactTotalBudget)}</span>
            </div>
          </div>

          <button
            onClick={footerButtonAction}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              allFormatsUploaded
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            disabled={selectedItems.length === 0 || (!onContinue && !onAllUploaded) || isSaving}
          >
            {footerButtonLabel}
          </button>

          {campaignId && (campaignStatus === 'draft' || campaignStatus === 'pending_creative_review') && (
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="w-full mt-2 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {draftSaved
                ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 草稿已儲存</>
                : isSavingDraft
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 儲存中...</>
                : <><Save className="w-3.5 h-3.5" /> 儲存草稿</>
              }
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

function OrientationMark({ format }: { format: string }) {
  const cls = 'rounded-sm bg-slate-300 flex-shrink-0';
  if (format === 'landscape_16_9') return <div className={`${cls} w-7 h-[18px] mt-0.5`} />;
  if (format === 'portrait_9_16') return <div className={`${cls} w-[14px] h-6 mt-0.5`} />;
  if (format === 'square_1_1')    return <div className={`${cls} w-5 h-5 mt-0.5`} />;
  return <div className={`${cls} w-8 h-2.5 mt-1`} />;
}

function CreativeRequirementsPanel({
  groups,
  uploadedFormats,
  onFormatClick,
  onUnlink,
  isEnsuring,
  hasActiveCampaign,
}: {
  groups: ReturnType<typeof deriveGroupedRequirements>;
  uploadedFormats: Set<CanonicalFormat>;
  onFormatClick: (format: CanonicalFormat, venueCount: number) => void;
  onUnlink: (format: CanonicalFormat) => Promise<void>;
  isEnsuring: boolean;
  hasActiveCampaign: boolean;
}) {
  if (groups.length === 0) return null;

  const uploadedCount = groups.filter(g => uploadedFormats.has(g.format)).length;

  return (
    <div className="mt-1 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <ImageIcon className="w-3 h-3" /> 素材需求
        </span>
        <span className="text-[10px] text-slate-400">
          {uploadedCount}/{groups.length} 已上傳
        </span>
      </div>

      <div className="space-y-2">
        {groups.map(group => {
          const isUploaded = uploadedFormats.has(group.format);
          return (
            <div key={group.format} className={`w-full flex items-start gap-2.5 p-2 rounded-lg transition-colors ${
              isUploaded
                ? 'bg-emerald-50 border border-emerald-100'
                : hasActiveCampaign
                ? 'border border-transparent'
                : 'border border-transparent opacity-60'
            }`}>
              <button
                onClick={() => !isUploaded && hasActiveCampaign && onFormatClick(group.format, group.locationCount)}
                disabled={isUploaded || !hasActiveCampaign || isEnsuring}
                className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
              >
                <OrientationMark format={group.format} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-semibold truncate ${isUploaded ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {group.label}
                    </span>
                    {isUploaded ? (
                      <span className="flex items-center gap-0.5 flex-shrink-0 text-[10px] font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" /> 已上傳
                      </span>
                    ) : (
                      <span className="flex-shrink-0 text-[10px] font-semibold text-amber-600">
                        {isEnsuring ? '...' : '待上傳'}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono leading-snug">
                    {group.dimensions.replace(' px', '')}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {group.locationCount} 個版位需要此格式
                  </div>
                </div>
              </button>
              {isUploaded && (
                <button
                  onClick={() => onUnlink(group.format)}
                  className="flex-shrink-0 p-0.5 text-emerald-400 hover:text-red-500 transition-colors"
                  title="移除素材"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2.5">
        {hasActiveCampaign
          ? '點擊格式列即可上傳素材，也可繼續選點位後統一上傳。'
          : '請先加入點位以開始上傳素材。'}
      </p>
    </div>
  );
}
