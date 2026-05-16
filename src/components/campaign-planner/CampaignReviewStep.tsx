'use client';

import { useState, useCallback, useEffect } from 'react';
import { CreativeAsset, MediaPlanItem, InventoryLocation } from '@/types/inventory';
import { ReviewSection } from './ReviewSection';
import { formatCurrency, formatNumber, formatCPM } from '@/utils/formatters';
import { ArrowLeft, CheckCircle, MapPin, ImageIcon, Settings, Calculator, Send, AlertTriangle, CheckCircle2, Upload, Pencil, Check, X as XIcon } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { getCampaign, getStoredCreativeRequirements, submitCampaignForConfirmation, updateDraftCampaign, unlinkAssetFromRequirement } from '@/lib/api/campaign-draft';
import { deriveGroupedRequirements, FORMAT_SPECS } from '@/utils/creativeRequirements';
import { CanonicalFormat } from '@/types/creative';
import { CreativeUploadModal } from './CreativeUploadModal';

interface Props {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
  campaignId: string | null;
  storedRequirements: Array<{ id: string; canonicalFormat: string; status?: string }> | null;
  onStoredRequirementsChange: (reqs: Array<{ id: string; canonicalFormat: string; status?: string }>) => void;
  onBack: () => void;
  flightStart: string | null;
  flightEnd: string | null;
}

type ActiveModal = {
  format: CanonicalFormat;
  requirementId: string;
  venueCount: number;
};

