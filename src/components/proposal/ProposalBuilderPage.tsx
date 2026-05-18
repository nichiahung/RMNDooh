'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, CheckCircle, ChevronRight, MapPin, Trash2, Loader2, Plus, Minus, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import { FilterSidebar } from '@/components/campaign-planner/FilterSidebar';
import { InventoryDiscovery } from '@/components/campaign-planner/InventoryDiscovery';
import type { ViewMode } from '@/components/campaign-planner/ViewToggle';
import { InventoryLocation, FilterState, MediaPlanItem } from '@/types/inventory';
import { filterInventory, searchInventory, sortInventory } from '@/utils/inventoryFilters';
import { usePlannerStore } from '@/store/usePlannerStore';
import {
  createProposalApi,
  createProposalVersionApi,
  listPriceBooksApi,
  sendProposalToAdvertiserApi,
} from '@/lib/api/tradingIterationApi';
import type { PriceBook, Proposal, ProposalInventoryItem } from '@/types/trading-models';
import { ClientSelect } from '@/components/clients/ClientSelect';

type Step = 'setup' | 'inventory' | 'sent';

const EMPTY_FILTERS: FilterState = {
  searchQuery: '',
  districts: [],
  venueTypes: [],
  screenTypes: [],
  audienceTags: [],
};

export function ProposalBuilderPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>}>
      <ProposalBuilderPageContent />
    </Suspense>
  );
}

