'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { FilterSidebar } from './FilterSidebar';
import { InventoryDiscovery } from './InventoryDiscovery';
import { MediaPlanSummary } from './MediaPlanSummary';
import { InventoryDetailCard } from './InventoryDetailCard';
import { PerformanceBar } from './PerformanceBar';
import { CampaignReviewStep } from './CampaignReviewStep';

import { InventoryLocation, MediaPlanItem, FilterState } from '@/types/inventory';
import {
  createDraftCampaign,
  addInventoryItem,
  removeInventoryItem,
  submitCreativesForReview,
  listCampaignSummaries,
  getInventoryItems,
  getStoredCreativeRequirements,
} from '@/lib/api/campaign-draft';
import { listMediaAssets, deleteMediaAsset, renameMediaAsset } from '@/lib/api/creatives';
import { searchInventory, sortInventory, filterInventory } from '@/utils/inventoryFilters';
import { addToMediaPlan, removeFromMediaPlan } from '@/utils/mediaPlanCalculations';
import { Check, Globe, ImageIcon, Film, CheckCircle2, FileText, Plus, ChevronRight, Loader2, AlertCircle, Clock, Pencil, Trash2, X as XIcon } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { usePlannerStore } from '@/store/usePlannerStore';

// --- Types ---
type MediaAsset = Awaited<ReturnType<typeof listMediaAssets>>[number];
type CampaignSummary = Awaited<ReturnType<typeof listCampaignSummaries>>[number];

