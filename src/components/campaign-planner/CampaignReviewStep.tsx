'use client';

import { useState, useCallback, useEffect } from 'react';
import { CreativeAsset, MediaPlanItem, InventoryLocation } from '@/types/inventory';
import { ReviewSection } from './ReviewSection';
import { formatCurrency, formatNumber, formatCPM } from '@/utils/formatters';
import { ArrowLeft, CheckCircle, MapPin, ImageIcon, Settings, Calculator, Send, AlertTriangle, CheckCircle2, Upload, Pencil, Check, X as XIcon, Clock, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { getCampaign, getStoredCreativeRequirements, submitCampaignForConfirmation, updateDraftCampaign, unlinkAssetFromRequirement } from '@/lib/api/campaign-draft';
import { deriveGroupedRequirements, FORMAT_SPECS } from '@/utils/creativeRequirements';
import { flightDays } from '@/utils/dates';
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
  onFlightDateChange: (start: string | null, end: string | null) => void;
}

type ActiveModal = {
  format: CanonicalFormat;
  requirementId: string;
  venueCount: number;
};

export function CampaignReviewStep({ selectedItems, allInventory, campaignId, storedRequirements, onStoredRequirementsChange, onBack, flightStart, flightEnd, onFlightDateChange }: Props) {
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
      label: '主要走期',
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
      status: campaignStatus === 'approved' ? 'pass'
            : campaignStatus === 'pending_review' ? 'pending'
            : 'waiting',
      detail: campaignStatus === 'approved' ? '庫存已確認'
            : campaignStatus === 'pending_review' ? '等待平台確認庫存'
            : '送審後由平台確認',
    },
  ] as const;

  type CheckStatus = 'pass' | 'blocked' | 'pending' | 'waiting';
  const statusStyle: Record<CheckStatus, { dot: string; text: string; label: string; bg: string; border: string; icon: React.ReactNode }> = {
    pass: { 
      dot: 'bg-emerald-500', 
      text: 'text-emerald-700', 
      label: '通過', 
      bg: 'bg-emerald-50/60', 
      border: 'border-emerald-100',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    },
    blocked: { 
      dot: 'bg-rose-500', 
      text: 'text-rose-600', 
      label: '未完成', 
      bg: 'bg-rose-50/60', 
      border: 'border-rose-100',
      icon: <AlertTriangle className="w-4 h-4 text-rose-500" />
    },
    pending: { 
      dot: 'bg-amber-500', 
      text: 'text-amber-700', 
      label: '待確認', 
      bg: 'bg-amber-50/60', 
      border: 'border-amber-100',
      icon: <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
    },
    waiting: { 
      dot: 'bg-slate-400', 
      text: 'text-slate-500', 
      label: '等待中', 
      bg: 'bg-slate-50', 
      border: 'border-slate-200/60',
      icon: <Clock className="w-4 h-4 text-slate-400" />
    },
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 pb-36 lg:pb-8 custom-scrollbar">
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
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }}
                  className="text-xl sm:text-2xl font-bold text-slate-900 border-b-2 border-indigo-500 bg-transparent outline-none py-0.5 min-w-0 flex-1 sm:max-w-sm"
                  autoFocus
                />
                <button onClick={handleSaveName} disabled={isSavingName} className="p-1.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-50 bg-emerald-50 rounded-lg transition-colors">
                  <Check className="w-5 h-5" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-lg transition-colors">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{campaignName || t('review.title')}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setNameInput(campaignName); setIsEditingName(true); }} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all" title="編輯名稱">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <span className="bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider">{t('review.status')}</span>
                </div>
              </>
            )}
          </div>
          <p className="text-sm text-slate-500">{t('review.subtitle')}</p>
        </div>

        {/* 2-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Left: main review content */}
          <div className="flex-1 w-full min-w-0">
            {submitError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            <ReviewSection title={t('review.section.performance')} icon={<Calculator />}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-1">
                {/* Card 1: Flight Duration */}
                <div className="bg-gradient-to-br from-slate-50/70 to-white rounded-xl p-3 sm:p-4 border border-slate-100 border-t-2 border-t-indigo-500 flex flex-col justify-between min-h-[100px] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default">
                  <div>
                    <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">走期</div>
                    {flightStart && flightEnd ? (
                      <>
                        <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                          {flightDays(flightStart, flightEnd)} 天
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-slate-500 mt-1 font-mono leading-none">
                          {flightStart} ~ {flightEnd}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs sm:text-sm text-amber-500 font-semibold mt-1">尚未設定走期</div>
                    )}
                  </div>
                </div>

                {/* Card 2: Total Impressions */}
                <div className="bg-gradient-to-br from-slate-50/70 to-white rounded-xl p-3 sm:p-4 border border-slate-100 border-t-2 border-t-blue-500 flex flex-col justify-between min-h-[100px] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default">
                  <div>
                    <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">{t('review.perf.totalImp')}</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 leading-tight">{formatNumber(exactTotalImpressions)}</div>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-mono mt-1 leading-none">{formatNumber(dailyImpressions)} {t('review.perf.perDay')}</div>
                </div>

                {/* Card 3: Total Budget */}
                <div className="bg-gradient-to-br from-slate-50/70 to-white rounded-xl p-3 sm:p-4 border border-slate-100 border-t-2 border-t-emerald-500 flex flex-col justify-between min-h-[100px] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default">
                  <div>
                    <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">{t('review.perf.totalBudget')}</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-indigo-600 leading-tight">{formatCurrency(exactTotalBudget)}</div>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-mono mt-1 leading-none">{formatCurrency(dailyBudget)} {t('review.perf.perDay')}</div>
                </div>

                {/* Card 4: Average CPM */}
                <div className="bg-gradient-to-br from-slate-50/70 to-white rounded-xl p-3 sm:p-4 border border-slate-100 border-t-2 border-t-violet-500 flex flex-col justify-between min-h-[100px] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default">
                  <div>
                    <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">{t('review.perf.avgCpm')}</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600 leading-tight">NT${formatCPM(exactAvgCpm)}</div>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-mono mt-1 leading-none">{t('review.perf.highlyEfficient')}</div>
                </div>
              </div>
            </ReviewSection>

            <ReviewSection title={`${t('review.section.selectedLocations')} (${selectedItems.length})`} icon={<MapPin />}>
              <div className="mb-3.5 flex flex-wrap gap-1.5">
                {Array.from(uniqueScreenTypes).map(st => <span key={st} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold">{st}</span>)}
                {Array.from(uniqueAudiences).slice(0, 3).map(a => <span key={a} className="bg-blue-50/80 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold">{a}</span>)}
              </div>

              {/* Desktop Table View: visible >= md */}
              <div className="hidden md:block overflow-x-auto border border-slate-200/80 rounded-xl shadow-sm bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50/70 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold">{t('review.table.location')}</th>
                      <th className="px-4 py-3.5 font-semibold">{t('review.table.type')}</th>
                      <th className="px-4 py-3.5 font-semibold text-right">{t('review.table.dailyImp')}</th>
                      <th className="px-4 py-3.5 font-semibold text-right">{t('review.table.duration')}</th>
                      <th className="px-4 py-3.5 font-semibold text-right">{t('review.table.budget')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDetails.map(({ inventoryId, days, startDate, endDate, inventory }) => (
                      <tr key={inventoryId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 leading-tight">{inventory.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{inventory.district}, {inventory.city}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          <span className="inline-block bg-indigo-50/60 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-lg text-xs font-bold">
                            {inventory.screenType}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold font-mono text-slate-800">{formatNumber(inventory.dailyImpressions)}</td>
                        <td className="px-4 py-3.5 text-right text-slate-600">
                          <div className="font-semibold text-slate-800">{days} {t('review.table.days')}</div>
                          {startDate && endDate && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">{startDate} ~ {endDate}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-indigo-600 font-mono text-base">{formatCurrency(inventory.pricePerDay * days)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View: visible < md */}
              <div className="md:hidden space-y-3">
                {selectedDetails.map(({ inventoryId, days, startDate, endDate, inventory }) => (
                  <div key={inventoryId} className="bg-slate-50/40 p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:scale-[1.01] transition-transform">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-955 text-sm truncate leading-tight">{inventory.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{inventory.district}, {inventory.city}</div>
                      </div>
                      <span className="bg-indigo-50 text-indigo-750 border border-indigo-100 px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0">
                        {inventory.screenType}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100/70 text-xs">
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-bold">日曝光</div>
                        <div className="font-semibold text-slate-800 font-mono mt-0.5">{formatNumber(inventory.dailyImpressions)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-bold">天數</div>
                        <div className="font-semibold text-slate-800 font-mono mt-0.5">{days} 天</div>
                        {startDate && endDate && (
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5 leading-none">{startDate.slice(5)}~{endDate.slice(5)}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">預算</div>
                        <div className="font-bold text-indigo-600 font-mono mt-0.5">{formatCurrency(inventory.pricePerDay * days)}</div>
                      </div>
                    </div>
                  </div>
                ))}
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
                      <div key={group.format} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isUploaded ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          {isUploaded ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className={`text-sm font-semibold truncate ${isUploaded ? 'text-emerald-800' : 'text-slate-800'}`}>{group.label}</div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">{group.dimensions.replace(' px', '')} · {group.locationCount} 個版位</div>
                          </div>
                        </div>
                        {isUploaded ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-100/70 px-2.5 py-1 rounded-full">已上傳</span>
                            <button onClick={() => handleUnlink(group.format)} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="移除並重新上傳">
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleFormatUploadClick(group.format, group.locationCount)}
                            disabled={!req}
                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
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

            {/* Back Button left under content */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <button
                onClick={onBack}
                className="flex items-center px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm active:scale-[0.98] transition-transform"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> 返回調整版位
              </button>
            </div>
          </div>

          {/* Right: eligibility checklist + CTAs */}
          <div className="w-full lg:w-88 flex-shrink-0 lg:sticky lg:top-6 space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5">送審資格確認</h3>
              <div className="space-y-3">
                {checks.map(item => {
                  const s = statusStyle[item.status];
                  return (
                    <div 
                      key={item.label} 
                      className={`flex items-start gap-3 p-3 rounded-xl border ${s.bg} ${s.border} transition-all hover:scale-[1.01]`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {s.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-700">{item.label}</span>
                          <span className={`text-[10px] font-extrabold tracking-wide uppercase px-2 py-0.5 rounded-full bg-white shadow-sm border border-slate-100 ${s.text}`}>
                            {s.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">{item.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(!flightDatesSet || (!allFormatsReady && groups.length > 0)) && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  {!flightDatesSet ? (
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-600 font-bold">請設定主要走期</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="date"
                          value={flightStart ?? ''}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={e => onFlightDateChange(e.target.value || null, flightEnd)}
                          className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-slate-50/80 hover:border-indigo-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all min-w-0 shadow-sm"
                        />
                        <span className="text-xs text-slate-400 font-semibold">–</span>
                        <input
                          type="date"
                          value={flightEnd ?? ''}
                          min={flightStart ?? new Date().toISOString().slice(0, 10)}
                          onChange={e => onFlightDateChange(flightStart, e.target.value || null)}
                          className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-slate-50/80 hover:border-indigo-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all min-w-0 shadow-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-rose-700 font-medium">請先完成所有必要的廣告素材上傳</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop and Large screen CTAs */}
            <div className="hidden lg:block space-y-2">
              {campaignStatus === 'draft' || campaignStatus === 'pending_creative_review' ? (
                <div className="space-y-2">
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
                    className="w-full py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    {isSubmitting ? '送出中...' : <>{t('review.submit')} <Send className="w-4 h-4" /></>}
                  </button>
                  <button
                    disabled={isSavingDraft}
                    onClick={handleSaveDraft}
                    className="w-full py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform"
                  >
                    {draftSaved
                      ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 草稿已儲存</>
                      : isSavingDraft ? '儲存中...'
                      : '儲存草稿'
                    }
                  </button>
                </div>
              ) : (
                <button
                  disabled={isSavingDraft}
                  onClick={handleSaveDraft}
                  className="w-full py-3 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
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

      {/* Mobile Floating Action Bar: visible < lg, pinned to bottom above standard Shell Tab Bar */}
      <div className="lg:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4 py-3.5 bg-white/90 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] animate-in slide-in-from-bottom duration-300">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">預估總預算</div>
            <div className="text-base sm:text-lg font-extrabold text-indigo-600 font-mono leading-none mt-0.5">{formatCurrency(exactTotalBudget)}</div>
            <div className="text-[9px] text-slate-500 mt-1 leading-none">{selectedItems.length} 個版位 · {flightStart && flightEnd ? `${flightDays(flightStart, flightEnd)} 天` : '未設定走期'}</div>
          </div>
          <div className="flex gap-2 flex-1 justify-end max-w-[220px]">
            {campaignStatus === 'draft' || campaignStatus === 'pending_creative_review' ? (
              <div className="flex gap-2 w-full">
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
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
                >
                  {isSubmitting ? '送出中...' : <>{t('review.submit')} <Send className="w-3.5 h-3.5" /></>}
                </button>
                <button
                  disabled={isSavingDraft}
                  onClick={handleSaveDraft}
                  className="py-2.5 px-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center justify-center shadow-sm active:scale-[0.97] transition-transform"
                  title="儲存草稿"
                >
                  {draftSaved ? <Check className="w-4 h-4 text-emerald-500" /> : '草稿'}
                </button>
              </div>
            ) : (
              <button
                disabled={isSavingDraft}
                onClick={handleSaveDraft}
                className="w-full py-2.5 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
              >
                {draftSaved ? '已更新' : isSavingDraft ? '儲存中...' : '更新資訊'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