function ProposalBuilderPageContent() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  const handleLogout = () => { logout(); router.push('/login'); };

  // Step state
  const [step, setStep] = useState<Step>('setup');

  // Setup form
  const [proposalName, setProposalName] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-06-30');
  const [selectedPriceBook, setSelectedPriceBook] = useState('');
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);

  // Proposal state
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Inventory selection
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [discount, setDiscount] = useState(0);

  // Inventory + filters
  const allInventory = usePlannerStore(s => s.allInventory);
  const isLoadingInventory = usePlannerStore(s => s.isLoadingInventory);
  const fetchInventory = usePlannerStore(s => s.fetchInventory);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('impressions_desc');
  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    if (allInventory.length === 0) fetchInventory();
    listPriceBooksApi().then(setPriceBooks);
  }, []);

  const filteredInventory = useMemo(() => {
    let items = filterInventory(allInventory, filters);
    items = searchInventory(items, searchQuery);
    return sortInventory(items, sortOption);
  }, [allInventory, filters, searchQuery, sortOption]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.cities?.length || filters.city) count++;
    if (filters.campaignObjectives?.length || filters.campaignObjective) count++;
    if (filters.districts?.length) count++;
    if (filters.venueTypes?.length) count++;
    if (filters.screenTypes?.length) count++;
    if (filters.audienceTags?.length) count++;
    return count;
  }, [filters]);

  const selectedVenues = useMemo(
    () => allInventory.filter(v => selectedVenueIds.includes(v.id)),
    [allInventory, selectedVenueIds],
  );

  const flightDays = useMemo(() => {
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
  }, [startDate, endDate]);

  const isDateValid = !Number.isNaN(new Date(startDate).getTime()) && !Number.isNaN(new Date(endDate).getTime());

  const selectedItems: MediaPlanItem[] = useMemo(
    () => selectedVenueIds.map(id => ({ inventoryId: id, days: flightDays })),
    [selectedVenueIds, flightDays],
  );

  const totalListPrice = useMemo(
    () => selectedVenues.reduce((acc, v) => acc + v.pricePerDay * flightDays, 0),
    [selectedVenues, flightDays],
  );
  const finalQuote = Math.max(0, totalListPrice * (1 - discount / 100));

  const canProceed = proposalName.trim() !== '' && selectedClientId !== '' && isDateValid;

  const handleAdd = (item: InventoryLocation) => {
    setSelectedVenueIds(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
  };
  const handleRemove = (id: string) => {
    setSelectedVenueIds(prev => prev.filter(v => v !== id));
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };
  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchQuery('');
  };

  const handleSend = async () => {
    if (selectedVenueIds.length === 0) return;
    setIsSending(true);
    try {
      // TODO: replace hardcoded advertiserId with selectedClientId once proposals migrate to Supabase
      const created = proposal ?? await createProposalApi({
        advertiserId: 'adv-01',
        ownerUserId: 'user-sales-01',
        name: proposalName,
        buyingMethod: 'sales_assisted',
        requestedStartDate: startDate,
        requestedEndDate: endDate,
      });

      if (!proposal) {
        setProposal(created);
        router.replace(`/proposal-builder?proposalId=${created.id}`, { scroll: false });
      }

      const inventoryItems: ProposalInventoryItem[] = selectedVenues.map(v => ({
        id: `pii-${v.id}`,
        proposalId: created.id,
        inventoryLocationId: v.id,
        screenId: null,
        requestedStartDate: startDate,
        requestedEndDate: endDate,
        lineItemStartDate: startDate,
        lineItemEndDate: endDate,
        activeDays: flightDays,
        dateMatchStatus: 'full_match',
        availabilityStatus: 'reserved',
        priceForActiveDays: v.pricePerDay * flightDays,
        estimatedImpressionsForActiveDays: v.dailyImpressions * flightDays,
        creativeDueAt: null,
        earliestPlaybackAt: startDate,
      }));

      await createProposalVersionApi({
        proposalId: created.id,
        selectedInventory: inventoryItems,
        requestedPriceBookId: selectedPriceBook || undefined,
        discountPercent: discount,
        manualAdjustment: 0,
      });

      await sendProposalToAdvertiserApi(created.id);
      setStep('sent');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="max-w-full px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-slate-800">建立提案</h1>
            {step !== 'setup' && (
              <span className="text-xs text-slate-400 hidden sm:inline">
                {proposalName} · {clientName} · {flightDays} 天
              </span>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 text-xs font-medium">
            <span className={`px-3 py-1 rounded-full ${step === 'setup' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>1. 提案設定</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className={`px-3 py-1 rounded-full ${step === 'inventory' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>2. 選版位</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className={`px-3 py-1 rounded-full ${step === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'}`}>3. 送出確認</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">{currentUser?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" /> 登出
            </button>
          </div>
        </div>
      </header>

      {/* Setup step */}
      {step === 'setup' && (
        <div className="flex-1 flex items-start justify-center px-6 py-10">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-800">提案基本資料</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">提案名稱</label>
                <input
                  value={proposalName}
                  onChange={e => setProposalName(e.target.value)}
                  placeholder="例：夏季品牌曝光提案"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">客戶名稱</label>
                <ClientSelect
                  value={selectedClientId}
                  onChange={(id, name) => { setSelectedClientId(id); setClientName(name); }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">開始日期</label>
                  <input
                    type="date" value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">結束日期</label>
                  <input
                    type="date" value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {isDateValid && (
                <p className="text-xs text-slate-500">走期：{flightDays} 天（{startDate} ～ {endDate}）</p>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">底價方案</label>
                <select
                  value={selectedPriceBook}
                  onChange={e => setSelectedPriceBook(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">自動選擇</option>
                  {priceBooks.filter(pb => pb.visibility !== 'internal_only').map(pb => (
                    <option key={pb.id} value={pb.id}>{pb.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setStep('inventory')}
              disabled={!canProceed}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              下一步：選擇版位 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Inventory step — full height 3-column layout */}
      {step === 'inventory' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Filter sidebar */}
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

          {/* Center: Inventory discovery */}
          {isLoadingInventory ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : (
            <InventoryDiscovery
              inventory={filteredInventory}
              allInventory={allInventory}
              sortOption={sortOption}
              onSortChange={setSortOption}
              currentView={currentView}
              onViewChange={setCurrentView}
              selectedItems={selectedItems}
              onViewDetails={() => {}}
              onAdd={handleAdd}
              onRemove={handleRemove}
              activeFilterCount={activeFilterCount}
              onOpenFilters={currentView !== 'ai' && !isFilterOpen ? () => setIsFilterOpen(true) : undefined}
              flightStart={startDate}
              flightEnd={endDate}
              onFlightDateChange={(start, end) => {
                if (start) setStartDate(start);
                if (end) setEndDate(end);
              }}
            />
          )}

          {/* Right: Proposal summary panel */}
          <ProposalSummaryPanel
            proposalName={proposalName}
            clientName={clientName}
            startDate={startDate}
            endDate={endDate}
            flightDays={flightDays}
            selectedVenues={selectedVenues}
            discount={discount}
            onDiscountChange={setDiscount}
            totalListPrice={totalListPrice}
            finalQuote={finalQuote}
            onRemove={handleRemove}
            onSend={handleSend}
            isSending={isSending}
            onBack={() => setStep('setup')}
          />
        </div>
      )}

      {/* Sent step */}
      {step === 'sent' && (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">提案已送出！</h2>
            <p className="text-slate-500">
              提案《{proposalName}》已送給 <span className="font-semibold text-slate-700">{clientName}</span> 審核。
              {proposal && (
                <span className="block text-xs text-slate-400 mt-1 font-mono">{proposal.id}</span>
              )}
            </p>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm text-slate-700 space-y-1 text-left">
              <div className="flex justify-between"><span className="text-slate-500">版位數量</span><span className="font-semibold">{selectedVenues.length} 個</span></div>
              <div className="flex justify-between"><span className="text-slate-500">走期</span><span className="font-semibold">{flightDays} 天</span></div>
              <div className="flex justify-between"><span className="text-slate-500">折扣</span><span className="font-semibold">{discount}%</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="text-slate-700 font-semibold">最終報價</span><span className="font-bold text-indigo-700">NT${finalQuote.toLocaleString()}</span></div>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => router.push('/')} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                回首頁
              </button>
              <button
                onClick={() => {
                  setStep('setup');
                  setProposal(null);
                  setProposalName('');
                  setClientName('');
                  setSelectedClientId('');
                  setSelectedVenueIds([]);
                  setDiscount(0);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                建立另一份提案
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SummaryPanelProps {
  proposalName: string;
  clientName: string;
  startDate: string;
  endDate: string;
  flightDays: number;
  selectedVenues: InventoryLocation[];
  discount: number;
  onDiscountChange: (v: number) => void;
  totalListPrice: number;
  finalQuote: number;
  onRemove: (id: string) => void;
  onSend: () => void;
  isSending: boolean;
  onBack: () => void;
}

function ProposalSummaryPanel({
  proposalName,
  clientName,
  startDate,
  endDate,
  flightDays,
  selectedVenues,
  discount,
  onDiscountChange,
  totalListPrice,
  finalQuote,
  onRemove,
  onSend,
  isSending,
  onBack,
}: SummaryPanelProps) {
  return (
    <aside className="w-80 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
      {/* Proposal info */}
      <div className="px-4 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">本次提案</p>
        <p className="text-sm font-bold text-slate-800 truncate">{proposalName || '—'}</p>
        <p className="text-xs text-slate-500 mt-0.5">{clientName || '—'}</p>
        <p className="text-xs text-slate-400 mt-1">{startDate} ～ {endDate}（{flightDays} 天）</p>
      </div>

      {/* Selected venues list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          提案版位 {selectedVenues.length > 0 && `(${selectedVenues.length})`}
        </p>

        {selectedVenues.length === 0 ? (
          <div className="py-8 text-center">
            <MapPin className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400">從左側地圖或列表選取版位</p>
          </div>
        ) : (
          selectedVenues.map(v => {
            const lineTotal = v.pricePerDay * flightDays;
            return (
              <div key={v.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 leading-snug">{v.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{v.district} · {v.screenType}</p>
                  </div>
                  <button
                    onClick={() => onRemove(v.id)}
                    className="text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  <span className="text-slate-600 font-medium">NT${v.pricePerDay.toLocaleString()}</span>
                  <span className="text-slate-400"> /天 × {flightDays} 天 = </span>
                  <span className="text-indigo-600 font-semibold">NT${lineTotal.toLocaleString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pricing footer */}
      <div className="border-t border-slate-200 px-4 py-4 space-y-3 flex-shrink-0">
        {/* Discount input */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-600">折扣 (%)</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onDiscountChange(Math.max(0, discount - 5))}
              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <Minus className="w-3 h-3 text-slate-600" />
            </button>
            <input
              type="number" min="0" max="100" value={discount}
              onChange={e => onDiscountChange(Math.max(0, Math.min(100, Number(e.target.value))))}
              className="w-12 text-center text-sm font-semibold border border-slate-300 rounded-md py-0.5 outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              onClick={() => onDiscountChange(Math.min(100, discount + 5))}
              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <Plus className="w-3 h-3 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Price summary */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-slate-500 text-xs">
            <span>原價小計</span>
            <span>NT${totalListPrice.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-rose-500 text-xs">
              <span>折扣 -{discount}%</span>
              <span>-NT${(totalListPrice - finalQuote).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
            <span>最終報價</span>
            <span className="text-indigo-700">NT${finalQuote.toLocaleString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onSend}
            disabled={isSending || selectedVenues.length === 0}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            送出提案給客戶
          </button>
          <button
            onClick={onBack}
            className="w-full py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            ← 回提案設定
          </button>
        </div>
      </div>
    </aside>
  );
}