// --- LibraryTabContent ---
function LibraryTabContent() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMediaAssets()
      .then(setAssets)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (id: string) => setAssets(prev => prev.filter(a => a.id !== id));
  const handleRename = (id: string, newName: string) =>
    setAssets(prev => prev.map(a => a.id === id ? { ...a, originalFilename: newName } : a));

  const images = assets.filter(a => a.fileType === 'image');
  const videos = assets.filter(a => a.fileType === 'video');

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">素材庫</h2>
            <p className="text-sm text-slate-500 mt-0.5">所有上傳過的廣告素材</p>
          </div>
          <span className="text-sm text-slate-400">{assets.length} 個素材</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !error && assets.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-16 text-center">
            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-700 mb-1">素材庫是空的</p>
            <p className="text-xs text-slate-400">在活動規劃中上傳素材後，會自動收錄在這裡。</p>
          </div>
        )}

        {!loading && !error && assets.length > 0 && (
          <div className="space-y-8">
            {images.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" /> 圖片（{images.length}）
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map(asset => (
                    <LibraryAssetCard key={asset.id} asset={asset} onDelete={handleDelete} onRename={handleRename} />
                  ))}
                </div>
              </section>
            )}
            {videos.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Film className="w-4 h-4" /> 影片（{videos.length}）
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {videos.map(asset => (
                    <LibraryAssetCard key={asset.id} asset={asset} onDelete={handleDelete} onRename={handleRename} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LibraryAssetCard({
  asset,
  onDelete,
  onRename,
}: {
  asset: MediaAsset;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(asset.originalFilename);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === asset.originalFilename) { setIsEditing(false); return; }
    setIsSaving(true);
    try {
      await renameMediaAsset(asset.id, trimmed);
      onRename(asset.id, trimmed);
      setIsEditing(false);
    } catch (err) {
      console.error('Rename failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMediaAsset(asset.id);
      onDelete(asset.id);
    } catch (err) {
      console.error('Delete failed:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-200 hover:shadow-sm transition-all group">
      <div className="h-32 bg-slate-100 relative">
        {asset.fileType === 'image' ? (
          <img src={asset.publicUrl} alt={asset.originalFilename} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8 text-slate-300" />
          </div>
        )}
        {asset.isApproved && (
          <div className="absolute top-2 left-2">
            <span className="flex items-center gap-0.5 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              <CheckCircle2 className="w-2.5 h-2.5" /> 已審核
            </span>
          </div>
        )}
        {/* Action buttons, visible on hover */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setNameInput(asset.originalFilename); setIsEditing(true); }}
            className="p-1 bg-white rounded-md shadow text-slate-500 hover:text-indigo-600 transition-colors"
            title="重新命名"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1 bg-white rounded-md shadow text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
            title="刪除"
          >
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        </div>
      </div>
      <div className="p-3">
        {isEditing ? (
          <div className="flex items-center gap-1 mb-1">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditing(false); }}
              className="flex-1 text-xs border-b border-indigo-400 bg-transparent outline-none py-0.5 min-w-0"
              autoFocus
            />
            <button onClick={handleSaveName} disabled={isSaving} className="text-emerald-600 hover:text-emerald-700 flex-shrink-0">
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </button>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
              <XIcon className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <p className="text-xs font-semibold text-slate-800 truncate mb-1">{asset.originalFilename}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">{(asset.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
          <span className="text-[10px] text-slate-400">{new Date(asset.createdAt).toLocaleDateString('zh-TW')}</span>
        </div>
      </div>
    </div>
  );
}

// --- CampaignsTabContent ---
function campaignStatusBadge(status: string, uploadedCount: number, totalCount: number) {
  if (status === 'draft' && totalCount === 0) return { label: '草稿', color: 'bg-slate-100 text-slate-600' };
  if (uploadedCount < totalCount) return { label: '素材未完整', color: 'bg-amber-100 text-amber-700' };
  if (status === 'pending_creative_review' || status === 'pending_review') return { label: '審核中', color: 'bg-blue-100 text-blue-700' };
  if (status === 'ready_to_book') return { label: '可下單', color: 'bg-emerald-100 text-emerald-700' };
  return { label: status, color: 'bg-slate-100 text-slate-600' };
}

function CampaignsTabContent({ setActiveTab, onResume }: { setActiveTab: (tab: 'planner' | 'library' | 'campaigns') => void; onResume: (campaignId: string) => Promise<void> }) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCampaignSummaries()
      .then(setCampaigns)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">我的活動</h2>
          <button
            onClick={() => setActiveTab('planner')}
            className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <Plus className="w-4 h-4" /> 新增活動
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700 mb-1">還沒有活動</p>
            <p className="text-xs text-slate-400 mb-4">點擊新增活動開始規劃你的第一個 DOOH 廣告活動</p>
            <button
              onClick={() => setActiveTab('planner')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> 新增活動
            </button>
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div className="space-y-3">
            {campaigns.map(c => {
              const badge = campaignStatusBadge(c.status, c.uploadedCount, c.totalCount);
              return (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-900 truncate">{c.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badge.color}`}>{badge.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{c.inventoryCount} 個版位</span>
                      {c.totalCount > 0 && (
                        <span className="flex items-center gap-1">
                          {c.uploadedCount === c.totalCount
                            ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            : <Clock className="w-3 h-3 text-amber-500" />}
                          素材 {c.uploadedCount}/{c.totalCount}
                        </span>
                      )}
                      <span>{new Date(c.createdAt).toLocaleDateString('zh-TW')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onResume(c.id).then(() => setActiveTab('planner'))}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 flex-shrink-0"
                  >
                    繼續規劃 <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main CampaignPlannerPage ---
export function CampaignPlannerPage() {
  // --- Supabase inventory ---
  const { allInventory, fetchInventory } = usePlannerStore();

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // --- Tab State ---
  const [activeTab, setActiveTab] = useState<'planner' | 'library' | 'campaigns'>('planner');

  // --- Step Flow State ---
  const [step, setStep] = useState<'inventory' | 'review'>('inventory');

  // --- Campaign Draft State ---
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [storedRequirements, setStoredRequirements] = useState<
    Array<{ id: string; canonicalFormat: string; status?: string }> | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Global State ---
  const [filters, setFilters] = useState<FilterState>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('impressions_desc');
  const [currentView, setCurrentView] = useState<'list' | 'map'>('list');

  const [selectedItems, setSelectedItems] = useState<MediaPlanItem[]>([]);
  const [selectedInventoryForDetail, setSelectedInventoryForDetail] = useState<InventoryLocation | null>(null);

  const dbItemIdMap = useRef<Map<string, string>>(new Map()); // inventoryId → campaign_inventory_items row id
  const isCreatingDraft = useRef(false);
  const pendingItemsRef = useRef<InventoryLocation[]>([]);

  // Mobile drawer state for filter and media-plan sidebars (<lg)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // --- Derived Data ---
  const filteredAndSortedInventory = useMemo(() => {
    let result = filterInventory(allInventory, filters);
    result = searchInventory(result, searchQuery);
    result = sortInventory(result, sortOption);
    return result;
  }, [allInventory, filters, searchQuery, sortOption]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.campaignObjective) count++;
    if (filters.city) count++;
    if (filters.districts && filters.districts.length > 0) count++;
    if (filters.venueTypes && filters.venueTypes.length > 0) count++;
    if (filters.screenTypes && filters.screenTypes.length > 0) count++;
    if (filters.audienceTags && filters.audienceTags.length > 0) count++;
    if (filters.availabilityStatus && filters.availabilityStatus.length > 0) count++;
    if (filters.minBudget !== undefined || filters.maxBudget !== undefined) count++;
    if (filters.minImpressions !== undefined || filters.maxImpressions !== undefined) count++;
    return count;
  }, [filters]);

  // --- Handlers ---
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleAdd = async (item: InventoryLocation) => {
    // Always add to local state immediately
    setSelectedItems(prev => addToMediaPlan(prev, item, 7)); // Default 7 days

    let cId = campaignId;

    if (!cId) {
      if (isCreatingDraft.current) {
        // Draft creation in progress — queue for DB write after it finishes
        pendingItemsRef.current.push(item);
        return;
      }

      isCreatingDraft.current = true;
      try {
        const draft = await createDraftCampaign();
        cId = draft.id;
        setCampaignId(draft.id);
      } catch (err) {
        console.error('Failed to create campaign draft:', err);
        isCreatingDraft.current = false;
        return;
      }
      isCreatingDraft.current = false;

      // Flush all pending items that arrived during draft creation
      for (const pending of pendingItemsRef.current) {
        const alreadyMapped = dbItemIdMap.current.has(pending.id);
        if (!alreadyMapped) {
          try {
            const dbRow = await addInventoryItem(cId, pending.id, 7, pending.pricePerDay, pending.dailyImpressions);
            dbItemIdMap.current.set(pending.id, dbRow.id);
          } catch (err) {
            console.error('Failed to persist queued inventory item:', err);
          }
        }
      }
      pendingItemsRef.current = [];
    }

    // Persist current item (if not already mapped)
    const alreadyInPlan = selectedItems.some(i => i.inventoryId === item.id);
    const alreadyMapped = dbItemIdMap.current.has(item.id);
    if (cId && !alreadyInPlan && !alreadyMapped) {
      try {
        const dbRow = await addInventoryItem(cId, item.id, 7, item.pricePerDay, item.dailyImpressions);
        dbItemIdMap.current.set(item.id, dbRow.id);
      } catch (err) {
        console.error('Failed to persist inventory item:', err);
      }
    }
  };

  const handleRemove = (inventoryId: string) => {
    setSelectedItems(prev => removeFromMediaPlan(prev, inventoryId));
    if (campaignId) {
      const dbRowId = dbItemIdMap.current.get(inventoryId);
      if (dbRowId) {
        removeInventoryItem(dbRowId).catch(err => console.error('Failed to remove inventory item from DB:', err));
        dbItemIdMap.current.delete(inventoryId);
      }
    }
  };

  const handleUpdateDays = (inventoryId: string, days: number) => {
    setSelectedItems(prev =>
      prev.map(item => item.inventoryId === inventoryId ? { ...item, days } : item)
    );
  };

  const handleContinueToReview = async () => {
    if (selectedItems.length === 0) return;
    setIsSaving(true);
    try {
      if (campaignId) {
        const reqs = await submitCreativesForReview(campaignId, selectedItems, allInventory);
        setStoredRequirements(reqs.map(r => ({
          id: r.id,
          canonicalFormat: r.canonicalFormat,
        })));
      }
      setStep('review');
    } catch (err) {
      console.error('Failed to submit for review:', err);
      setStep('review'); // still advance even if DB fails
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumeCampaign = async (resumeId: string) => {
    try {
      const [items, reqs] = await Promise.all([
        getInventoryItems(resumeId),
        getStoredCreativeRequirements(resumeId),
      ]);

      // Rebuild selectedItems from DB rows
      const restored = items.map(row => ({
        inventoryId: row.inventoryLocationId,
        days: row.days,
      }));
      setSelectedItems(restored);

      // Rebuild dbItemIdMap
      dbItemIdMap.current = new Map(items.map(row => [row.inventoryLocationId, row.id]));

      // Restore campaign and requirements
      setCampaignId(resumeId);
      setStoredRequirements(reqs.length > 0 ? reqs.map(r => ({ id: r.id, canonicalFormat: r.canonicalFormat, status: r.status })) : null);

      // Reset to inventory step
      setStep('inventory');
    } catch (err) {
      console.error('Failed to resume campaign:', err);
    }
  };

  const { t, toggleLocale } = useI18n();

  // Render Step Progress
  const StepProgress = () => (
    <div className="flex items-center space-x-2 text-sm">
      <div
        className={`flex items-center ${step === 'inventory' ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium cursor-pointer'}`}
        onClick={() => step === 'review' ? setStep('inventory') : undefined}
      >
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mr-1.5 ${step === 'inventory' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
          {step === 'review' ? <Check className="w-3 h-3" /> : '1'}
        </div>
        選擇版位
      </div>
      <div className="w-6 h-px bg-slate-300"></div>
      <div className={`flex items-center ${step === 'review' ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'}`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mr-1.5 ${step === 'review' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
          2
        </div>
        確認送審
      </div>
    </div>
  );

  return (
    <main className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans relative">

      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-30 shadow-sm gap-3">
        {/* Left: title + tabs */}
        <div className="flex items-center gap-6 min-w-0">
          <h1 className="text-base font-bold tracking-tight text-slate-800 whitespace-nowrap">Campaign Planner</h1>

          {/* Tab switcher — desktop */}
          <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {(['planner', 'library', 'campaigns'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'planner' ? '規劃版位' : tab === 'library' ? '素材庫' : '我的活動'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile tab buttons */}
          <div className="flex md:hidden items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {(['planner', 'library', 'campaigns'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-1.5 rounded-md text-[10px] font-semibold transition-colors ${
                  activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                {tab === 'planner' ? '規劃' : tab === 'library' ? '素材' : '活動'}
              </button>
            ))}
          </div>
          <button
            onClick={toggleLocale}
            className="hidden sm:flex items-center px-2 sm:px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Globe className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">{t('common.langToggle')}</span>
          </button>
          <button className="px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors shadow-sm">
            {t('planner.exit')}
          </button>
        </div>
      </header>

      {/* Step progress sub-bar — only in Planner tab */}
      {activeTab === 'planner' && (
        <div className="h-10 bg-white border-b border-slate-100 flex items-center px-6 flex-shrink-0">
          <StepProgress />
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex overflow-hidden relative${activeTab === 'planner' && step === 'inventory' ? ' pb-16 lg:pb-14' : ''}`}>

        {activeTab === 'planner' && (
          <>
            {step === 'inventory' && (
              <>
                <FilterSidebar
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  activeFilterCount={activeFilterCount}
                  isOpen={isFilterOpen}
                  onClose={() => setIsFilterOpen(false)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />

                <InventoryDiscovery
                  inventory={filteredAndSortedInventory}
                  sortOption={sortOption}
                  onSortChange={setSortOption}
                  currentView={currentView}
                  onViewChange={setCurrentView}
                  selectedItems={selectedItems}
                  onViewDetails={setSelectedInventoryForDetail}
                  onAdd={handleAdd}
                  objective={filters.campaignObjective}
                />

                <MediaPlanSummary
                  selectedItems={selectedItems}
                  allInventory={allInventory}
                  onRemove={handleRemove}
                  onUpdateDays={handleUpdateDays}
                  onContinue={handleContinueToReview}
                  onAllUploaded={handleContinueToReview}
                  isSaving={isSaving}
                  isOpen={isSummaryOpen}
                  onClose={() => setIsSummaryOpen(false)}
                  campaignId={campaignId}
                  storedRequirements={storedRequirements}
                  onStoredRequirementsChange={setStoredRequirements}
                  onCreativeUploaded={() => {}}
                />

                {/* Detail Modal Overlay */}
                {selectedInventoryForDetail && (
                  <InventoryDetailCard
                    item={selectedInventoryForDetail}
                    isSelected={selectedItems.some(i => i.inventoryId === selectedInventoryForDetail.id)}
                    onClose={() => setSelectedInventoryForDetail(null)}
                    onAdd={() => handleAdd(selectedInventoryForDetail)}
                    objective={filters.campaignObjective}
                  />
                )}

                <PerformanceBar
                  selectedItems={selectedItems}
                  allInventory={allInventory}
                  objective={filters.campaignObjective}
                  onOpenSummary={() => setIsSummaryOpen(true)}
                />
              </>
            )}

            {step === 'review' && (
              <CampaignReviewStep
                selectedItems={selectedItems}
                allInventory={allInventory}
                campaignId={campaignId}
                storedRequirements={storedRequirements}
                onStoredRequirementsChange={setStoredRequirements}
                onBack={() => setStep('inventory')}
              />
            )}
          </>
        )}

        {activeTab === 'library' && (
          <LibraryTabContent />
        )}

        {activeTab === 'campaigns' && (
          <CampaignsTabContent setActiveTab={setActiveTab} onResume={handleResumeCampaign} />
        )}

      </div>
    </main>
  );
}
