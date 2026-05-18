'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FilterSidebar } from './FilterSidebar';
import { InventoryDiscovery } from './InventoryDiscovery';
import type { ViewMode } from './ViewToggle';
import { MediaPlanSummary } from './MediaPlanSummary';
import { InventoryDetailCard } from './InventoryDetailCard';
import { PerformanceBar } from './PerformanceBar';
import { CampaignReviewStep } from './CampaignReviewStep';

import { InventoryLocation, MediaPlanItem, FilterState, MediaPlanAddOptions } from '@/types/inventory';
import {
  createDraftCampaign,
  addInventoryItem,
  removeInventoryItem,
  submitCreativesForReview,
  getInventoryItems,
  getStoredCreativeRequirements,
  getCampaign,
  updateDraftCampaign,
  updateInventoryItemDays,
} from '@/lib/api/campaign-draft';
import { listMediaAssets, deleteMediaAsset, renameMediaAsset, uploadCreativeAsset } from '@/lib/api/creatives';
import { searchInventory, sortInventory, filterInventory } from '@/utils/inventoryFilters';
import { addDays, flightDays } from '@/utils/dates';
import { addToMediaPlan, removeFromMediaPlan } from '@/utils/mediaPlanCalculations';
import { Check, Globe, ImageIcon, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { usePlannerStore } from '@/store/usePlannerStore';
import { AssetLibraryGrid } from '@/components/assets/AssetLibraryGrid';

// --- Types ---
type MediaAsset = Awaited<ReturnType<typeof listMediaAssets>>[number];
type PlannerStep = 'inventory' | 'review';

function StepProgress({ step, onBackToInventory }: { step: PlannerStep; onBackToInventory: () => void }) {
  return (
    <div className="flex items-center space-x-2 text-sm">
      <div
        className={`flex items-center ${step === 'inventory' ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium cursor-pointer'}`}
        onClick={() => step === 'review' ? onBackToInventory() : undefined}
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
}

// --- LibraryTabContent ---
function LibraryTabContent() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listMediaAssets()
      .then(setAssets)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    await deleteMediaAsset(id);
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleRename = async (id: string, newName: string) => {
    await renameMediaAsset(id, newName);
    setAssets(prev => prev.map(a => a.id === id ? { ...a, originalFilename: newName } : a));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const asset = await uploadCreativeAsset(file);
      const newAsset: MediaAsset = {
        id: asset.id,
        originalFilename: asset.name,
        publicUrl: asset.previewUrl ?? '',
        fileType: asset.type.startsWith('video') ? 'video' : 'image',
        mimeType: asset.type,
        fileSizeBytes: asset.fileSize,
        status: 'ready',
        approvalStatus: 'pending_review',
        createdAt: asset.uploadedAt,
        isApproved: false,
      };
      setAssets(prev => [newAsset, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">素材庫</h2>
            <p className="text-sm text-slate-500 mt-0.5">所有上傳過的廣告素材</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{assets.length} 個素材</span>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {uploading ? '上傳中…' : '新增素材'}
            </button>
          </div>
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
            <p className="text-xs text-slate-400 mb-4">在活動規劃中上傳素材後，會自動收錄在這裡。</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {uploading ? '上傳中…' : '新增素材'}
            </button>
          </div>
        )}

        {!loading && !error && assets.length > 0 && (
          <AssetLibraryGrid assets={assets} onDelete={handleDelete} onRename={handleRename} />
        )}
      </div>
    </div>
  );
}

// --- Main CampaignPlannerPage Wrapper ---
export function CampaignPlannerPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#F8FAFC]">Loading planner...</div>}>
      <CampaignPlannerPageContent />
    </Suspense>
  );
}

function CampaignPlannerPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryId = searchParams.get('id');
  // --- Supabase inventory ---
  const { allInventory, fetchInventory } = usePlannerStore();

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // --- Tab State ---
  const [activeTab, setActiveTab] = useState<'planner' | 'library'>('planner');

  // --- Step Flow State ---
  const [step, setStep] = useState<PlannerStep>('inventory');

  // --- Campaign Draft State ---
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [storedRequirements, setStoredRequirements] = useState<
    Array<{ id: string; canonicalFormat: string; status?: string }> | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [campaignStatus, setCampaignStatus] = useState<string>('draft');
  const [flightStart, setFlightStart] = useState<string | null>(null);
  const [flightEnd, setFlightEnd] = useState<string | null>(null);

  // --- Global State ---
  const [filters, setFilters] = useState<FilterState>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('impressions_desc');
  const queryView = searchParams.get('view');
  const [currentView, setCurrentView] = useState<ViewMode>(
    queryView === 'map' ? 'map' : queryView === 'ai' ? 'ai' : 'list'
  );

  const [selectedItems, setSelectedItems] = useState<MediaPlanItem[]>([]);
  const [selectedInventoryForDetail, setSelectedInventoryForDetail] = useState<InventoryLocation | null>(null);

  const dbItemIdMap = useRef<Map<string, string>>(new Map()); // inventoryId → campaign_inventory_items row id
  const isCreatingDraft = useRef(false);
  const pendingItemsRef = useRef<Array<{ item: InventoryLocation; options?: MediaPlanAddOptions }>>([]);

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
    if (filters.campaignObjectives?.length || filters.campaignObjective) count++;
    if (filters.cities?.length || filters.city) count++;
    if (filters.districts && filters.districts.length > 0) count++;
    if (filters.venueTypes && filters.venueTypes.length > 0) count++;
    if (filters.screenTypes && filters.screenTypes.length > 0) count++;
    if (filters.audienceTags && filters.audienceTags.length > 0) count++;
    if (filters.availabilityStatus && filters.availabilityStatus.length > 0) count++;
    if (filters.minBudget !== undefined || filters.maxBudget !== undefined) count++;
    if (filters.minImpressions !== undefined || filters.maxImpressions !== undefined) count++;
    return count;
  }, [filters]);

  const selectedObjective = filters.campaignObjectives?.[0] ?? filters.campaignObjective;

  // --- Handlers ---
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const getDefaultItemDays = () => {
    if (flightStart && flightEnd) return flightDays(flightStart, flightEnd);
    return 7;
  };

  const resolveAddOptions = (options?: MediaPlanAddOptions) => {
    const defaultDays = Math.max(1, options?.days ?? getDefaultItemDays());
    const defaultStart = options?.startDate ?? flightStart;
    const defaultEnd = options?.endDate ?? (
      defaultStart ? addDays(defaultStart, defaultDays - 1) : flightEnd
    );
    const boundedEnd = defaultEnd && flightEnd && defaultEnd > flightEnd ? flightEnd : defaultEnd;
    const boundedDays = defaultStart && boundedEnd ? flightDays(defaultStart, boundedEnd) : defaultDays;
    return { days: boundedDays, startDate: defaultStart, endDate: boundedEnd };
  };

  const handleAdd = async (item: InventoryLocation, options?: MediaPlanAddOptions) => {
    const resolved = resolveAddOptions(options);

    // Always add to local state immediately
    setSelectedItems(prev => addToMediaPlan(prev, item, resolved.days, resolved.startDate, resolved.endDate));

    let cId = campaignId;

    if (!cId) {
      if (isCreatingDraft.current) {
        // Draft creation in progress — queue for DB write after it finishes
        pendingItemsRef.current.push({ item, options });
        return;
      }

      isCreatingDraft.current = true;
      try {
        const draft = await createDraftCampaign({
          startDate: flightStart,
          endDate: flightEnd,
          campaignDays: flightStart && flightEnd ? flightDays(flightStart, flightEnd) : undefined,
        });
        cId = draft.id;
        setCampaignId(draft.id);
        // Update the URL to reflect the new draft
        router.replace(`/campaign-planner/new?id=${draft.id}`, { scroll: false });
      } catch (err) {
        console.error('Failed to create campaign draft:', err);
        isCreatingDraft.current = false;
        return;
      }
      isCreatingDraft.current = false;

      // Flush all pending items that arrived during draft creation
      for (const pending of pendingItemsRef.current) {
        const pendingResolved = resolveAddOptions(pending.options);
        const alreadyMapped = dbItemIdMap.current.has(pending.item.id);
        if (!alreadyMapped) {
          try {
            const dbRow = await addInventoryItem(
              cId,
              pending.item.id,
              pendingResolved.days,
              pending.item.pricePerDay,
              pending.item.dailyImpressions,
              pendingResolved.startDate,
              pendingResolved.endDate,
            );
            dbItemIdMap.current.set(pending.item.id, dbRow.id);
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
        const dbRow = await addInventoryItem(
          cId,
          item.id,
          resolved.days,
          item.pricePerDay,
          item.dailyImpressions,
          resolved.startDate,
          resolved.endDate,
        );
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
    const dbRowId = dbItemIdMap.current.get(inventoryId);
    if (dbRowId) {
      const currentItem = selectedItems.find(item => item.inventoryId === inventoryId);
      updateInventoryItemDays(dbRowId, days, {
        startDate: currentItem?.startDate ?? null,
        endDate: currentItem?.endDate ?? null,
      }).catch(err => console.error('Failed to update inventory item days:', err));
    }
  };

  const handleUpdateItemFlight = (inventoryId: string, start: string | null, end: string | null) => {
    const currentItem = selectedItems.find(item => item.inventoryId === inventoryId);
    const nextDays = start && end ? flightDays(start, end) : currentItem?.days ?? 1;
    setSelectedItems(prev =>
      prev.map(item => {
        if (item.inventoryId !== inventoryId) return item;
        const startDate = start ?? undefined;
        const endDate = end ?? undefined;
        return {
          ...item,
          startDate,
          endDate,
          days: nextDays,
        };
      })
    );
    const dbRowId = dbItemIdMap.current.get(inventoryId);
    if (dbRowId) {
      updateInventoryItemDays(dbRowId, nextDays, {
        startDate: start,
        endDate: end,
      }).catch(err => console.error('Failed to update inventory item days:', err));
    }
  };

  const handleFlightDateChange = async (start: string | null, end: string | null) => {
    setFlightStart(start);
    setFlightEnd(end);
    if (start && end) {
      const days = flightDays(start, end);
      const nextItems = selectedItems.map(item => ({
        ...item,
        startDate: start,
        endDate: end,
        days,
      }));
      setSelectedItems(nextItems);
      nextItems.forEach(item => {
        const dbRowId = dbItemIdMap.current.get(item.inventoryId);
        if (dbRowId) {
          updateInventoryItemDays(dbRowId, days, {
            startDate: item.startDate ?? null,
            endDate: item.endDate ?? null,
          }).catch(err => console.error('Failed to update inventory item days:', err));
        }
      });
    }
    if (campaignId) {
      try {
        await updateDraftCampaign(campaignId, {
          startDate: start ?? undefined,
          endDate: end ?? undefined,
          campaignDays: start && end ? flightDays(start, end) : undefined,
        });
      } catch (err) {
        console.error('Failed to save flight dates:', err);
      }
    }
  };

  const handleContinueToReview = async () => {
    if (selectedItems.length === 0) return;
    setIsSaving(true);
    try {
      if (campaignId) {
        // If requirements already exist (campaign was previously submitted),
        // skip submitCreativesForReview to avoid status-gate errors.
        if (storedRequirements && storedRequirements.length > 0) {
          setStep('review');
          return;
        }
        const reqs = await submitCreativesForReview(campaignId, selectedItems, allInventory);
        setStoredRequirements(reqs.map(r => ({
          id: r.id,
          canonicalFormat: r.canonicalFormat,
          status: r.status,
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

      // Rebuild dbItemIdMap
      dbItemIdMap.current = new Map(items.map(row => [row.inventoryLocationId, row.id]));

      // Restore campaign and requirements
      setCampaignId(resumeId);
      setStoredRequirements(reqs.length > 0 ? reqs.map(r => ({ id: r.id, canonicalFormat: r.canonicalFormat, status: r.status })) : null);

      // Restore flight dates and status
      const campaign = await getCampaign(resumeId);
      setFlightStart(campaign.startDate ?? null);
      setFlightEnd(campaign.endDate ?? null);
      setSelectedItems(
        restored.map(item => ({
          ...item,
          startDate: campaign.startDate ?? undefined,
          endDate: campaign.endDate ?? undefined,
        }))
      );
      setCampaignStatus(campaign.status);

      // Reset to inventory step
      setStep('inventory');
    } catch (err) {
      console.error('Failed to resume campaign:', err);
    }
  };

  // Mount logic: check query params
  useEffect(() => {
    if (queryId && queryId !== campaignId && !isCreatingDraft.current) {
      handleResumeCampaign(queryId);
    }
  }, [queryId, campaignId]);

  const { t, toggleLocale } = useI18n();

  return (
    <main className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans relative">

      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-30 shadow-sm gap-3">
        {/* Left: title + tabs */}
        <div className="flex items-center gap-6 min-w-0">
          <h1 className="text-base font-bold tracking-tight text-slate-800 whitespace-nowrap">Campaign Planner</h1>

          {/* Tab switcher — desktop */}
          <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {(['planner', 'library'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'planner' ? '規劃版位' : '素材庫'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile tab buttons */}
          <div className="flex md:hidden items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {(['planner', 'library'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-1.5 rounded-md text-[10px] font-semibold transition-colors ${
                  activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                {tab === 'planner' ? '規劃' : '素材'}
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
          <StepProgress step={step} onBackToInventory={() => setStep('inventory')} />
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex overflow-hidden relative${activeTab === 'planner' && step === 'inventory' ? ' pb-16 lg:pb-14' : ''}`}>

        {activeTab === 'planner' && (
          <>
            {step === 'inventory' && (
              <>
                {currentView !== 'ai' && (
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
                )}

                <InventoryDiscovery
                  inventory={filteredAndSortedInventory}
                  allInventory={allInventory}
                  sortOption={sortOption}
                  onSortChange={setSortOption}
                  currentView={currentView}
                  onViewChange={setCurrentView}
                  selectedItems={selectedItems}
                  onViewDetails={setSelectedInventoryForDetail}
                  onAdd={handleAdd}
                  objective={selectedObjective}
                  activeFilterCount={activeFilterCount}
                  onOpenFilters={currentView !== 'ai' && !isFilterOpen ? () => setIsFilterOpen(true) : undefined}
                  flightStart={flightStart}
                  flightEnd={flightEnd}
                  onFlightDateChange={handleFlightDateChange}
                />

                <MediaPlanSummary
                  selectedItems={selectedItems}
                  allInventory={allInventory}
                  onRemove={handleRemove}
                  onUpdateDays={handleUpdateDays}
                  onUpdateItemFlight={handleUpdateItemFlight}
                  onContinue={handleContinueToReview}
                  onAllUploaded={handleContinueToReview}
                  isSaving={isSaving}
                  isOpen={isSummaryOpen}
                  onClose={() => setIsSummaryOpen(false)}
                  campaignId={campaignId}
                  storedRequirements={storedRequirements}
                  onStoredRequirementsChange={setStoredRequirements}
                  onCreativeUploaded={() => {}}
                  flightStart={flightStart}
                  flightEnd={flightEnd}
                  onFlightDateChange={handleFlightDateChange}
                  campaignStatus={campaignStatus}
                />

                {/* Detail Modal Overlay */}
                {selectedInventoryForDetail && (
                  <InventoryDetailCard
                    item={selectedInventoryForDetail}
                    isSelected={selectedItems.some(i => i.inventoryId === selectedInventoryForDetail.id)}
                    onClose={() => setSelectedInventoryForDetail(null)}
                    onAdd={() => handleAdd(selectedInventoryForDetail)}
                    objective={selectedObjective}
                  />
                )}

                <PerformanceBar
                  selectedItems={selectedItems}
                  allInventory={allInventory}
                  objective={selectedObjective}
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
                flightStart={flightStart}
                flightEnd={flightEnd}
                onFlightDateChange={handleFlightDateChange}
              />
            )}
          </>
        )}

        {activeTab === 'library' && (
          <LibraryTabContent />
        )}


      </div>
    </main>
  );
}
