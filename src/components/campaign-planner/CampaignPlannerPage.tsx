'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FilterSidebar } from './FilterSidebar';
import { MobileFilterSheet } from './MobileFilterSheet';
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
import { searchInventory, sortInventory, filterInventory } from '@/utils/inventoryFilters';
import { addDays, flightDays } from '@/utils/dates';
import { addToMediaPlan, removeFromMediaPlan } from '@/utils/mediaPlanCalculations';
import { Check } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { usePlannerStore } from '@/store/usePlannerStore';

// --- Types ---
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

  const { t } = useI18n();

  return (
    <main className="h-full flex flex-col bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans relative">

      <h1 className="sr-only">{t('planner.title')}</h1>

      <div className="h-10 bg-white border-b border-slate-100 flex items-center px-6 flex-shrink-0">
        <StepProgress step={step} onBackToInventory={() => setStep('inventory')} />
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex overflow-hidden relative${step === 'inventory' ? ' pb-16 md:pb-0' : ''}`}>
            {step === 'inventory' && (
              <>
                {currentView !== 'ai' && (
                  <div className="hidden md:block">
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
                  </div>
                )}

                {currentView !== 'ai' && (
                  <div className="md:hidden">
                    <MobileFilterSheet
                      isOpen={isFilterOpen}
                      onClose={() => setIsFilterOpen(false)}
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onClearFilters={handleClearFilters}
                      activeFilterCount={activeFilterCount}
                      resultCount={filteredAndSortedInventory.length}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                    />
                  </div>
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
                  onRemove={handleRemove}
                  objective={selectedObjective}
                  activeFilterCount={activeFilterCount}
                  onOpenFilters={currentView !== 'ai' && !isFilterOpen ? () => setIsFilterOpen(true) : undefined}
                  showTopbar
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
      </div>
    </main>
  );
}