export function CampaignReviewStep({ selectedItems, allInventory, campaignId, storedRequirements, onStoredRequirementsChange, onBack, flightStart, flightEnd }: Props) {
  const { t } = useI18n();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedFormats, setUploadedFormats] = useState<Set<CanonicalFormat>>(new Set());
  const [approvedFormats, setApprovedFormats] = useState<Set<CanonicalFormat>>(new Set());
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

  // Campaign name editing
  const [campaignName, setCampaignName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [campaignStatus, setCampaignStatus] = useState<string>('draft');

  // On mount: fetch campaign name + pre-populate upload status from DB
  useEffect(() => {
    if (!campaignId) return;

    getCampaign(campaignId).then(c => {
      setCampaignName(c.name);
      setNameInput(c.name);
      setCampaignStatus(c.status);
    }).catch(console.error);

    getStoredCreativeRequirements(campaignId).then(reqs => {
      if (reqs.length === 0) return;
      const uploaded = new Set<CanonicalFormat>(
        reqs
          .filter(r => r.status === 'uploaded' || r.status === 'approved')
          .map(r => r.canonicalFormat as CanonicalFormat)
      );
      const approved = new Set<CanonicalFormat>(
        reqs
          .filter(r => r.status === 'approved')
          .map(r => r.canonicalFormat as CanonicalFormat)
      );
      setUploadedFormats(uploaded);
      setApprovedFormats(approved);
      onStoredRequirementsChange(reqs.map(r => ({ id: r.id, canonicalFormat: r.canonicalFormat, status: r.status })));
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const handleSaveName = async () => {
    if (!campaignId || !nameInput.trim()) return;
    setIsSavingName(true);
    try {
      await updateDraftCampaign(campaignId, { name: nameInput.trim() });
      setCampaignName(nameInput.trim());
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to save campaign name:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const selectedDetails = selectedItems
    .map(item => ({ ...item, inventory: allInventory.find(i => i.id === item.inventoryId)! }))
    .filter(item => item.inventory !== undefined);

  let exactTotalImpressions = 0, exactTotalBudget = 0, dailyImpressions = 0, dailyBudget = 0;
  const uniqueScreenTypes = new Set<string>();
  const uniqueAudiences = new Set<string>();

  selectedDetails.forEach(({ days, inventory }) => {
    exactTotalImpressions += inventory.dailyImpressions * days;
    exactTotalBudget += inventory.pricePerDay * days;
    dailyImpressions += inventory.dailyImpressions;
    dailyBudget += inventory.pricePerDay;
    uniqueScreenTypes.add(inventory.screenType);
    inventory.audienceTags.forEach(tag => uniqueAudiences.add(tag));
  });

  const exactAvgCpm = exactTotalImpressions > 0 ? (exactTotalBudget / exactTotalImpressions) * 1000 : 0;

  // Creative requirement groups
  const groups = deriveGroupedRequirements(selectedItems, allInventory);
  const allFormatsReady = groups.length > 0 && groups.every(g => uploadedFormats.has(g.format));
  const flightDatesSet = !!(flightStart && flightEnd);

  const handleFormatUploadClick = (format: CanonicalFormat, venueCount: number) => {
    const req = storedRequirements?.find(r => r.canonicalFormat === format);
    if (!req) return;
    setActiveModal({ format, requirementId: req.id, venueCount });
  };

  const handleUploadSuccess = useCallback(async (_asset: CreativeAsset, _format: CanonicalFormat) => {
    if (!campaignId) return;
    // Re-fetch from DB to pick up auto-approval (asset already approved in library)
    try {
      const reqs = await getStoredCreativeRequirements(campaignId);
      const uploaded = new Set<CanonicalFormat>(
        reqs.filter(r => r.status === 'uploaded' || r.status === 'approved').map(r => r.canonicalFormat as CanonicalFormat)
      );
      const approved = new Set<CanonicalFormat>(
        reqs.filter(r => r.status === 'approved').map(r => r.canonicalFormat as CanonicalFormat)
      );
      setUploadedFormats(uploaded);
      setApprovedFormats(approved);
      onStoredRequirementsChange(reqs.map(r => ({ id: r.id, canonicalFormat: r.canonicalFormat, status: r.status })));
    } catch (err) {
      console.error('Failed to refresh requirements after upload:', err);
    }
  }, [campaignId, onStoredRequirementsChange]);

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

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    await new Promise(r => setTimeout(r, 600)); // simulate save
    setIsSavingDraft(false);
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 3000);
  };

  if (isSubmitted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="bg-white p-10 rounded-2xl shadow-lg border border-slate-200 text-center max-w-lg animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('review.submitted.title')}</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">{t('review.submitted.body')}</p>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 mb-8 text-left">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-500">{t('review.submitted.statusLabel')}</span>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">{t('review.submitted.pendingReview')}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-500">{t('review.submitted.totalBudget')}</span>
              <span className="text-sm font-bold text-slate-900">{formatCurrency(exactTotalBudget)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">{t('review.submitted.locations')}</span>
              <span className="text-sm font-bold text-slate-900">{selectedItems.length}</span>
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors w-full">
            {t('review.submitted.createNew')}
          </button>
        </div>
      </div>
    );
  }

  const missingCount = groups.filter(g => !uploadedFormats.has(g.format)).length;

  // Eligibility checklist items
  const checks = [
    {
      label: '走期設定',
      status: (flightStart && flightEnd) ? 'pass' : 'blocked',
      detail: (flightStart && flightEnd) ? `${flightStart} – ${flightEnd}` : '尚未設定走期',
    },
    {
      label: '版位已選',
      status: selectedItems.length > 0 ? 'pass' : 'blocked',
      detail: selectedItems.length > 0 ? `${selectedItems.length} 個版位` : '尚未選擇版位',
    },
    {
      label: '素材已上傳',
      status: groups.length === 0 ? 'pass' : allFormatsReady ? 'pass' : 'blocked',
      detail: groups.length === 0 ? '無需素材' : allFormatsReady ? `${groups.length}/${groups.length} 格式` : `尚缺 ${missingCount} 種格式`,
    },
    {
      label: '素材審核',
      status: (groups.length > 0 && groups.every(g => approvedFormats.has(g.format))) ? 'pass'
            : allFormatsReady ? 'pending'
            : 'waiting',
      detail: (groups.length > 0 && groups.every(g => approvedFormats.has(g.format))) ? '平台已審核通過'
            : allFormatsReady ? '送審後由平台審核'
            : '請先完成上傳',
    },
    {
      label: '庫存確認',
      status: 'pending',
      detail: '送審後自動確認',
    },
  ] as const;

  type CheckStatus = 'pass' | 'blocked' | 'pending' | 'waiting';
  const statusStyle: Record<CheckStatus, { dot: string; text: string; label: string }> = {
    pass:    { dot: 'bg-emerald-500', text: 'text-emerald-700', label: '通過' },
    blocked: { dot: 'bg-red-500',     text: 'text-red-600',     label: '未完成' },
    pending: { dot: 'bg-amber-400',   text: 'text-amber-700',   label: '待確認' },
    waiting: { dot: 'bg-slate-300',   text: 'text-slate-400',   label: '等待中' },
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8 custom-scrollbar">
      {activeModal && storedRequirements && (
        <CreativeUploadModal
          spec={FORMAT_SPECS.find(s => s.format === activeModal.format)!}
          venueCount={activeModal.venueCount}
          requirementId={activeModal.requirementId}
          onSuccess={handleUploadSuccess}
          onClose={() => setActiveModal(null)}
        />
      )}

      <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            {isEditingName ? (
              <>
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }}
                  className="text-2xl font-bold text-slate-900 border-b-2 border-indigo-400 bg-transparent outline-none py-0.5 min-w-0 max-w-sm"
                  autoFocus
                />
                <button onClick={handleSaveName} disabled={isSavingName} className="p-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
                  <Check className="w-5 h-5" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-slate-900">{campaignName || t('review.title')}</h2>
                <button onClick={() => { setNameInput(campaignName); setIsEditingName(true); }} className="p-1 text-slate-400 hover:text-slate-600 transition-colors" title="編輯名稱">
                  <Pencil className="w-4 h-4" />
                </button>
                <span className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider">{t('review.status')}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">{t('review.subtitle')}</p>
            <button onClick={onBack} className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
              <ArrowLeft className="w-3 h-3" /> 調整版位
            </button>
          </div>
        </div>

        {/* 2-column layout */}
        <div className="flex gap-6 items-start">

          {/* Left: main review content */}
          <div className="flex-1 min-w-0">
            {submitError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            <ReviewSection title={t('review.section.performance')} icon={<Calculator />}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 col-span-2 md:col-span-1">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">走期</div>
                  {flightStart && flightEnd ? (
                    <>
                      <div className="text-lg font-bold text-slate-900">
                        {Math.max(1, Math.round((new Date(flightEnd).getTime() - new Date(flightStart).getTime()) / 86400000) + 1)} 天
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {flightStart} – {flightEnd}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-amber-500 font-medium mt-1">尚未設定走期</div>
                  )}
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t('review.perf.totalImp')}</div>
                  <div className="text-2xl font-bold text-slate-900">{formatNumber(exactTotalImpressions)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{formatNumber(dailyImpressions)} {t('review.perf.perDay')}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t('review.perf.totalBudget')}</div>
                  <div className="text-2xl font-bold text-indigo-600">{formatCurrency(exactTotalBudget)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{formatCurrency(dailyBudget)} {t('review.perf.perDay')}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t('review.perf.avgCpm')}</div>
                  <div className="text-2xl font-bold text-emerald-600">NT${formatCPM(exactAvgCpm)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t('review.perf.highlyEfficient')}</div>
                </div>
              </div>
            </ReviewSection>

            <ReviewSection title={`${t('review.section.selectedLocations')} (${selectedItems.length})`} icon={<MapPin />}>
              <div className="mb-3 flex flex-wrap gap-2">
                {Array.from(uniqueScreenTypes).map(st => <span key={st} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-semibold">{st}</span>)}
                {Array.from(uniqueAudiences).slice(0, 3).map(a => <span key={a} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold">{a}</span>)}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{t('review.table.location')}</th>
                      <th className="px-4 py-3 font-semibold">{t('review.table.type')}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t('review.table.dailyImp')}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t('review.table.duration')}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t('review.table.budget')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDetails.map(({ inventoryId, days, inventory }) => (
                      <tr key={inventoryId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{inventory.name}</div>
                          <div className="text-xs text-slate-500">{inventory.district}, {inventory.city}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{inventory.screenType}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatNumber(inventory.dailyImpressions)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{days} {t('review.table.days')}</td>
                        <td className="px-4 py-3 text-right font-semibold text-indigo-600">{formatCurrency(inventory.pricePerDay * days)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReviewSection>

            {/* Creative Requirements */}
            <ReviewSection title={`廣告素材 (${uploadedFormats.size}/${groups.length})`} icon={<ImageIcon />}>
              {groups.length === 0 ? (
                <p className="text-sm text-slate-500">無需上傳素材</p>
              ) : (
                <div className="space-y-3">
                  {groups.map(group => {
                    const isUploaded = uploadedFormats.has(group.format);
                    const req = storedRequirements?.find(r => r.canonicalFormat === group.format);
                    return (
                      <div key={group.format} className={`flex items-center justify-between p-4 rounded-xl border ${isUploaded ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          {isUploaded
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            : <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                          }
                          <div>
                            <div className={`text-sm font-semibold ${isUploaded ? 'text-emerald-800' : 'text-slate-800'}`}>{group.label}</div>
                            <div className="text-xs text-slate-400 font-mono">{group.dimensions.replace(' px', '')} · {group.locationCount} 個版位</div>
                          </div>
                        </div>
                        {isUploaded ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">已上傳</span>
                            <button onClick={() => handleUnlink(group.format)} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="移除並重新上傳">
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleFormatUploadClick(group.format, group.locationCount)}
                            disabled={!req}
                            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Upload className="w-3.5 h-3.5" /> 上傳素材
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ReviewSection>

            <div className="mt-6 pt-5 border-t border-slate-200">
              <button onClick={onBack} className="flex items-center px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> 返回調整版位
              </button>
            </div>
          </div>

          {/* Right: eligibility checklist + CTAs */}
          <div className="w-64 flex-shrink-0 sticky top-6 space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">送審資格確認</h3>
              <div className="space-y-3">
                {checks.map(item => {
                  const s = statusStyle[item.status];
                  return (
                    <div key={item.label} className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                          <span className={`text-[10px] font-bold ${s.text}`}>{s.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(!flightDatesSet || (!allFormatsReady && groups.length > 0)) && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-600 font-medium">
                    {!flightDatesSet ? '請先在側欄設定走期' : '請完成所有素材上傳'}
                  </p>
                </div>
              )}
            </div>

            {campaignStatus === 'draft' || campaignStatus === 'pending_creative_review' ? (
              <button
                disabled={isSubmitting || !allFormatsReady || !flightDatesSet}
                onClick={async () => {
                  setIsSubmitting(true);
                  setSubmitError(null);
                  try {
                    if (!campaignId) throw new Error('找不到草稿活動，請重新開始');
                    await submitCampaignForConfirmation(campaignId);
                    setCampaignStatus('pending_review');
                    setIsSubmitted(true);
                  } catch (err) {
                    setSubmitError(err instanceof Error ? err.message : '送出失敗，請稍後再試');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="w-full py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? '送出中...' : <>{t('review.submit')} <Send className="w-4 h-4" /></>}
              </button>
            ) : (
              <button
                disabled={isSavingDraft}
                onClick={handleSaveDraft}
                className="w-full py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {draftSaved
                  ? <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 已儲存</>
                  : isSavingDraft ? '儲存中...'
                  : '更新資訊'
                }
              </button>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
