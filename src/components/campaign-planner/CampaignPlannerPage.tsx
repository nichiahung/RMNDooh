'use client';

import React, { useState, useMemo } from 'react';
import { FilterSidebar } from './FilterSidebar';
import { InventoryDiscovery } from './InventoryDiscovery';
import { MediaPlanSummary } from './MediaPlanSummary';
import { InventoryDetailCard } from './InventoryDetailCard';
import { CreativeUploadStep } from './CreativeUploadStep';
import { CampaignReviewStep } from './CampaignReviewStep';

import { mockInventory } from '@/lib/mockData';
import { InventoryLocation, MediaPlanItem, FilterState, CreativeAsset } from '@/types/inventory';
import { searchInventory, sortInventory, filterInventory } from '@/utils/inventoryFilters';
import { addToMediaPlan, removeFromMediaPlan } from '@/utils/mediaPlanCalculations';
import { Check, Globe } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export function CampaignPlannerPage() {
  // --- Step Flow State ---
  const [step, setStep] = useState<'inventory' | 'creative' | 'review'>('inventory');

  // --- Global State ---
  const [filters, setFilters] = useState<FilterState>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('impressions_desc');
  const [currentView, setCurrentView] = useState<'list' | 'map'>('list');
  
  const [selectedItems, setSelectedItems] = useState<MediaPlanItem[]>([]);
  const [selectedInventoryForDetail, setSelectedInventoryForDetail] = useState<InventoryLocation | null>(null);
  const [creatives, setCreatives] = useState<CreativeAsset[]>([]);

  // --- Derived Data ---
  const filteredAndSortedInventory = useMemo(() => {
    let result = filterInventory(mockInventory, filters);
    result = searchInventory(result, searchQuery);
    result = sortInventory(result, sortOption);
    return result;
  }, [filters, searchQuery, sortOption]);

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

  const handleAdd = (item: InventoryLocation) => {
    setSelectedItems(prev => addToMediaPlan(prev, item, 7)); // Default 7 days
  };

  const handleRemove = (inventoryId: string) => {
    setSelectedItems(prev => removeFromMediaPlan(prev, inventoryId));
  };

  const handleUpdateDays = (inventoryId: string, days: number) => {
    setSelectedItems(prev => 
      prev.map(item => item.inventoryId === inventoryId ? { ...item, days } : item)
    );
  };

  const handleContinueToCreative = () => {
    if (selectedItems.length > 0) setStep('creative');
  };

  const handleContinueToReview = () => {
    if (selectedItems.length > 0 && creatives.length > 0) setStep('review');
  };

  const { t, toggleLocale } = useI18n();

  // Render Step Progress
  const StepProgress = () => (
    <div className="flex items-center space-x-2 mr-6 text-sm">
      <div className={`flex items-center ${step === 'inventory' ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium cursor-pointer'}`} onClick={() => setStep('inventory')}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mr-1.5 ${step === 'inventory' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
          {step === 'inventory' ? '1' : <Check className="w-3 h-3" />}
        </div>
        {t('step.inventory')}
      </div>
      <div className="w-6 h-px bg-slate-300"></div>
      <div className={`flex items-center ${step === 'creative' ? 'text-indigo-600 font-bold' : step === 'review' ? 'text-slate-500 font-medium cursor-pointer' : 'text-slate-400 font-medium'}`} onClick={() => step === 'review' ? setStep('creative') : null}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mr-1.5 ${step === 'creative' ? 'bg-indigo-600 text-white' : step === 'review' ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
          {step === 'review' ? <Check className="w-3 h-3" /> : '2'}
        </div>
        {t('step.creative')}
      </div>
      <div className="w-6 h-px bg-slate-300"></div>
      <div className={`flex items-center ${step === 'review' ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'}`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mr-1.5 ${step === 'review' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
          3
        </div>
        {t('step.review')}
      </div>
    </div>
  );

  return (
    <main className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans relative">
      
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-30 shadow-sm">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-800">{t('planner.title')}</h1>
          <div className="h-6 w-px bg-slate-300"></div>
          <StepProgress />
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={toggleLocale}
            className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Globe className="w-4 h-4 mr-1.5" />
            {t('common.langToggle')}
          </button>
          <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            {t('planner.saveDraft')}
          </button>
          <button className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors shadow-sm">
            {t('planner.exit')}
          </button>
        </div>
      </header>

      {/* Main Content Area based on Step */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {step === 'inventory' && (
          <>
            <FilterSidebar 
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              activeFilterCount={activeFilterCount}
            />
            
            <InventoryDiscovery 
              inventory={filteredAndSortedInventory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortOption={sortOption}
              onSortChange={setSortOption}
              currentView={currentView}
              onViewChange={setCurrentView}
              selectedItems={selectedItems}
              onViewDetails={setSelectedInventoryForDetail}
              onAdd={handleAdd}
            />
            
            <MediaPlanSummary 
              selectedItems={selectedItems}
              allInventory={mockInventory}
              onRemove={handleRemove}
              onUpdateDays={handleUpdateDays}
              onContinue={handleContinueToCreative}
            />

            {/* Detail Modal Overlay */}
            {selectedInventoryForDetail && (
              <InventoryDetailCard 
                item={selectedInventoryForDetail}
                isSelected={selectedItems.some(i => i.inventoryId === selectedInventoryForDetail.id)}
                onClose={() => setSelectedInventoryForDetail(null)}
                onAdd={() => handleAdd(selectedInventoryForDetail)}
              />
            )}
          </>
        )}

        {step === 'creative' && (
          <CreativeUploadStep 
            selectedItems={selectedItems}
            allInventory={mockInventory}
            creatives={creatives}
            setCreatives={setCreatives}
            onBack={() => setStep('inventory')}
            onContinue={handleContinueToReview}
          />
        )}

        {step === 'review' && (
          <CampaignReviewStep 
            selectedItems={selectedItems}
            allInventory={mockInventory}
            creatives={creatives}
            onBack={() => setStep('creative')}
          />
        )}

      </div>
    </main>
  );
}
